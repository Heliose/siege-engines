// Polybolos: the repeating bolt-thrower of Dionysius of Alexandria, as described by Philo of Byzantium
// (Belopoeica 73–77). A small euthytone torsion head; a slider in the case; an endless flat-link chain
// on each side of the case over two pentagonal sprockets, the rear pair on a windlass with a crank on
// each side. One link of each chain carries a lug that rides in a slotted yoke hung from the slider, so
// turning the windlass one way carries the slider forward (top run), round the front pentagon (the claw
// is struck shut over the string), back along the bottom run (the string is drawn), round the rear
// pentagon (a peg trips the latch and the bolt is loosed) and forward again. A pin on the slider runs in
// a helical groove on a drum under the hopper and turns it half a turn each stroke: the drum takes a bolt
// from the hopper at the front of the stroke and drops it into the trough at the back.
//
// Truth (SI). Bolt 0.50 m, 0.12–0.21 kg. Skein 64 mm (≈ bolt/9 + a little), 0.39 m tall; arm 0.40 m to
// the string; arms swing 2° → 46° for a 0.64 m draw. Skein torque τ = k θ (1 + 0.6 θ²), k = 150 N·m/rad
// per skein, θ = pre-twist + arm swing; 12 % hysteresis in the sinew. Release: one-coordinate Lagrangian
// in the string centre q with m_eff(q) = m_bolt + m_string/3 + (2 I_arm + m_s L²/3) φ'(q)², I_arm 0.075 kg·m².
// Default: 30° pre-twist, ~330 J stored, standard bolt 0.12 kg at 65 m/s, 77 % efficiency, 26 ms stroke;
// 163 m at 15°, 243 m at 35° (pre-twist 15° → 50 m/s, 45° → 81 m/s and 315 m). Fire bolt 0.16 kg 57 m/s,
// barbed bolt 0.21 kg 51 m/s. Chain pitch 0.10 m, 15 links, sprockets 5 sides: 3 windlass turns per shot.
// Crank torque = draw force × slider travel per radian (≈ 100 N·m at full draw for 30° pre-twist); the
// crew slows as the torque rises (two men ≈ 260 N·m stall), so a shot takes ~4.8 s at 40 rpm.
//
// Drawing: parts that only translate (slider assemblies, span links, bolts) are drawn once and moved with
// an SVG transform; parts that turn (pentagons, cranks, ratchet, drum, arms, skeins) are cached per
// quantized angle. Long timbers are cut into staggered pieces so the painter orders them locally; the
// stand, rack, prop and the hidden far-side drive are painted on the floor layer.
//
// Parts (≈ 150 for the machine): plinth, base cross (3 sills), column with 2 bands, cap, 4 struts, fork
// cheeks ×2 with pin heads, cradle, elevation prop (2 bars, base block, bracket, pins); case, 2 guide
// strips, front cap, top & bottom hole-carriers, 4 stanchions, 2 cushions, 4 counter-plates, 4 bronze
// washers, 4 washer keys, 4 skein halves, 2 arms (root, 2 shafts, bands, tip caps), bowstring; slider
// with claw (finger, body), claw cheeks, pin heads, latch, dog, trip peg, reset block; 2 slotted yokes
// (2 bars, tie, bridge each), 2 lugs (shaft, roller, head); 4 pentagons + 4 hubs, 30 chain links, front
// axle stubs, windlass axle, 2 crank bosses, webs and grips, ratchet, pawl, pawl pin; drum (2 sections,
// 2 bosses), housing (top, 3 bottom strips, 2 sides, 2 end plates), cleats, hopper (front, rear, far wall,
// near wall as stiles and rails), hopper brackets, rear gallows (2 posts, crossbar, spine), cam pin;
// bolts in hopper, drum and trough; rack (2 blocks, 6 bolts), brazier.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { add, sub, mul, dot, cross, unit, len, lerp, clamp, rad, deg, ease, smoothstep, fmt, fmtInt, TAU, rng } from "../engine/vec.js";
import * as PH from "../engine/physics.js";
import * as looks from "../engine/looks.js";
import { frameFrom, polyRect, polyRound, polyCircle, polySaw, createBuilder } from "../engine/geo.js";
import { shapeOf } from "../engine/scene.js";

// ---------- sprites: parts drawn once at a reference pose, then moved by a transform ----------
// A part that only translates keeps its SVG (no re-parse); its painter shape moves with it.
function collect(B, fn) {
  const list = [];
  const sc = { P: B.P, V: B.V, KS: B.KS, add: (p) => list.push(p), put: (p) => list.push(p) };
  const CB = createBuilder(sc, { unit: B.unit });
  CB.dynamic = true;
  fn(CB);
  return list;
}
function sprite(B, M, key, deps, d, fn) {
  const store = B.__polySprites || (B.__polySprites = new Map());
  const sig = JSON.stringify(deps);
  let c = store.get(key);
  if (!c || c.sig !== sig) {
    c = { sig, parts: collect(B, fn), d: null };
    store.set(key, c);
  }
  if (!c.d || c.d[0] !== d[0] || c.d[1] !== d[1] || c.d[2] !== d[2]) {
    c.d = d;
    c.shapes = c.parts.map((p) => shapeOf(p.shape.pts.map((q) => [q[0] + d[0], q[1] + d[1], q[2] + d[2]]), { r: p.shape.r, axes: p.shape.axes, edges: p.shape.edges }));
    const o = B.at([0, 0, 0]), m = B.at(d);
    c.tf = `translate(${(m[0] - o[0]).toFixed(2)} ${(m[1] - o[1]).toFixed(2)})`;
  }
  const parts = M.scene && M.scene.parts;
  c.parts.forEach((p, i) => {
    B.raw(p.id, p.svg, c.shapes[i], p);
    const e = parts && parts.get(p.id);
    if (e && e.el && e.el.getAttribute("transform") !== c.tf) e.el.setAttribute("transform", c.tf);
  });
}
// A part that was a sprite and is now drawn in place loses its transform.
function plain(M, id) {
  const e = M.scene && M.scene.parts && M.scene.parts.get(id);
  if (e && e.el && e.el.hasAttribute("transform")) e.el.removeAttribute("transform");
}
// Several collected parts painted as one: in draw order, or back to front by depth.
function svgOf(parts, V, sort) {
  const list = sort ? [...parts].sort((a, b) => dot(a.shape.c, V) + (a.bias || 0) - (dot(b.shape.c, V) + (b.bias || 0))) : parts;
  return list.map((p) => `<g${p.mat ? ` data-mat="${p.mat}"` : ""}>${p.svg}</g>`).join("");
}
function ptsOf(parts) {
  const out = [];
  for (const p of parts) {
    const r = p.shape.r || 0;
    for (const q of p.shape.pts) {
      if (r) out.push([q[0] - r, q[1] - r, q[2] - r], [q[0] + r, q[1] + r, q[2] + r]);
      else out.push(q);
    }
  }
  return out;
}
// A rigid assembly drawn once and moved as one part (id = key).
function msprite(B, M, key, deps, d, fn, o = {}) {
  const store = B.__polySprites || (B.__polySprites = new Map());
  const sig = JSON.stringify(deps);
  let c = store.get(key);
  if (!c || c.sig !== sig) {
    const parts = collect(B, fn);
    // o.box: the painter's proxy as a local box [x0, x1, y0, y1, z0, z1] (e.g. a bolt's shaft without its vanes).
    const pts = o.box ? [0, 1].flatMap((i) => [2, 3].flatMap((j) => [4, 5].map((m) => L(o.box[i], o.box[j], o.box[m])))) : ptsOf(parts);
    c = { sig, svg: svgOf(parts, B.V, o.sort), pts, d: null };
    store.set(key, c);
  }
  if (!c.d || c.d[0] !== d[0] || c.d[1] !== d[1] || c.d[2] !== d[2]) {
    c.d = d;
    c.shape = shapeOf(c.pts.map((q) => [q[0] + d[0], q[1] + d[1], q[2] + d[2]]), { axes: o.axes, edges: o.axes });
    const a = B.at([0, 0, 0]), m = B.at(d);
    c.tf = `translate(${(m[0] - a[0]).toFixed(2)} ${(m[1] - a[1]).toFixed(2)})`;
  }
  B.raw(key, c.svg, c.shape, o);
  const e = M.scene && M.scene.parts && M.scene.parts.get(key);
  if (e && e.el && e.el.getAttribute("transform") !== c.tf) e.el.setAttribute("transform", c.tf);
}
// Parts that repeat with an angle (a pentagon every 72°, a crank every turn): generated once per
// quantized angle and re-emitted, so a turning part costs only its SVG swap.
function pcache(B, key, q, fn, id) {
  const store = B.__polyPhase || (B.__polyPhase = new Map());
  let m = store.get(key);
  if (!m) {
    if (store.size > 60) store.clear();
    store.set(key, (m = new Map()));
  }
  let parts = m.get(q);
  if (!parts) {
    parts = collect(B, fn);
    m.set(q, parts);
  }
  for (const p of parts) B.raw(id || p.id, p.svg, p.shape, p);
}
// The same builder, drawing on another painter layer (the stand and the floor clutter sit below the stock
// wherever they overlap it, so they are painted first, apart from the stock's own ordering).
const OPT_AT = { beam: 3, cyl: 4, prism: 5, slab: 4, turned: 3, ball: 3, ring: 4, toothed: 5, raw: 3, solid: 3 };
function onLayer(B, layer) {
  const out = Object.create(B);
  for (const [name, i] of Object.entries(OPT_AT))
    out[name] = (...a) => {
      a[i] = { ...(a[i] || {}), layer };
      return B[name](...a);
    };
  return out;
}
// An assembly redrawn in place as one part.
function composite(B, key, fn, o = {}) {
  const parts = collect(B, fn);
  B.raw(key, svgOf(parts, B.V, o.sort), o.shape || shapeOf(ptsOf(parts), { axes: o.axes, edges: o.axes }), o);
}

const U = 0.008;
const S = 1 / U;
const ZP = 0.82; // elevation pivot above the plinth

// ---------- the stock frame: local metres → world, tilted by the elevation ----------
let EL = 0, CE = 1, SE = 0;
const setEl = (e) => {
  EL = e;
  CE = Math.cos(e);
  SE = Math.sin(e);
};
const L = (x, y, z) => [x * S, (y * CE + z * SE) * S, (ZP - y * SE + z * CE) * S];
const Lm = (x, y, z) => [x, y * CE + z * SE, ZP - y * SE + z * CE];
const Ld = (x, y, z) => [x, y * CE + z * SE, -y * SE + z * CE];
const W = (x, y, z) => [x * S, y * S, z * S];
const FY = (x, y, z) => ({ o: L(x, y, z), a: Ld(0, 1, 0), u: [1, 0, 0], v: Ld(0, 0, 1) }); // along y, poly (x, z)
const FX = (x, y, z) => ({ o: L(x, y, z), a: [1, 0, 0], u: Ld(0, 1, 0), v: Ld(0, 0, 1) }); // along x, poly (y, z)
const FZ = (x, y, z) => ({ o: L(x, y, z), a: Ld(0, 0, 1), u: [1, 0, 0], v: Ld(0, 1, 0) }); // along z, poly (x, y)
const rectPoly = (a0, a1, b0, b1) => [[a0 * S, b0 * S], [a1 * S, b0 * S], [a1 * S, b1 * S], [a0 * S, b1 * S]];
const roundPoly = (a0, a1, b0, b1, r) => polyRound((a1 - a0) * S, (b1 - b0) * S, r * S, 2).map(([u, v]) => [u + ((a0 + a1) / 2) * S, v + ((b0 + b1) / 2) * S]);
// A box in the stock frame, x0..x1, y0..y1, z0..z1 (metres).
const box = (B, id, x0, x1, y0, y1, z0, z1, o = {}) => B.prism(id, FY(0, y0, 0), o.r ? roundPoly(x0, x1, z0, z1, o.r) : rectPoly(x0, x1, z0, z1), 0, (y1 - y0) * S, o);
// Long timbers are cut into compact pieces so the painter can order them against their neighbours.
const CUTS = [-0.47, -0.24, -0.02, 0.2, 0.45];
const segs = (y0, y1, cuts = CUTS) => {
  const c = [y0, ...cuts.filter((y) => y > y0 + 0.03 && y < y1 - 0.03), y1];
  return c.slice(1).map((b, i) => [c[i], b]);
};
const boxSegs = (B, id, x0, x1, y0, y1, z0, z1, o = {}, cuts = CUTS, mark = null) =>
  segs(y0, y1, cuts).forEach(([a, b], i) => box(B, `${id}.${i}`, x0, x1, a, b, z0, z1, mark ? { ...o, over: mark(a, b) } : o));
const rod = (B, id, a, b, r, o = {}) => B.cyl(id, L(...a), L(...b), r * S, o);
const bar = (B, id, a, b, w, h, up, o = {}) => B.beam(id, L(...a), L(...b), { w: w * S, h: h * S, up: Ld(...up), ...o });

// ---------- truth ----------
const XK = 0.215; // skein axis, either side
const YK = -0.16; // skein axis along the case
const LA = 0.4; // arm, skein axis to string
const PHI0 = rad(2); // arm at rest, against the cushion
const LSTR = XK + LA * Math.cos(PHI0); // half string, straight at rest
const YS0 = YK + LA * Math.sin(PHI0); // string at rest
const ZST = 0.235; // slider top = string plane
const KSK = 150; // N·m/rad per skein
const HARD = 0.6;
const HYST = 0.12;
const IA = 0.075; // arm inertia about the skein axis
const MS = 0.05; // bowstring mass
const TAU_CREW = 260; // two men at the cranks, stall torque
const CRANK_R = 0.3;
const BOLT_L = 0.5;

// Chain and sprockets.
const PL = 0.1; // link pitch
const NL = 15; // links in each loop
const D72 = TAU / 5;
const RS = PL / (2 * Math.sin(Math.PI / 5)); // pin circle of a pentagon
const RP = 0.072; // pentagon plate corner radius
const YFS = 0.049; // front sprocket axis
const YRS = YFS + 5 * PL; // rear sprocket (windlass) axis
const ZA = 0.115; // sprocket axes
const D_LUG = 0.14; // slider claw ahead of the lug
const YC0 = YFS - RS - D_LUG; // claw, front of stroke
const YC1 = YRS + RS - D_LUG; // claw, back of stroke
const THETA = NL * D72; // windlass angle per shot (3 turns)
const XCH = 0.139; // chain plane (inner face of the links)

// Drum, hopper and housing.
const ZD = 0.36; // drum axis
const RD = 0.05;
const YD0 = -0.235, YD1 = 0.462;
const YB0 = -0.052; // bolt groove starts
const NOCK = 0.454; // nock of a bolt in hopper or drum
const PIN_OFF = -0.045; // cam pin, ahead of the claw
const Y_LO = 0.03, Y_HI = YC1 - 0.035; // drum turns over this part of the stroke
const HOP = { xo: 0.039, xi: 0.027, y0: -0.062, y1: 0.476, z0: 0.426, z1: 0.73 };
const PITCH = 0.034; // bolts stacked in the hopper
const HOUSE = { x: 0.066, z0: ZD - 0.066, z1: ZD + 0.066, y0: -0.247, y1: 0.474 };
const ZBOLT = ZST + 0.0085; // bolt axis in the trough

// ---------- the chain: pins on the hull of two pentagons ----------
const mod = (x, p) => ((x % p) + p) % p;
function hullOf(A) {
  const psT = rad(54) + mod(A - rad(54), D72);
  const psB = rad(234) + mod(A - rad(234), D72);
  return { psT, psB, nF: Math.round((psB - psT) / D72), K: Math.floor((A - rad(54)) / D72) };
}
function loopPoint(l, h) {
  if (l <= 5) return [YRS + RS * Math.cos(h.psT) - l * PL, ZA + RS * Math.sin(h.psT)];
  if (l <= 5 + h.nF) {
    const a = h.psT + D72 * (l - 5);
    return [YFS + RS * Math.cos(a), ZA + RS * Math.sin(a)];
  }
  if (l <= 10 + h.nF) return [YFS + RS * Math.cos(h.psB) + (l - 5 - h.nF) * PL, ZA + RS * Math.sin(h.psB)];
  const a = h.psB + D72 * (l - 10 - h.nF);
  return [YRS + RS * Math.cos(a), ZA + RS * Math.sin(a)];
}
function chainPins(A) {
  const h = hullOf(A);
  const out = new Array(NL);
  for (let n = 0; n < NL; n++) out[n] = loopPoint(mod(n + h.K, NL), h);
  return out;
}
const lugAt = (A) => {
  const h = hullOf(A);
  return loopPoint(mod(h.K, NL), h);
};

// ---------- tables over one shot cycle ----------
const TN = 2160;
const TBL = (() => {
  const ys = new Float64Array(TN + 1);
  const zs = new Float64Array(TN + 1);
  for (let i = 0; i <= TN; i++) {
    const p = lugAt((i / TN) * THETA);
    ys[i] = p[0];
    zs[i] = p[1];
  }
  let iF = 0, iR = 0;
  for (let i = 0; i < TN; i++) {
    if (ys[i] < ys[iF]) iF = i;
    if (ys[i] > ys[iR]) iR = i;
  }
  const yAt = (A) => lugAt(A)[0] - D_LUG;
  const solve = (lo, hi, target, rising) => {
    for (let n = 0; n < 50; n++) {
      const m = (lo + hi) / 2;
      const y = yAt(m);
      if ((y < target) === rising) lo = m;
      else hi = m;
    }
    return (lo + hi) / 2;
  };
  const Ar = (iR / TN) * THETA;
  const Af = (iF / TN) * THETA;
  const trip0 = solve(Ar - rad(40), Ar, YC1 - 0.001, true);
  const cyc = (A) => mod(A - trip0, THETA);
  const aFront = cyc(Af);
  const reset0 = cyc(solve(Af - rad(60), Af, YC0 + 0.015, false));
  return { ys, zs, trip0, aFront, aRest: aFront + rad(20), aReset0: reset0, cyc };
})();
function tbl(A) {
  const u = (mod(A, THETA) / THETA) * TN;
  const i = Math.min(TN - 1, Math.floor(u));
  const f = u - i;
  const y = TBL.ys[i] + (TBL.ys[i + 1] - TBL.ys[i]) * f;
  const z = TBL.zs[i] + (TBL.zs[i + 1] - TBL.zs[i]) * f;
  return { y, z, dy: ((TBL.ys[i + 1] - TBL.ys[i]) * TN) / THETA };
}

// ---------- the bow: arm angle for a string drawn to q ----------
function phiSolve(q) {
  if (q <= YS0) return PHI0;
  let lo = PHI0, hi = rad(85);
  for (let i = 0; i < 44; i++) {
    const m = (lo + hi) / 2;
    const xt = XK + LA * Math.cos(m), yt = YK + LA * Math.sin(m);
    if (xt * xt + (q - yt) ** 2 - LSTR * LSTR > 0) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}
const QN = 1400, QMAX = YC1 + 0.01, QH = (QMAX - YS0) / QN;
const PHI_T = Float64Array.from({ length: QN + 1 }, (_, i) => phiSolve(YS0 + i * QH));
function phiOf(q) {
  if (q <= YS0) return PHI0;
  const u = Math.min(QN - 1e-9, (q - YS0) / QH);
  const i = Math.floor(u);
  return PHI_T[i] + (PHI_T[i + 1] - PHI_T[i]) * (u - i);
}
const phiP = (q) => (phiOf(q + 4e-4) - phiOf(Math.max(YS0, q - 4e-4))) / (q + 4e-4 - Math.max(YS0, q - 4e-4));
const torque = (tw) => KSK * tw * (1 + HARD * tw * tw);
const eSk = (tw) => KSK * (tw * tw / 2 + (HARD * tw ** 4) / 4);
const stored = (pre, q) => 2 * (eSk(pre + phiOf(q) - PHI0) - eSk(pre)); // both skeins, J
const drawForce = (pre, q) => (q <= YS0 ? 0 : 2 * torque(pre + phiOf(q) - PHI0) * phiP(q));

// The power stroke: string and bolt from the trip to separation, then the twang and the arms on the cushions.
function simulate(pre, mb, q0, nock0) {
  const rec = PH.timeline();
  const C = 2 * IA + (MS * LA * LA) / 3;
  const mEff = (q) => {
    const p = phiP(q);
    return mb + MS / 3 + C * p * p;
  };
  const acc = (q, v) => {
    const h = 6e-4;
    const dm = (mEff(q + h) - mEff(Math.max(YS0, q - h))) / (q + h - Math.max(YS0, q - h));
    return (-(1 - HYST) * drawForce(pre, q) - 0.5 * dm * v * v) / mEff(q);
  };
  let q = q0, v = 0, t = 0;
  const dt = 4e-6;
  let next = 0;
  const E0 = stored(pre, q0);
  while (q > YS0 && t < 0.3) {
    if (t >= next) {
      rec.push(t, { q, phi: phiOf(q), nock: Math.min(nock0, q), claw: smoothstep(0, 0.004, t) });
      next += 2.5e-4;
    }
    const k1 = acc(q, v);
    const k2 = acc(q + (v + (k1 * dt) / 2) * (dt / 2), v + (k1 * dt) / 2);
    const k3 = acc(q + (v + (k2 * dt) / 2) * (dt / 2), v + (k2 * dt) / 2);
    const k4 = acc(q + (v + k3 * dt) * dt, v + k3 * dt);
    const qn = q + dt * (v + (dt / 6) * (k1 + k2 + k3));
    const vn = v + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    if (qn <= YS0) {
      const u = (q - YS0) / (q - qn || 1);
      t += dt * u;
      v = v + (vn - v) * u;
      q = YS0;
      break;
    }
    q = qn;
    v = vn;
    t += dt;
  }
  const tRel = t;
  const speed = -v;
  rec.push(tRel, { q: YS0, phi: PHI0, nock: YS0, claw: 1 });
  // The string runs on past straight and rings; the arms rebound off the cushions and settle.
  const amp = clamp(speed * 0.0005, 0.006, 0.04);
  for (let s = 0.002; s <= 0.6; s += 0.002) {
    const env = Math.exp(-s / 0.045);
    rec.push(tRel + s, { q: YS0 - amp * env * Math.sin(2 * Math.PI * 21 * s), phi: PHI0 + rad(2.4) * Math.exp(-s / 0.07) * Math.abs(Math.sin(2 * Math.PI * 9 * s)), nock: YS0 - speed * s, claw: 1 });
  }
  const ke = 0.5 * mb * speed * speed;
  return { rec, tRel, speed, E0, ke, eff: ke / (E0 || 1), tEnd: tRel + 0.6 };
}

// ---------- ammunition, rack ----------
const AMMO = [
  { id: "bolt", name: "Standard bolt", look: "bolt", mass: 0.12, radius: 0.008, shaft: 0.008, length: BOLT_L, cd: 2.0, area: Math.PI * 0.009 ** 2 },
  { id: "fire", name: "Fire bolt", look: "firebolt", mass: 0.16, radius: 0.008, shaft: 0.008, length: BOLT_L, cd: 1.3, area: Math.PI * 0.02 ** 2, fire: true },
  { id: "heavy", name: "Barbed bolt", look: "bolt", mass: 0.21, radius: 0.0105, shaft: 0.0105, length: BOLT_L, cd: 1.9, area: Math.PI * 0.0115 ** 2, heavy: true },
];
const RACK = { x0: 0.36, x1: 0.68, y: [-0.86, -0.62], z: 0.07 };
const rackSlot = (i) => [RACK.x0 + 0.035 + i * 0.05, -0.95, RACK.z + 0.012];
const rackKind = [0, 0, 1, 1, 2, 2];
const BRAZIER = [0.5, -0.36];
const PROP_BASE = [0.0675, 0.8, 0.13];
const PROP_BAR = 0.42;

// A bolt drawn in the stock frame: tail (nock) point, pointing forward (−y).
function boltAt(B, id, M, ammo, nockY, x, z, o = {}) {
  const tail = L(x, nockY, z);
  looks.bolt(B, id, tail, Ld(0, -1, 0), BOLT_L * S, (ammo.shaft || 0.008) * S, { fire: ammo.fire, heavy: ammo.heavy, vane: 2.2, roll: o.roll ?? 0.5, sys: o.sys, lit: o.lit, burnt: false });
}

export default {
  id: "polybolos",
  name: "Polybolos",
  short: "Polybolos",
  unit: U,
  view: { W: 1000, H: 640, azimuth: 26, elevation: 20, pad: 22, fit: [W(-0.7, -1.02, -0.15), W(0.78, -1.02, -0.15), W(-0.7, 0.98, -0.15), W(0.78, 0.98, -0.15), W(0, -0.05, ZP + 0.76), W(0, 0.47, ZP + 0.76), W(0, -0.74, ZP + 0.65)] },
  target: { kind: "palisade", distance: 160, maxRange: 320 },
  ammo: AMMO,
  controls: [
    { id: "rpm", name: "Crank speed", min: 20, max: 60, step: 1, value: 40, unit: "rpm" },
    { id: "twist", name: "Skein pre-twist", min: 15, max: 45, step: 1, value: 30, unit: "°" },
    { id: "elev", name: "Elevation", min: 0, max: 40, step: 0.5, value: 15, unit: "°", digits: 1 },
    { id: "load", name: "Magazine", min: 1, max: 10, step: 1, value: 8, unit: "bolts" },
    { id: "distance", name: "Palisade distance", min: 60, max: 300, step: 10, value: 160, unit: "m" },
  ],
  actions: [
    { id: "crank", name: "Crank", key: "c" },
    { id: "loose", name: "Loose one", key: " ", primary: true },
  ],
  toggles: [
    { id: "cut", name: "Cutaway" },
    { id: "strobe", name: "Strobe" },
  ],
  focus: [
    { id: "chain", name: "Chain" },
    { id: "sprocket", name: "Sprockets" },
    { id: "slider", name: "Slider & claw" },
    { id: "magazine", name: "Magazine & drum" },
    { id: "skein", name: "Skeins" },
    { id: "trigger", name: "Trigger" },
  ],
  phases: ["rest", "forward", "catch", "draw", "feed", "loose", "reload"],
  hint: "Space · loose one   C · crank",

  build(B, M) {
    const mini = !!B.mini;
    if (!mini) {
      B.plinth({ x: -0.7 * S, y: -1.02 * S, w: 1.48 * S, d: 2.0 * S, r: 10 }, { h: 12, foot: 6, ruler: "y", label: { x: 0.28 * S, y: 0.7 * S, w: 46, d: 22, r: 1.5 } });
      B.halo("stand.halo", [W(-0.56, -0.62, 0), W(0.56, -0.62, 0), W(0.56, 0.88, 0), W(-0.56, 0.88, 0)], 0, { blur: 6 });
    }
    B = onLayer(B, -1);
    const wood = { mat: "oak" };
    const ZC = ZP - 0.16; // top of the column cap
    // Base cross: a long sill and two half sills butted to it, the column on the crossing.
    B.beam("sill.y", W(0, -0.6, 0.04), W(0, 0.86, 0.04), { w: 0.1 * S, h: 0.08 * S, up: [0, 0, 1], ...wood, grain: 2, nails: [{ s: 0.1 * S, face: "v", x: [-0.4, 0.4] }, { s: 1.36 * S, face: "v", x: [-0.4, 0.4] }] });
    for (const sx of [-1, 1]) B.beam(`sill.x${sx}`, W(sx * 0.05, 0, 0.04), W(sx * 0.56, 0, 0.04), { w: 0.1 * S, h: 0.08 * S, up: [0, 0, 1], ...wood, grain: 1, nails: [{ s: 0.43 * S, face: "v", x: [-0.4, 0.4] }] });
    B.beam("column", W(0, 0, 0.08), W(0, 0, ZC - 0.04), { w: 0.12 * S, h: 0.12 * S, up: [0, 1, 0], ...wood, grain: 2, bands: [{ at: 0.08 * S }, { at: 0.44 * S }] });
    B.cyl("column.cap", W(0, 0, ZC - 0.04), W(0, 0, ZC), 0.1 * S, { mat: "iron", tone: "hi", bolts: [{ s: 0.04 * S, r: 0.078 * S, count: 8 }] });
    // Struts from the sills to the column.
    B.beam("strut.f", W(0, -0.4, 0.08), W(0, -0.06, 0.44), { w: 0.05 * S, h: 0.045 * S, up: [1, 0, 0], ...wood, grain: 1 });
    B.beam("strut.r", W(0, 0.4, 0.08), W(0, 0.06, 0.44), { w: 0.05 * S, h: 0.045 * S, up: [1, 0, 0], ...wood, grain: 1 });
    for (const sx of [-1, 1]) B.beam(`strut.s${sx}`, W(sx * 0.4, 0, 0.08), W(sx * 0.06, 0, 0.44), { w: 0.05 * S, h: 0.045 * S, up: [0, 1, 0], ...wood, grain: 1 });
    // Fork cheeks on the cap, rounded about the elevation pin.
    const tomb = [[-0.06 * S, ZC * S], [0.06 * S, ZC * S], ...Array.from({ length: 9 }, (_, i) => {
      const a = (i / 8) * Math.PI;
      return [0.055 * S * Math.cos(a), (ZP + 0.055 * Math.sin(a)) * S];
    })];
    for (const sx of [-1, 1]) {
      const x0 = sx > 0 ? 0.055 : -0.085;
      B.prism(`fork${sx}`, { o: W(x0, 0, 0), a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] }, tomb, 0, 0.03 * S, { mat: "iron", tone: "hi", over: B.D([B.at(W(sx > 0 ? 0.085 : -0.085, 0.035, ZC + 0.04)), B.at(W(sx > 0 ? 0.085 : -0.085, -0.035, ZC + 0.04))], { size: 0.5 }) });
      B.cyl(`forkpin${sx}`, W(sx * 0.085, 0, ZP), W(sx * 0.097, 0, ZP), 0.017 * S, { mat: "iron", tone: "hi", faceRing: [{ s: 0.012 * S, r: 0.008 * S }] });
    }
    // Elevation prop: base block on the sill.
    const [px, py, pz] = PROP_BASE;
    B.slab("prop.base", { x: -0.03 * S, y: (py - 0.035) * S, w: 0.084 * S, d: 0.07 * S, r: 1 }, 0.08 * S, (pz + 0.04 - 0.08) * S, { mat: "oak", tone: "hi", steps: 2, bevel: 0.4 });
    B.cyl("prop.basepin", W(px + 0.0125, py, pz), W(px + 0.0225, py, pz), 0.012 * S, { mat: "iron", tone: "hi" });
    if (mini) return;
    // Brazier for the fire bolts: a clay bowl on an iron tripod.
    const [bx, by] = BRAZIER;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.4;
      B.beam(`brazier.leg${i}`, W(bx + Math.cos(a) * 0.09, by + Math.sin(a) * 0.09, 0), W(bx + Math.cos(a) * 0.045, by + Math.sin(a) * 0.045, 0.14), { w: 0.012 * S, h: 0.012 * S, up: [0, 0, 1], mat: "iron", tone: "hi" });
    }
    B.turned("brazier.bowl", G.frameAlong(W(bx, by, 0.135), [0, 0, 1]), [[0, 0.03 * S], [0.02 * S, 0.05 * S, 1], [0.05 * S, 0.085 * S, 1], [0.075 * S, 0.1 * S, 1], [0.085 * S, 0.104 * S], [0.09 * S, 0.096 * S]], { mat: "clay", tone: "hi" });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      B.ball(`brazier.coal${i}`, W(bx + Math.cos(a) * 0.04, by + Math.sin(a) * 0.04, 0.218), 0.022 * S, { mat: "pitch", tone: "hi" });
    }
    // Ammunition rack: two notched blocks.
    RACK.y.forEach((y, i) => {
      B.slab(`rack.block${i}`, { x: RACK.x0 * S, y: (y - 0.025) * S, w: (RACK.x1 - RACK.x0) * S, d: 0.05 * S, r: 1 }, 0, RACK.z * S, { mat: "oak", tone: "hi", steps: 2, bevel: 0.5, groove: 1.2 });
    });
  },

  init(M) {
    const load = M.ctrl.load;
    return {
      A: TBL.trip0 + TBL.aRest,
      omega: 0,
      drive: "off",
      stopAt: null,
      hopper: load - 1,
      drum: 1,
      trough: 0,
      boltOff: 0.005,
      fired: 0,
      pickT: 9,
      dropT: 9,
      log: [],
      logT: 0,
      sim: null,
      flight: null,
      reload: null,
      after: null,
      dusted: true,
      time: 0,
      pending: 0,
      landY: null,
      dropY: 0,
    };
  },

  boltsLeft(st) {
    return st.hopper + st.drum + st.trough;
  },

  act(M, id) {
    const st = M.state;
    if (st.reload) {
      if (id === "crank" || id === "loose") st.after = id === "crank" ? (st.after === "crank" ? null : "crank") : "single";
      return;
    }
    if (id === "crank") {
      if (st.drive === "crank") {
        st.drive = "off";
        st.stopAt = st.omega > 0.05 ? st.A + (st.omega * st.omega) / (2 * DEC) : null;
        st.afterEmpty = false;
        if (st.stopAt === null) st.omega = 0;
        return;
      }
      if (this.boltsLeft(st) === 0) return this.startReload(M, "crank");
      st.drive = "crank";
      st.stopAt = null;
    }
    if (id === "loose") {
      if (st.drive === "crank") {
        st.drive = "single";
        return;
      }
      if (st.drive === "single") return;
      if (this.boltsLeft(st) === 0) return this.startReload(M, "single");
      st.drive = "single";
      st.stopAt = null;
    }
  },

  startReload(M, after) {
    const st = M.state;
    const want = M.ctrl.load - this.boltsLeft(st);
    if (want <= 0) return;
    st.reload = { t: 0, n: want, done: 0 };
    st.after = after;
    M.setPhase("reload");
  },

  onControl(M, id) {
    const st = M.state;
    if (id === "distance") {
      M.def.target.distance = M.ctrl.distance;
      M.range.mount(M.def, M);
    }
    if (id === "load" && !st.reload && st.drive === "off") {
      const have = this.boltsLeft(st);
      if (M.ctrl.load > have) this.startReload(M, null);
      else if (M.ctrl.load < have) st.hopper = Math.max(0, st.hopper - (have - M.ctrl.load));
    }
  },

  tour(M) {
    const st = M.state;
    if (st.drive === "off" && !st.reload && st.omega === 0) this.act(M, "loose");
  },

  // The crew's speed at the crank: they slow as the torque rises.
  omegaAt(M, A) {
    const w = (M.ctrl.rpm * TAU) / 60;
    return w / (1 + this.torqueAt(M, A) / TAU_CREW);
  },

  // Torque needed at the windlass: draw force × slider travel per radian, plus friction.
  torqueAt(M, A) {
    const a = TBL.cyc(A);
    const t = tbl(A);
    const yc = t.y - D_LUG;
    const fric = 2.5;
    if (a < TBL.aFront) return fric + 0.6 * Math.abs(t.dy);
    const q = Math.max(YS0, yc);
    return fric + drawForce(rad(M.ctrl.twist), q) * Math.max(0, t.dy);
  },

  // Seconds per shot: one cycle of the windlass at the crew's loaded speed.
  cycleTime(M) {
    const key = `${M.ctrl.rpm}|${M.ctrl.twist}`;
    if (this._cyc && this._cyc.key === key) return this._cyc.T;
    let T = 0;
    const n = 540;
    for (let i = 0; i < n; i++) T += THETA / n / this.omegaAt(M, TBL.trip0 + ((i + 0.5) / n) * THETA);
    this._cyc = { key, T };
    return T;
  },

  // Predicted shot for the current settings (velocity and reach on level ground).
  predict(M) {
    const key = `${M.ctrl.twist}|${M.ammo.id}|${M.ctrl.elev}`;
    if (this._pred && this._pred.key === key) return this._pred;
    const sim = simulate(rad(M.ctrl.twist), M.ammo.mass, YC1 - 0.001, YC1 - 0.006);
    setEl(rad(M.ctrl.elev));
    const p = Lm(0, YS0 - 0.8 * BOLT_L, ZBOLT);
    const dir = Ld(0, -1, 0);
    const fl = PH.flight({ p, v: mul(dir, sim.speed), mass: M.ammo.mass, area: M.ammo.area, cd: M.ammo.cd });
    this._pred = { key, v: sim.speed, range: -fl.impact.p[1], E: sim.E0, eff: sim.eff, t: fl.impact.t };
    return this._pred;
  },

  fire(M) {
    const st = M.state;
    const pre = rad(M.ctrl.twist);
    const yc = tbl(st.A).y - D_LUG;
    const nock0 = yc - st.boltOff;
    const loaded = st.trough > 0;
    const sim = simulate(pre, loaded ? M.ammo.mass : 0.004, yc, loaded ? nock0 : -9);
    sim.loaded = loaded;
    st.sim = sim;
    st.trough = 0;
    st.log = [[0, st.A]];
    st.logT = 0;
    st.dusted = false;
    setEl(rad(M.ctrl.elev));
    let T = sim.tEnd + 0.3;
    const marks = [[0, "trip"]];
    if (loaded) {
      st.fired++;
      const p = L(0, YS0 - 0.8 * BOLT_L, ZBOLT);
      const flight = M.launch({ p, v: mul(Ld(0, -1, 0), sim.speed), t0: sim.tRel });
      st.flight = flight;
      if (flight) {
        T = Math.max(T, sim.tRel + flight.impact.t + 1.0);
        marks.push([sim.tRel, "loose"], [sim.tRel + flight.impact.t, "impact"]);
      }
    }
    if (M.sfx) M.sfx("twang", { gain: 0.8, pitch: 1.3 });
    M.startShot(T, marks);
    M.setPhase("loose");
  },

  endShot(M) {
    const st = M.state;
    if (M.shot && M.shot.T > st.logT) st.pending += M.shot.T - st.logT;
    st.logT = 0;
    st.log = [];
  },

  // Turn the windlass by h seconds of crank time; fire on each trip.
  advance(M, h) {
    const st = M.state;
    let left = h;
    while (left > 1e-9) {
      const dt = Math.min(left, 1 / 240);
      left -= dt;
      st.time += dt;
      st.pickT += dt;
      st.dropT += dt;
      const turning = st.drive !== "off" || st.stopAt !== null;
      if (!turning) {
        st.omega = 0;
        continue;
      }
      const w = st.drive !== "off" ? this.omegaAt(M, st.A) : 0;
      st.omega += (w - st.omega) * (1 - Math.exp(-dt / 0.15));
      if (st.stopAt !== null) {
        const rem = st.stopAt - st.A;
        st.omega = Math.max(0.2, Math.min(st.omega, Math.sqrt(Math.max(0, 2 * DEC * rem)) + 0.05));
      }
      const A0 = st.A;
      let A1 = A0 + st.omega * dt;
      let stopped = false;
      if (st.stopAt !== null && A1 >= st.stopAt) {
        A1 = st.stopAt;
        stopped = true;
      }
      st.A = A1;
      // Sounds of the windlass: the pawl drops on each ratchet tooth; the claw snaps over the string.
      if (M.sfx) {
        if (Math.floor(A1 / (TAU / 12)) !== Math.floor(A0 / (TAU / 12))) M.sfx("click", { gain: 0.22, pitch: 1.3 });
        const c0 = Math.floor((A0 - TBL.trip0 - TBL.aFront) / THETA), c1 = Math.floor((A1 - TBL.trip0 - TBL.aFront) / THETA);
        if (c1 > c0) M.sfx("clank", { gain: 0.45, pitch: 1.6 });
      }
      // Trip: the latch meets the peg at the back of the stroke.
      const k1 = Math.floor((A1 - TBL.trip0) / THETA);
      const k0 = Math.floor((A0 - TBL.trip0) / THETA);
      if (k1 > k0) {
        st.A = TBL.trip0 + k1 * THETA;
        this.fire(M);
        if (st.drive === "single" || this.boltsLeft(st) === 0) {
          st.stopAt = st.A + TBL.aRest;
          if (st.drive === "crank" && this.boltsLeft(st) === 0) st.afterEmpty = true;
        }
        st.A = A1;
        if (M.shot) {
          st.log = [[0, TBL.trip0 + k1 * THETA]];
          st.logT = 0;
        }
        return;
      }
      this.feed(M);
      if (stopped) {
        st.stopAt = null;
        st.omega = 0;
        st.drive = "off";
        if (st.afterEmpty) {
          st.afterEmpty = false;
          if (this.boltsLeft(st) === 0) this.startReload(M, "crank");
        }
      }
    }
  },

  // The drum takes a bolt when its groove is up, and drops one when it is down.
  feed(M) {
    const st = M.state;
    const yc = tbl(st.A).y - D_LUG;
    const dl = Math.PI * smoothstep(Y_LO, Y_HI, yc);
    if (!st.drum && st.hopper > 0 && dl < 0.03) {
      st.hopper--;
      st.drum = 1;
      st.pickT = 0;
      if (M.sfx) M.sfx("tick", { gain: 0.5 });
    }
    if (st.drum && dl > Math.PI - 0.02 && TBL.cyc(st.A) > TBL.aFront) {
      st.drum = 0;
      st.trough = 1;
      st.dropT = 0;
      st.dropY = yc;
      st.landY = null;
      st.boltOff = yc - NOCK;
    }
    // Landed: from here the bolt rides with the slider.
    if (st.trough && st.dropT >= FALL_T && st.landY === null) {
      st.landY = yc;
      st.boltOff = yc - NOCK;
      if (M.sfx) M.sfx("thunk", { gain: 0.35, pitch: 1.8 });
    }
  },

  update(M, dt) {
    const st = M.state;
    let moving = false;
    if (st.reload) {
      const r = st.reload;
      r.t += dt;
      st.pickT += dt;
      st.dropT += dt;
      const each = 0.24;
      const done = Math.min(r.n, Math.floor(Math.max(0, r.t - 0.55) / each + 1e-9) + (r.t >= 0.55 ? 1 : 0));
      if (done > r.done) {
        st.hopper += done - r.done;
        r.done = done;
        st.pickT = 9;
      }
      if (!st.drum && st.hopper > 0) {
        st.hopper--;
        st.drum = 1;
        st.pickT = 0;
      }
      if (r.t >= 0.55 + (r.n - 1) * each + 0.35) {
        st.reload = null;
        const after = st.after;
        st.after = null;
        if (after) this.act(M, after === "crank" ? "crank" : "loose");
      }
      M.setPhase("reload");
      return true;
    }
    let live = dt;
    if (M.shot) live = M.shot.playing ? Math.max(0, M.shot.t - st.logT) : 0;
    else if (st.pending) {
      live += st.pending;
      st.pending = 0;
    }
    if (live > 0) this.advance(M, live);
    if (M.shot && M.shot.playing && M.shot.t > st.logT) {
      st.logT = M.shot.t;
      st.log.push([st.logT, st.A]);
    }
    // Dust from the cushions as the arms slam home.
    if (M.shot && st.sim && !st.dusted && M.shot.t >= st.sim.tRel && M.shot.playing) {
      st.dusted = true;
      if (M.sfx) M.sfx("thud", { gain: 0.5, size: 0.6 });
      if (!M.calm) {
        setEl(rad(M.ctrl.elev));
        for (const sx of [-1, 1]) M.fx.emit("dust", L(sx * 0.32, -0.18, 0.235), { n: 7, v: [sx * 10, -14, 6], spread: 3, size: 2.2, grow: 5, life: 0.9, drag: 2.4, alpha: 0.7 });
      }
    }
    // The brazier burns while fire bolts are chosen.
    if (M.ammo.fire && !M.calm && dt > 0) {
      const [bx, by] = BRAZIER;
      if (Math.random() < dt * 30) M.fx.emit("fire", W(bx + (Math.random() - 0.5) * 0.06, by + (Math.random() - 0.5) * 0.06, 0.24), { v: [0, 0, 22], spread: 3, size: 6, grow: 2, life: 0.5, heat: 1, buoy: 40, drag: 2 });
      if (Math.random() < dt * 6) M.fx.emit("smoke", W(bx, by, 0.32), { v: [2, 0, 14], spread: 3, size: 7, grow: 14, life: 2.4, alpha: 0.45, buoy: 8, drag: 1 });
    }
    // Phase strip.
    const p = this.pose(M);
    let phase;
    if (M.shot && st.sim && M.shot.t < st.sim.tRel + 0.25) phase = "loose";
    else if (st.omega === 0 && st.drive === "off" && st.stopAt === null) phase = "rest";
    else {
      const a = p.a;
      if (a < TBL.aReset0) phase = "forward";
      else if (a < TBL.aFront + rad(55)) phase = "catch";
      else if (p.yc < Y_HI - 0.06) phase = "draw";
      else phase = "feed";
    }
    M.setPhase(phase);
    moving = st.omega > 0 || st.drive !== "off" || st.stopAt !== null || st.pickT < 0.3 || st.dropT < 0.3;
    return moving;
  },

  // Crank angle shown: the shot log while a shot plays or is scrubbed, else the live angle.
  shownA(M) {
    const st = M.state;
    if (!M.shot || !st.log.length) return st.A;
    const t = M.shot.t;
    const log = st.log;
    if (t >= log[log.length - 1][0]) return log[log.length - 1][1];
    let lo = 0, hi = log.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (log[m][0] <= t) lo = m;
      else hi = m;
    }
    const [t0, a0] = log[lo];
    const [t1, a1] = log[hi];
    return a0 + ((a1 - a0) * (t - t0)) / (t1 - t0 || 1);
  },

  pose(M) {
    const st = M.state;
    const A = this.shownA(M);
    const a = TBL.cyc(A);
    const t = tbl(A);
    const yc = t.y - D_LUG;
    const engaged = a >= TBL.aFront;
    let claw = 0, latch = 0;
    if (!engaged) {
      claw = smoothstep(YC0, YC0 + 0.015, yc);
      latch = claw > 0.15 ? 1 : claw / 0.15;
    } else latch = smoothstep(YC1 - 0.007, YC1 - 0.001, yc);
    let q = engaged ? Math.max(YS0, yc) : YS0;
    let phi = phiOf(q);
    let rel = null;
    const sim = st.sim;
    if (M.shot && sim && M.shot.t < sim.tEnd) {
      const f = sim.rec.at(M.shot.t);
      q = f.q;
      phi = f.phi;
      claw = Math.max(claw, f.claw);
      latch = 1;
      if (M.shot.t < sim.tRel && sim.loaded) rel = { nock: f.nock };
    }
    const delta = Math.PI * smoothstep(Y_LO, Y_HI, yc);
    return { A, a, yc, lug: [t.y, t.z], claw, latch, q, phi, delta, rel, engaged };
  },

  draw(B, M) {
    const st = M.state;
    const mini = !!B.mini;
    const e = rad(M.ctrl.elev);
    setEl(e);
    const pre = rad(M.ctrl.twist);
    const pose = this.pose(M);
    const ek = e.toFixed(4);
    B.keep("stock", [ek], () => drawStock(B, mini));
    if (mini) {
      drawArms(B, pose.phi, true);
      return;
    }
    const qp = Math.round(deg(pose.phi) / 0.25);
    pcache(B, `arms|${ek}`, qp, (C) => drawArms(C, rad(qp * 0.25), false));
    B.keep("string", [ek, pose.phi.toFixed(5), pose.q.toFixed(5)], () => drawString(B, pose));
    const tw = Math.round(deg(pre + pose.phi - PHI0) / 1.5);
    pcache(B, `skeins|${ek}`, tw, (C) => drawSkeins(C, rad(tw * 1.5)));
    B.keep("washers", [ek, M.ctrl.twist], () => drawWashers(B, pre));
    B.keep("prop", [ek], () => drawProp(onLayer(B, -1)));
    B.keep("hubs", [ek], () => drawHubs(B));
    drawSprockets(B, pose.A, ek);
    drawChain(B, M, pose.A, ek);
    drawSlider(B, M, pose, ek);
    const qd = Math.round(pose.delta / rad(1.5));
    pcache(B, `drum|${ek}`, qd, (C) => drawDrum(C, qd * rad(1.5)));
    drawBolts(B, M, pose, ek);
    B.keep("rack", [M.ammo.id], () => drawRack(B, M));
    if (st.reload) drawReload(B, M);
    if (M.toggles.strobe) drawStrobe(B, M, pose);
    // A fire bolt's tow smoulders in the trough once it is clear of the housing.
    if (M.ammo.fire && !M.calm && pose.rel && Math.random() < 0.8) {
      const y = pose.rel.nock - BOLT_L * 0.72;
      if (y < HOUSE.y0) M.fx.emit("fire", L(0, y, ZBOLT + 0.02), { v: [0, 0, 18], spread: 2, size: 5, grow: 2, life: 0.35, heat: 1, buoy: 30, drag: 2 });
    }
  },

  occluders(M) {
    return [{ min: W(-0.12, -0.3, 0), max: W(0.12, 0.6, 1.0) }];
  },

  readouts(M) {
    const st = M.state;
    const pose = this.pose(M);
    const pre = rad(M.ctrl.twist);
    const Tc = this.cycleTime(M);
    const pr = this.predict(M);
    const tq = this.torqueAt(M, pose.A);
    return [
      ["Shots fired", fmtInt(st.fired), ""],
      ["Bolts left", fmtInt(this.boltsLeft(st) + (st.reload ? st.reload.n - st.reload.done : 0)), ""],
      ["Cycle time", fmt(Tc, 1), "s"],
      ["Rate", fmt(60 / Tc, 1), "/min"],
      ["Crank torque", fmtInt(tq), "N·m"],
      ["Crank speed", fmt((st.omega * 60) / TAU, 0), "rpm"],
      ["Draw", fmt(Math.max(0, pose.q - YS0) * 100, 0), "cm"],
      ["Skein twist", fmt(deg(pre + pose.phi - PHI0), 0), "°"],
      ["Stored", fmtInt(stored(pre, Math.max(YS0, pose.q))), "J"],
      ["Velocity", fmt(pr.v, 1), "m/s"],
      ["Reach", fmt(pr.range, 0), "m"],
    ];
  },
};

const FALL_T = Math.sqrt((2 * (ZD - 0.03 - ZBOLT)) / 9.81);
const DEC = 7; // crank deceleration when the crew stops, rad/s²

// ---------- drawing ----------
function drawStock(B, mini) {
  const oak = { mat: "oak" };
  // Case, guide strips and the iron front cap.
  segs(-0.74, 0.71).forEach(([a, b], i) => bar(B, `case.${i}`, [0, a, 0.125], [0, b, 0.125], 0.18, 0.13, [0, 0, 1], { ...oak, grain: 2, nails: [-0.6, -0.36, 0.1, 0.33, 0.62].filter((y) => y >= a && y < b).map((y) => ({ s: (y - a) * S, face: "-u", x: [-0.6, 0.6] })) }));
  if (!mini) {
    for (const sx of [-1, 1]) boxSegs(B, `guide${sx}`, sx > 0 ? 0.062 : -0.09, sx > 0 ? 0.09 : -0.062, -0.74, 0.71, 0.19, 0.2, { mat: "oak", tone: "hi" }, [-0.6, -0.35, -0.13, 0.09, 0.33, 0.58], (a, b) => B.D([a + 0.04, b - 0.04].map((y) => B.at(L(sx * 0.076, y, 0.2))), { size: 0.45 }));
    box(B, "case.cap", -0.092, 0.092, -0.752, -0.74, 0.058, 0.192, { mat: "iron", tone: "hi", over: B.D([B.at(L(0.06, -0.752, 0.09)), B.at(L(-0.06, -0.752, 0.09)), B.at(L(0.06, -0.752, 0.16)), B.at(L(-0.06, -0.752, 0.16))], { size: 0.5 }) });
    // Cradle under the case, rounded about the elevation pin.
    const cr = [[0.07 * S, 0.06 * S], [-0.07 * S, 0.06 * S], ...Array.from({ length: 9 }, (_, i) => {
      const a = Math.PI + (i / 8) * Math.PI;
      return [0.07 * S * Math.cos(a), 0.07 * S * Math.sin(a)];
    })];
    B.prism("cradle", FX(-0.05, 0, 0), cr, 0, 0.1 * S, { mat: "oak", tone: "hi", layer: -1, over: B.L(G.circleOf(G.frameAlong(L(0.05, 0, 0), [1, 0, 0]), 0, 0.02 * S, B.P), { tone: "lo" }) });
  }
  // Torsion frame: hole-carriers, stanchions, cushions.
  const plateOver = (z, x0, x1) => B.D([[-0.33, -0.22], [0.33, -0.22], [-0.33, -0.1], [0.33, -0.1], [0, -0.22], [0, -0.1]].filter(([x]) => x > x0 && x < x1).map(([x, y]) => B.at(L(x, y, z))), { size: 0.5 });
  // Each side piece of a hole-carrier carries its iron counter-plate (one part, plate under or over it).
  for (const [nm, z0, z1] of [["top", 0.43, 0.47], ["bot", 0.0, 0.04]]) {
    [[-0.36, -0.095], [-0.095, 0.095], [0.095, 0.36]].forEach(([x0, x1], i) => {
      const plate = (C) => box(C, `plate.${nm}${i}`, x0, x1, -0.24, -0.08, z0, z1, { mat: "oak", tone: "hi", over: nm === "top" ? plateOver(z1, x0, x1) : "" });
      if (i === 1 || mini) return plate(B);
      const sx = i === 2 ? 1 : -1;
      const cp = (C) =>
        nm === "top"
          ? box(C, `cplate.t${sx}`, sx * XK - 0.062, sx * XK + 0.062, YK - 0.062, YK + 0.062, 0.47, 0.475, { mat: "iron", tone: "hi", over: C.D([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([u, v]) => C.at(L(sx * XK + u * 0.05, YK + v * 0.05, 0.475))), { size: 0.5 }) })
          : box(C, `cplate.b${sx}`, sx * XK - 0.062, sx * XK + 0.062, YK - 0.062, YK + 0.062, -0.005, 0.0, { mat: "iron", tone: "hi" });
      composite(B, `plate.${nm}${i}`, (C) => (nm === "top" ? (plate(C), cp(C)) : (cp(C), plate(C))), { axes: SAX() });
    });
  }
  if (mini) {
    box(B, "hopper.mini", -HOP.xo, HOP.xo, HOP.y0, HOP.y1, ZD - 0.066, HOP.z1, { mat: "oak", tone: "hi" });
    return;
  }
  for (const sx of [-1, 1]) {
    const xs = (a, b) => (sx > 0 ? [a, b] : [-b, -a]);
    const [c0, c1] = xs(0.095, 0.135);
    box(B, `stan.c${sx}`, c0, c1, -0.202, -0.162, 0.04, 0.43, { mat: "oak", tone: "hi", over: B.D([B.at(L(sx > 0 ? c1 : c0, -0.182, 0.1)), B.at(L(sx > 0 ? c1 : c0, -0.182, 0.37))], { size: 0.45 }) });
    const [o0, o1] = xs(0.3, 0.34);
    box(B, `stan.o${sx}`, o0, o1, -0.2263, -0.1863, 0.04, 0.43, { mat: "oak", tone: "hi", over: B.D([B.at(L(sx > 0 ? o1 : o0, -0.206, 0.1)), B.at(L(sx > 0 ? o1 : o0, -0.206, 0.37))], { size: 0.45 }) });
    box(B, `cushion${sx}`, o0, o1, -0.1863, -0.1763, 0.195, 0.275, { mat: "hide", tone: "hi", r: 0.004, sys: "skein" });
    // Cleats holding the drum housing between the central stanchions.
    const [q0, q1] = xs(HOUSE.x, 0.095);
    box(B, `cleat${sx}`, q0, q1, -0.2, -0.168, ZD - 0.03, ZD + 0.03, { mat: "iron", tone: "hi" });
  }
  // Reset block under the housing: strikes the open claw shut at the front of the stroke.
  box(B, "reset", -0.016, 0.016, -0.18, -0.168, ZST + 0.046, HOUSE.z0, { mat: "iron", tone: "hi", sys: "trigger" });
  // Trip peg on the near guide strip.
  rod(B, "trippeg", [0.071, YC1 + 0.109, 0.2], [0.071, YC1 + 0.109, 0.212], 0.006, { mat: "iron", tone: "hi", sys: "trigger" });
  // Drum housing: far side, top, bottom strips, near side (cut), end plates.
  const H = HOUSE;
  const hc = [-0.06, 0.2];
  const mg = { mat: "oak", tone: "hi", sys: "magazine" };
  const hy0 = H.y0 + 0.012, hy1 = H.y1 - 0.012;
  boxSegs(B, "house.far", -H.x, -H.x + 0.01, hy0, hy1, H.z0, H.z1, mg, hc);
  boxSegs(B, "house.topF", -H.x, -HOP.xi, hy0, hy1, H.z1 - 0.01, H.z1, mg, [-0.12, 0.1, 0.32]);
  boxSegs(B, "house.topN", HOP.xi, H.x, hy0, hy1, H.z1 - 0.01, H.z1, { ...mg, cut: true }, [-0.12, 0.1, 0.32]);
  boxSegs(B, "house.botF", -H.x + 0.01, -0.019, hy0, hy1, H.z0, H.z0 + 0.01, mg, [-0.16, 0.06, 0.3]);
  boxSegs(B, "house.botN", 0.019, 0.029, hy0, hy1, H.z0, H.z0 + 0.01, { ...mg, cut: true }, [-0.16, 0.06, 0.3]);
  boxSegs(B, "house.botN2", 0.041, H.x - 0.01, hy0, hy1, H.z0, H.z0 + 0.01, { ...mg, cut: true }, [-0.16, 0.06, 0.3]);
  boxSegs(B, "house.near", H.x - 0.01, H.x, hy0, hy1, H.z0, H.z1, { ...mg, cut: true }, hc, (a, b) => B.D([-0.2, -0.1, 0.0, 0.1, 0.3, 0.4].filter((y) => y > a + 0.01 && y < b - 0.01).flatMap((y) => [B.at(L(H.x, y, H.z0 + 0.02)), B.at(L(H.x, y, H.z1 - 0.02))]), { size: 0.45 }));
  for (const [nm, y0, y1] of [["f", H.y0, H.y0 + 0.012], ["r", H.y1 - 0.012, H.y1]]) {
    box(B, `house.end${nm}F`, -H.x, 0, y0, y1, H.z0, H.z1, { mat: "oak", tone: "hi", sys: "magazine" });
    box(B, `house.end${nm}N`, 0, H.x, y0, y1, H.z0, H.z1, { mat: "oak", tone: "hi", sys: "magazine", cut: true });
  }
  rod(B, "drum.bossF", [0, H.y0 - 0.012, ZD], [0, H.y0, ZD], 0.02, { mat: "iron", tone: "hi", sys: "magazine", faceRing: [{ s: 0, r: 0.009 * S }] });
  rod(B, "drum.bossR", [0, H.y1, ZD], [0, H.y1 + 0.012, ZD], 0.02, { mat: "iron", tone: "hi", sys: "magazine" });
  // Hopper: front and rear walls, far wall, near wall as two stiles and two rails round a sight slot.
  const hz0 = HOP.z0, hz1 = HOP.z1;
  const bandLines = (x, ya, yb) => B.L([0.52, 0.68].map((z) => k.pathOf([B.at(L(x, ya, z)), B.at(L(x, yb, z))])).join(""), { tone: "lo" });
  const hopDots = (x, ya, yb) => B.D([0.52, 0.68].flatMap((z) => [-0.03, 0.1, 0.24, 0.34, 0.45].filter((y) => y > ya && y < yb).map((y) => B.at(L(x, y, z)))), { size: 0.4 });
  box(B, "hop.front", -HOP.xo, HOP.xo, HOP.y0, HOP.y0 + 0.012, hz0, hz1, { mat: "oak", tone: "hi", sys: "magazine" });
  box(B, "hop.rear", -HOP.xo, HOP.xo, HOP.y1 - 0.012, HOP.y1, hz0, hz1, { mat: "oak", tone: "hi", sys: "magazine" });
  boxSegs(B, "hop.far", -HOP.xo, -HOP.xi, HOP.y0 + 0.012, HOP.y1 - 0.012, hz0, hz1, { mat: "oak", tone: "hi", sys: "magazine" }, [0.08, 0.3]);
  const ys = [HOP.y0 + 0.012, 0.13, 0.2, HOP.y1 - 0.012];
  box(B, "hop.stileF", HOP.xi, HOP.xo, ys[0], ys[1], hz0, hz1, { mat: "oak", tone: "hi", sys: "magazine", cut: true, inner: bandLines(HOP.xo, ys[0], ys[1]), over: hopDots(HOP.xo, ys[0], ys[1]) });
  box(B, "hop.stileR", HOP.xi, HOP.xo, ys[2], ys[3], hz0, hz1, { mat: "oak", tone: "hi", sys: "magazine", cut: true, inner: bandLines(HOP.xo, ys[2], ys[3]), over: hopDots(HOP.xo, ys[2], ys[3]) });
  box(B, "hop.railB", HOP.xi, HOP.xo, ys[1], ys[2], hz0, hz0 + 0.03, { mat: "oak", tone: "hi", sys: "magazine", cut: true });
  box(B, "hop.railT", HOP.xi, HOP.xo, ys[1], ys[2], hz1 - 0.03, hz1, { mat: "oak", tone: "hi", sys: "magazine", cut: true });
  // Brackets tying the hopper to the top hole-carrier.
  for (const sx of [-1, 1]) box(B, `hop.bracket${sx}`, sx > 0 ? HOP.xo : -0.075, sx > 0 ? 0.075 : -HOP.xo, -0.08, -0.03, 0.43, 0.47, { mat: "iron", tone: "hi", over: B.D([B.at(L(sx * 0.057, -0.055, 0.47))], { size: 0.5 }) });
  // Rear gallows on the end of the case, with a spine to the hopper.
  for (const sx of [-1, 1]) box(B, `gal.post${sx}`, sx > 0 ? 0.062 : -0.088, sx > 0 ? 0.088 : -0.062, 0.668, 0.698, 0.2, 0.47, { mat: "oak", tone: "hi", over: B.D([B.at(L(sx > 0 ? 0.088 : -0.062, 0.683, 0.25))], { size: 0.45 }) });
  box(B, "gal.cross", -0.1, 0.1, 0.664, 0.702, 0.47, 0.5, { mat: "oak", tone: "hi", r: 0.006, over: B.D([B.at(L(-0.075, 0.683, 0.5)), B.at(L(0.075, 0.683, 0.5))], { size: 0.5 }) });
  box(B, "gal.spine", -0.016, 0.016, HOP.y1, 0.664, 0.47, 0.5, { mat: "oak", tone: "hi" });
  // Sprocket axles: front stubs and the windlass axle, shown where they are clear of the case.
  for (const sx of [-1, 1]) {
    rod(B, `axleF.in${sx}`, [sx * 0.09, YFS, ZA], [sx * 0.118, YFS, ZA], 0.012, { mat: "iron", tone: "hi", sys: "sprocket" });
    rod(B, `axleR.in${sx}`, [sx * 0.09, YRS, ZA], [sx * 0.118, YRS, ZA], 0.012, { mat: "iron", tone: "hi", sys: "sprocket" });
    if (sx > 0) {
      rod(B, `axleR.mid${sx}`, [0.152, YRS, ZA], [0.29, YRS, ZA], 0.013, { mat: "iron", tone: "hi", sys: "sprocket" });
      rod(B, `axleR.out${sx}`, [0.308, YRS, ZA], [0.355, YRS, ZA], 0.013, { mat: "iron", tone: "hi", sys: "sprocket" });
    } else rod(B, `axleR.out${sx}`, [-0.355, YRS, ZA], [-0.152, YRS, ZA], 0.013, { mat: "iron", tone: "hi", sys: "sprocket" });
  }
  // Pawl pin from the near gallows post.
  rod(B, "pawl.pin", [0.088, 0.683, 0.215], [0.293, 0.683, 0.215], 0.007, { mat: "iron", tone: "hi", sys: "sprocket" });
  rod(B, "pawl.head", [0.305, 0.683, 0.215], [0.313, 0.683, 0.215], 0.01, { mat: "iron", tone: "hi", sys: "sprocket", faceRing: [{ r: 0.005 * S }] });
  // Bracket under the rear of the case for the elevation prop.
  box(B, "prop.bracket", -0.03, 0.03, 0.6, 0.66, 0.02, 0.06, { mat: "iron", tone: "hi", layer: -1 });
}

function drawWashers(B, pre) {
  for (const sx of [-1, 1]) {
    const c = [sx * XK, YK];
    B.ring(`washer.t${sx}`, L(c[0], c[1], 0.475), L(c[0], c[1], 0.495), 0.034 * S, 0.056 * S, { mat: "bronze", tone: "hi", sys: "skein" });
    B.ring(`washer.b${sx}`, L(c[0], c[1], -0.025), L(c[0], c[1], -0.005), 0.034 * S, 0.056 * S, { mat: "bronze", tone: "hi", sys: "skein" });
    // The key through each washer, turned to the pre-twist.
    const kk = rad(-30) + sx * pre;
    const d = [Math.cos(kk) * sx, Math.sin(kk), 0];
    bar(B, `key.t${sx}`, [c[0] - d[0] * 0.07, c[1] - d[1] * 0.07, 0.503], [c[0] + d[0] * 0.07, c[1] + d[1] * 0.07, 0.503], 0.016, 0.016, [0, 0, 1], { mat: "iron", tone: "hi", sys: "skein" });
    bar(B, `key.b${sx}`, [c[0] - d[0] * 0.07, c[1] - d[1] * 0.07, -0.033], [c[0] + d[0] * 0.07, c[1] + d[1] * 0.07, -0.033], 0.016, 0.016, [0, 0, 1], { mat: "iron", tone: "hi", sys: "skein" });
  }
}

// Arms (beams from the skein outward), the skeins (their lay turns with the twist) and the bowstring.
function drawArms(B, phi, mini) {
  for (const sx of [-1, 1]) {
    const c = [sx * XK, YK];
    const d = [sx * Math.cos(phi), Math.sin(phi), 0];
    const at = (s, z = ZST) => [c[0] + d[0] * s, c[1] + d[1] * s, z];
    const o = { mat: "oak", tone: "hi", sys: "skein" };
    // One part per arm, boxed in the arm's own axes; inside it the band is painted over the joint.
    const ax = [Ld(...d), Ld(-d[1], d[0], 0), Ld(0, 0, 1)];
    composite(B, `arm${sx}`, (C) => {
      if (!mini) bar(C, `arm.root${sx}`, at(-0.03), at(0.034), 0.04, 0.05, [0, 0, 1], o);
      bar(C, `arm.a${sx}`, at(0.034), at(0.2), 0.038, 0.048, [0, 0, 1], { ...o, grain: mini ? 0 : 1, nails: mini ? [] : [{ s: 0.05 * S, face: "v", x: [-0.5, 0.5] }] });
      bar(C, `arm.b${sx}`, at(0.2), at(0.372), 0.032, 0.04, [0, 0, 1], { ...o, grain: mini ? 0 : 1, nails: mini ? [] : [{ s: 0.1 * S, face: "v", x: 0 }] });
      if (!mini) {
        bar(C, `arm.band${sx}`, at(0.192), at(0.208), 0.042, 0.052, [0, 0, 1], { mat: "iron", tone: "hi", sys: "skein", crease: "lo" });
        bar(C, `arm.cap${sx}`, at(0.372), at(0.41), 0.036, 0.044, [0, 0, 1], { mat: "iron", tone: "hi", sys: "skein", nails: [{ s: 0.012 * S, face: "v", x: 0 }] });
      }
    }, { sys: "skein", axes: ax });
  }
}
function drawString(B, pose) {
  const phi = pose.phi;
  const tipOf = (sx) => [sx * XK + sx * Math.cos(phi) * LA, YK + Math.sin(phi) * LA, ZST + 0.004];
  const mid = [0, pose.q, ZST + 0.004];
  B.cord("string.n", [L(...tipOf(1)), L(...mid)], { width: 1.3, tone: "hi", sys: "skein" });
  B.cord("string.f", [L(...tipOf(-1)), L(...mid)], { width: 1.3, tone: "hi", sys: "skein" });
}
function drawSkeins(B, twist) {
  for (const sx of [-1, 1]) {
    const c = [sx * XK, YK];
    const tw = sx * twist;
    for (const [nm, z0, z1] of [["lo", 0.04, ZST - 0.027], ["hi", ZST + 0.027, 0.43]]) {
      const F = { o: L(c[0], c[1], z0), a: Ld(0, 0, 1), u: [1, 0, 0], v: Ld(0, 1, 0) };
      B.cyl(`skein.${nm}${sx}`, L(c[0], c[1], z0), L(c[0], c[1], z1), 0.032 * S, { mat: "sinew", tone: "hi", sys: "skein", F, steps: 24, ribs: { count: 12, twist: 0.9 * sx, phase: tw } });
    }
  }
}

function drawProp(B) {
  // Lower bar from the base pin, upper bar from the bracket under the case, side by side.
  const base = PROP_BASE;
  const top = Lm(0.0425, 0.63, 0.035);
  const dir = unit(sub([0, top[1], top[2]], [0, base[1], base[2]]));
  const Lp = len(sub([0, top[1], top[2]], [0, base[1], base[2]]));
  const p0 = W(...base);
  const p1 = W(base[0], base[1] + dir[1] * PROP_BAR, base[2] + dir[2] * PROP_BAR);
  const holes = [];
  for (let s = 0.08; s < PROP_BAR - 0.03; s += 0.05) holes.push(B.at(W(0.08, base[1] + dir[1] * s, base[2] + dir[2] * s)));
  B.beam("prop.lower", sub(p0, mul(dir, 0.02 * S)), p1, { w: 0.03 * S, h: 0.025 * S, up: [1, 0, 0], mat: "oak", tone: "hi", over: B.D(holes, { size: 0.45, tone: "lo" }) });
  const q0 = W(top[0], top[1], top[2]);
  const q1 = W(top[0], top[1] - dir[1] * PROP_BAR, top[2] - dir[2] * PROP_BAR);
  B.beam("prop.upper", add(q0, mul(dir, 0.02 * S)), q1, { w: 0.03 * S, h: 0.025 * S, up: [1, 0, 0], mat: "oak", tone: "hi" });
  // Locking pin through both bars, in the middle of their overlap.
  const sMid = Lp / 2;
  const pin = [0.08, base[1] + dir[1] * sMid, base[2] + dir[2] * sMid];
  B.cyl("prop.lock", W(...pin), W(pin[0] + 0.01, pin[1], pin[2]), 0.011 * S, { mat: "iron", tone: "hi" });
  B.cyl("prop.toppin", W(0.055, top[1], top[2]), W(0.064, top[1], top[2]), 0.01 * S, { mat: "iron", tone: "hi" });
}

// Hubs on the pentagons and the crank bosses: turned once (they look the same at any angle).
function drawHubs(B) {
  for (const sx of [-1, 1]) {
    for (const [nm, yc] of [["f", YFS], ["r", YRS]]) {
      const hx0 = sx > 0 ? 0.138 : -0.152;
      rod(B, `hub.${nm}${sx}`, [hx0, yc, ZA], [hx0 + 0.014, yc, ZA], 0.024, { mat: "iron", tone: "hi", sys: "sprocket", steps: 20, layer: sx > 0 ? 0 : -1, faceRing: [{ s: sx > 0 ? 0.014 * S : 0, r: 0.014 * S }] });
    }
    const x0 = sx * 0.355, x1 = sx * 0.385;
    rod(B, `crank.boss${sx}`, [Math.min(x0, x1), YRS, ZA], [Math.max(x0, x1), YRS, ZA], 0.03, { mat: "iron", tone: "hi", sys: "sprocket", steps: 20, faceRing: [{ s: sx > 0 ? 0.03 * S : 0, r: 0.016 * S }] });
  }
}

// Pentagonal sprockets, the cranks and the ratchet: everything that turns with the windlass.
function drawSprockets(B, A, ek) {
  for (const sx of [-1, 1]) {
    for (const [nm, yc] of [["f", YFS], ["r", YRS]]) {
      const step = rad(sx > 0 ? 1 : 3);
      const q = Math.round(mod(A, D72) / step);
      pcache(B, `pent.${nm}${sx}|${ek}`, q, (C) => {
        const a = q * step;
        const pent = Array.from({ length: 5 }, (_, j) => [RP * S * Math.cos(a + j * D72), RP * S * Math.sin(a + j * D72)]);
        const x0 = sx > 0 ? 0.118 : -0.138;
        const face = L(sx > 0 ? 0.138 : -0.118, yc, ZA);
        const bolts = pent.map(([u, v]) => C.at(add(face, add(mul(Ld(0, 1, 0), u * 0.62), mul(Ld(0, 0, 1), v * 0.62)))));
        C.prism(`pent.${nm}${sx}`, FX(x0, yc, ZA), pent, 0, 0.02 * S, { mat: "oak", tone: "hi", sys: "sprocket", layer: sx > 0 ? 0 : -1, over: sx > 0 ? C.D(bolts, { size: 0.5 }) : "" });
      });
    }
  }
  // Cranks, one each side, opposed.
  for (const sx of [-1, 1]) {
    const q = Math.round(mod(A, TAU) / rad(2));
    pcache(B, `crank${sx}|${ek}`, q, (C) => {
      const g = q * rad(2) + (sx > 0 ? 0 : Math.PI);
      const r = [0, Math.cos(g), Math.sin(g)];
      const xm = sx * 0.37;
      const end = [xm, YRS + r[1] * CRANK_R, ZA + r[2] * CRANK_R];
      const gx0 = sx * 0.382, gx1 = sx * 0.51;
      composite(C, `crank${sx}`, (D) => {
        const web = () => bar(D, `crank.web${sx}`, [xm, YRS + r[1] * 0.03, ZA + r[2] * 0.03], end, 0.045, 0.024, [1, 0, 0], { mat: "iron", tone: "hi" });
        const grip = () => {
          rod(D, `crank.grip${sx}`, [gx0, end[1], end[2]], [gx1, end[1], end[2]], 0.018, { mat: "oak", tone: "hi", seams: [0.03 * S, 0.1 * S] });
          rod(D, `crank.knob${sx}`, [gx1, end[1], end[2]], [gx1 + sx * 0.012, end[1], end[2]], 0.022, { mat: "oak", tone: "hi" });
        };
        if (sx > 0) (web(), grip());
        else (grip(), web());
      }, { sys: "sprocket", axes: [[1, 0, 0], Ld(0, r[1], r[2]), Ld(0, -r[2], r[1])] });
    });
  }
  // Ratchet on the near side of the windlass; the pawl rides each tooth and drops.
  const teeth = 12;
  const qr = Math.round(mod(A, TAU / teeth) / rad(1));
  pcache(B, `ratchet|${ek}`, qr, (C) => {
    const a = qr * rad(1);
    C.toothed("ratchet", FX(0.29, YRS, ZA), polySaw(0.052 * S, 0.066 * S, teeth, a), 0, 0.018 * S, { mat: "iron", tone: "hi", sys: "sprocket" });
    const tooth = mod((a / TAU) * teeth, 1);
    const lift = 0.011 * tooth;
    const piv = [0.299, 0.683, 0.215];
    const ang = rad(28);
    const tip = [0.299, YRS + Math.cos(ang) * (0.066 + lift), ZA + Math.sin(ang) * (0.066 + lift)];
    bar(C, "pawl", piv, tip, 0.012, 0.014, [1, 0, 0], { mat: "iron", tone: "hi", sys: "sprocket" });
  });
}

// Flat links: alternate links in two planes; the master link (with the lug) in a third.
// A link on a straight run only translates, so it is a sprite; links on a pentagon are drawn in place.
const TL = 0.0065;
const LINKP = [[-0.012, -0.011], [PL + 0.012, -0.011], [PL + 0.012, 0.011], [-0.012, 0.011]].map(([u, v]) => [u * S, v * S]);
function linkSolid(B, id, sx, layer, p, q, lit) {
  const dy = q[0] - p[0], dz = q[1] - p[1];
  const l = Math.hypot(dy, dz) || 1;
  const xin = XCH + layer * TL;
  const x0 = sx > 0 ? xin : -(xin + TL);
  const F = { o: L(x0, p[0], p[1]), a: [1, 0, 0], u: Ld(0, dy / l, dz / l), v: Ld(0, -dz / l, dy / l) };
  const face = x0 + TL;
  const over = B.D([B.at(L(face, p[0], p[1])), B.at(L(face, q[0], q[1]))], { size: 0.55 });
  B.prism(id, F, LINKP, 0, TL * S, { mat: "iron", tone: "hi", sys: "chain", over, lit });
}
// The lug: a long pin at the master link's leading joint, a head outside and a roller in the yoke's slot.
const lugHead = (B, sx, p) => {
  const xo = XCH + 3 * TL;
  rod(B, `lug.head${sx}`, [sx * xo, p[0], p[1]], [sx * (xo + 0.007), p[0], p[1]], 0.01, { mat: "iron", tone: "hi" });
};
function lugInner(B, sx) {
  const parts = [() => rod(B, `lug.roller${sx}`, [sx * 0.093, 0, 0], [sx * 0.107, 0, 0], 0.0145, { mat: "bronze", tone: "hi" }), () => rod(B, `lug.shaft${sx}`, [sx * 0.107, 0, 0], [sx * XCH, 0, 0], 0.0065, { mat: "iron", tone: "hi" })];
  (sx > 0 ? parts : parts.reverse()).forEach((f) => f());
}
const SAX = () => [[1, 0, 0], Ld(0, 1, 0), Ld(0, 0, 1)];
function drawChain(B, M, A, ek) {
  const pins = chainPins(A);
  const at0 = L(0, 0, 0);
  const off = (y, z) => sub(L(0, y, z), at0);
  // Near chain: one part per link (it is in full view).
  for (let n = 0; n < NL; n++) {
    const p = pins[n];
    const q = pins[(n + 1) % NL];
    const layer = n === NL - 1 ? 2 : n % 2;
    const lit = n === NL - 1;
    const id = `link1.${n}`;
    if (Math.abs(q[1] - p[1]) < 1e-7) {
      const s = q[0] < p[0] ? p : q;
      sprite(B, M, id, [ek, layer], off(s[0], s[1]), (C) => linkSolid(C, id, 1, layer, [0, 0], [-PL, 0], lit));
    } else {
      // On a pentagon: the link is fixed by its sprocket and the angle of its leading pin.
      const front = p[0] < (YFS + YRS) / 2;
      const yc = front ? YFS : YRS;
      const qa = Math.round(mod(Math.atan2(p[1] - ZA, p[0] - yc), TAU) / rad(1)) % 360;
      pcache(B, `arc${front ? "f" : "r"}${layer}|${ek}`, qa, (C) => {
        const a = qa * rad(1);
        const p0 = [yc + RS * Math.cos(a), ZA + RS * Math.sin(a)];
        const p1 = [yc + RS * Math.cos(a + D72), ZA + RS * Math.sin(a + D72)];
        linkSolid(C, "arc", 1, layer, p0, p1, lit);
      }, id);
      plain(M, id);
    }
  }
  msprite(B, M, "lughead1", [ek], off(pins[0][0], pins[0][1]), (C) => lugHead(C, 1, [0, 0]), { sys: "chain", axes: SAX() });
  // Far chain, behind the case: a band through its pins (it shows only from low or rear views).
  const y0 = YFS - RS - 0.015, y1 = YRS + RS + 0.015, z0 = ZA - RS - 0.015, z1 = ZA + RS + 0.015;
  const box = [];
  for (const x of [-0.166, -0.139]) for (const y of [y0, y1]) for (const z of [z0, z1]) box.push(L(x, y, z));
  const band = pins.map(([y, z]) => B.at(L(-0.145, y, z)));
  const dpath = k.pathOf(band, true);
  const wpx = (w) => (w * S * B.KS).toFixed(2);
  const svg = `<path class="iso-line" data-tone="mid" style="stroke-width:${wpx(0.024)}px;stroke-linejoin:round;fill:none" d="${dpath}"/><path class="iso-line" data-tone="faint" style="stroke-width:${wpx(0.012)}px;stroke-linejoin:round;fill:none" d="${dpath}"/>` + B.D(band, { size: 0.55, tone: "hi" });
  B.raw("chain-1", svg, shapeOf(box, { axes: SAX(), edges: SAX() }), { sys: "chain", mat: "iron", layer: -1 });
  for (const sx of [-1, 1]) msprite(B, M, `lug${sx}`, [ek], off(pins[0][0], pins[0][1]), (C) => lugInner(C, sx), { sys: "chain", axes: SAX(), layer: sx > 0 ? 0 : -1 });
}

// The slider at the reference position (claw at y = 0), in rigid assemblies moved along the case:
// body; claw with cheeks and pin; latch and dog; cam pin; the two slotted yokes.
function sliderBody(B, y0, y1, nose) {
  const grooveLines = B.L([-0.011, 0.011].map((x) => k.pathOf([B.at(L(x, y0, ZST)), B.at(L(x, y1, ZST))])).join(""), { tone: "lo" });
  if (nose) box(B, "slider.nose", -0.06, 0.06, -0.532, -0.52, 0.19, ZST, { mat: "iron", tone: "hi" });
  box(B, "slider", -0.06, 0.06, y0, y1, 0.19, ZST, { mat: "oak", tone: "hi", inner: grooveLines, over: B.D([-0.4, -0.2, 0.0, 0.12].filter((d) => d > y0 && d < y1).map((d) => B.at(L(0.06, d, 0.212))), { size: 0.45 }) });
}
function clawAsm(B, claw) {
  const cheek = (sx) => box(B, `claw.cheek${sx}`, sx > 0 ? 0.0105 : -0.022, sx > 0 ? 0.022 : -0.0105, 0.02, 0.05, ZST, ZST + 0.042, { mat: "iron", tone: "hi" });
  const pin = (sx) => rod(B, `claw.pin${sx}`, [sx * 0.022, 0.035, ZST + 0.03], [sx * 0.027, 0.035, ZST + 0.03], 0.005, { mat: "iron", tone: "hi" });
  pin(-1);
  cheek(-1);
  // Claw: finger and body, turned about the pin (open lifts the finger).
  const th = -claw * rad(22);
  const pv = [0.035, ZST + 0.03];
  const rot = ([y, z]) => {
    const dy = y - pv[0], dz = ZST + z - pv[1];
    return [pv[0] + dy * Math.cos(th) - dz * Math.sin(th), pv[1] + dy * Math.sin(th) + dz * Math.cos(th)];
  };
  const toPoly = (pts) => pts.map((p) => {
    const [y, z] = rot(p);
    return [y * S, z * S];
  });
  const CF = { o: L(-0.009, 0, 0), a: [1, 0, 0], u: Ld(0, 1, 0), v: Ld(0, 0, 1) };
  B.prism("claw.body", CF, toPoly([[-0.018, 0.024], [-0.004, 0.02], [0.08, 0.02], [0.08, 0.034], [0.035, 0.044], [-0.012, 0.036]]), 0, 0.018 * S, { mat: "iron", tone: "hi", over: B.D([B.at(L(0.009, ...rot([0.035, 0.03])))], { size: 0.6 }) });
  B.prism("claw.finger", CF, toPoly([[-0.018, 0.001], [-0.004, 0.001], [-0.004, 0.02], [-0.018, 0.024]]), 0, 0.018 * S, { mat: "iron", tone: "hi" });
  cheek(1);
  pin(1);
}
// Latch on the near side: its dog under the claw's tail; the trip peg turns it back.
function latchAsm(B, latchA) {
  const la = -latchA * rad(26);
  const lp = [0.1, ZST - 0.02];
  const lr = ([y, z]) => {
    const dy = y - lp[0], dz = z - lp[1];
    return [lp[0] + dy * Math.cos(la) - dz * Math.sin(la), lp[1] + dy * Math.sin(la) + dz * Math.cos(la)];
  };
  const top = lr([0.078, ZST + 0.008]);
  const bot = lr([0.104, ZST - 0.034]);
  const dog0 = lr([0.075, ZST + 0.008]);
  bar(B, "latch.dog", [0.0, dog0[0], dog0[1]], [0.062, dog0[0], dog0[1]], 0.01, 0.012, [0, 1, 0], { mat: "iron", tone: "hi" });
  bar(B, "latch", [0.066, top[0], top[1]], [0.066, bot[0], bot[1]], 0.012, 0.008, [1, 0, 0], { mat: "iron", tone: "hi" });
  rod(B, "latch.pin", [0.07, lp[0], lp[1]], [0.074, lp[0], lp[1]], 0.0045, { mat: "iron", tone: "hi" });
}
// Slotted yoke hanging from the slider's tail; the lug rides between its bars.
function yokeAsm(B, sx) {
  const lugY = D_LUG;
  const x0 = sx > 0 ? 0.092 : -0.106, x1 = sx > 0 ? 0.106 : -0.092;
  box(B, `yoke.tie${sx}`, x0, x1, lugY - 0.033, lugY + 0.033, -0.014, -0.002, { mat: "iron", tone: "hi" });
  box(B, `yoke.aft${sx}`, x0, x1, lugY + 0.0155, lugY + 0.033, -0.002, 0.214, { mat: "iron", tone: "hi" });
  box(B, `yoke.fore${sx}`, x0, x1, lugY - 0.033, lugY - 0.0155, -0.002, 0.214, { mat: "iron", tone: "hi" });
  box(B, `yoke.bridge${sx}`, sx > 0 ? 0.06 : -0.106, sx > 0 ? 0.106 : -0.06, lugY - 0.033, lugY + 0.033, 0.214, ZST - 0.002, { mat: "iron", tone: "hi", over: B.D([B.at(L(sx * 0.083, lugY - 0.02, ZST - 0.002)), B.at(L(sx * 0.083, lugY + 0.02, ZST - 0.002))], { size: 0.45 }) });
}
function drawSlider(B, M, pose, ek) {
  const d = mul(Ld(0, pose.yc, 0), S);
  const ax = SAX();
  msprite(B, M, "sl.bodyF", [ek], d, (C) => sliderBody(C, -0.52, -0.18, true), { sys: "slider", axes: ax });
  msprite(B, M, "sl.bodyR", [ek], d, (C) => sliderBody(C, -0.18, 0.17, false), { sys: "slider", axes: ax });
  msprite(B, M, "sl.claw", [ek, pose.claw.toFixed(3)], d, (C) => clawAsm(C, pose.claw), { sys: "slider", axes: ax });
  msprite(B, M, "sl.latch", [ek, pose.latch.toFixed(3)], d, (C) => latchAsm(C, pose.latch), { sys: "trigger", axes: ax });
  msprite(B, M, "sl.cam", [ek], d, (C) => rod(C, "campin", [0.035, PIN_OFF, ZST], [0.035, PIN_OFF, ZD - RD + 0.008], 0.0045, { mat: "iron", tone: "hi" }), { sys: "magazine", axes: ax });
  for (const sx of [-1, 1]) msprite(B, M, `sl.yoke${sx}`, [ek], d, (C) => yokeAsm(C, sx), { sys: "slider", axes: ax });
}

// The drum (a plain front section and the grooved section under the hopper) with its helical cam groove.
function drumPoly(delta) {
  const r = RD * S, ri = (RD - 0.032) * S;
  const beta = Math.PI / 2 - delta;
  const half = Math.asin(0.017 / RD);
  const halfIn = Math.asin(0.017 / (RD - 0.032 + 0.004));
  const pts = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const a = beta + half + (i / n) * (TAU - 2 * half);
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  pts.push([ri * Math.cos(beta - halfIn), ri * Math.sin(beta - halfIn)]);
  pts.push([ri * Math.cos(beta + halfIn), ri * Math.sin(beta + halfIn)]);
  return pts;
}
function drawDrum(B, delta) {
  // Helix: where the groove passes the pin for each slider position, at the drum's present turn.
  const V = B.V;
  const zw = Ld(0, 0, 1);
  const runs = [];
  let run = [];
  for (let y = YD0 + 0.01; y <= YD1 - 0.005; y += 0.01) {
    const g = -Math.PI / 2 + Math.PI * smoothstep(Y_LO, Y_HI, y - PIN_OFF) - delta;
    const nw = [Math.cos(g), zw[1] * Math.sin(g), zw[2] * Math.sin(g)];
    if (dot(nw, V) > 0.12) run.push(B.at(L(RD * Math.cos(g), y, ZD + RD * Math.sin(g))));
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  const helix = B.L(runs.filter((r) => r.length > 1).map((r) => k.pathOf(r)).join(""), { tone: "mid" });
  const FF = { o: L(0, YD0, ZD), a: Ld(0, 1, 0), u: add(mul([1, 0, 0], Math.cos(delta)), mul(zw, -Math.sin(delta))), v: add(mul([1, 0, 0], Math.sin(delta)), mul(zw, Math.cos(delta))) };
  B.cyl("drum.front", L(0, YD0, ZD), L(0, YB0, ZD), RD * S, { mat: "oak", tone: "hi", sys: "magazine", F: FF, steps: 24, ribs: { count: 10, phase: 0 }, inner: helix });
  B.toothed("drum.groove", FY(0, YB0, ZD), drumPoly(delta), 0, (YD1 - YB0) * S, { mat: "oak", tone: "hi", sys: "magazine" });
}

// Bolts: in the hopper, in the drum's groove, falling to the trough, riding the slider, on the string.
function drawBolts(B, M, pose, ek) {
  const st = M.state;
  const am = M.ammo;
  const zw = Ld(0, 0, 1);
  const r = am.shaft * 1.3;
  const shift = (x, y, z) => add(add(mul([1, 0, 0], x * S), mul(Ld(0, 1, 0), y * S)), mul(zw, z * S));
  // Hopper stack: each bolt rests on the one below; after a pickup the stack falls one pitch.
  const fall = st.pickT < 0.12 ? Math.max(0, PITCH - 0.5 * 9.81 * st.pickT * st.pickT) : 0;
  for (let i = 0; i < st.hopper; i++) {
    const z = ZD + RD + 0.008 + i * PITCH;
    msprite(B, M, `hop${i}`, [ek, am.id, i], shift(0, 0, fall), (C) => boltAt(C, `hop${i}`, M, am, NOCK, 0, z, { roll: 0.5 + (i % 2) * 1.05 }), { sys: "magazine", axes: SAX(), sort: true, box: [-r, r, NOCK - BOLT_L, NOCK, z - r, z + r] });
  }
  // The drum's bolt: carried round in the groove; painted over the drum while the groove faces us.
  if (st.drum) {
    const d = pose.delta;
    let dz = 0.03 * Math.cos(d);
    if (st.pickT < FALL_T) dz = Math.max(dz, RD + 0.008 - 0.5 * 9.81 * st.pickT * st.pickT);
    const facing = dot(add(mul([1, 0, 0], Math.sin(d)), mul(zw, Math.cos(d))), B.V) > 0;
    msprite(B, M, "drumbolt", [ek, am.id], shift(0.03 * Math.sin(d), 0, dz), (C) => boltAt(C, "drumbolt", M, am, NOCK, 0, ZD, { roll: 0.5 }), { sys: "magazine", axes: SAX(), sort: true, box: [-r, r, NOCK - BOLT_L, NOCK, ZD - r, ZD + r], after: facing ? ["drum.groove"] : undefined, before: facing ? undefined : ["drum.groove"] });
  }
  // The loaded bolt: falling from the drum, riding the slider, or on the string in the release.
  const zb = ZST + am.shaft + 0.0005;
  let nock = null, z = zb;
  if (pose.rel) nock = pose.rel.nock;
  else if (st.trough) {
    if (st.landY === null) {
      nock = NOCK;
      z = Math.max(zb, ZD - 0.03 - 0.5 * 9.81 * st.dropT * st.dropT);
    } else nock = pose.yc - st.boltOff;
  }
  if (nock !== null) msprite(B, M, "loaded", [ek, am.id], shift(0, nock, z - zb), (C) => boltAt(C, "loaded", M, am, 0, 0, zb, { roll: 0.5 + Math.PI }), { sys: "slider", axes: SAX(), sort: true, box: [-r, r, -BOLT_L, 0, zb - am.shaft, zb + r] });
}

function drawRack(B, M) {
  rackKind.forEach((kind, i) => {
    const a = AMMO[kind];
    const [x, y, z] = rackSlot(i);
    looks.bolt(B, `rack${i}`, W(x, y + BOLT_L, z + (a.shaft - 0.008)), [0, -1, 0], BOLT_L * S, a.shaft * S, { fire: a.fire, heavy: a.heavy, vane: 2.2, roll: 0.5, lit: M.ammo.id === a.id, layer: -1 });
  });
}

// Reload: bolts fly from the rack to the top of the hopper, one after another.
function drawReload(B, M) {
  const st = M.state;
  const r = st.reload;
  const kind = AMMO.indexOf(M.ammo);
  const slot = rackSlot(kind * 2 + 1);
  for (let i = r.done; i < r.n && i < r.done + 3; i++) {
    const t0 = i * 0.24;
    const u = clamp((r.t - t0) / 0.55, 0, 1);
    if (u <= 0) continue;
    const from = [slot[0], slot[1] + BOLT_L, slot[2]];
    const toL = Lm(0, NOCK, HOP.z1 + 0.06);
    const p = lerp(from, toL, ease(u));
    p[2] += Math.sin(u * Math.PI) * 0.35;
    looks.bolt(B, `fly${i - r.done}`, W(...p), Ld(0, -1, 0), BOLT_L * S, M.ammo.shaft * S, { fire: M.ammo.fire, heavy: M.ammo.heavy, vane: 2.2, roll: 0.5, layer: 3 });
  }
}

// Strobe: the lug's closed path round the pentagons, and ghosts of arms and string through the release.
function drawStrobe(B, M, pose) {
  const st = M.state;
  const pts = [];
  for (let i = 0; i <= TN; i += 12) pts.push(B.at(L(0.162, TBL.ys[i], TBL.zs[i])));
  let svg = `<path class="iso-line" data-tone="lo" d="${k.pathOf(pts, true)}"/>`;
  const dots = [];
  for (let s = 1; s <= 8; s++) {
    const t = tbl(pose.A - s * 0.12);
    dots.push(B.at(L(0.162, t.y, t.z)));
  }
  svg += B.D(dots, { size: 1.0, tone: "mid" });
  const sim = st.sim;
  if (sim && M.shot) {
    const lines = [];
    const nocks = [];
    for (let t = 0; t <= Math.min(M.shot.t, sim.tRel + 0.02); t += Math.max(0.0015, sim.tRel / 9)) {
      const f = sim.rec.at(t);
      for (const sx of [-1, 1]) {
        const c = [sx * XK, YK, ZST];
        const tip = [c[0] + sx * Math.cos(f.phi) * LA, c[1] + Math.sin(f.phi) * LA, ZST];
        lines.push(k.pathOf([B.at(L(...c)), B.at(L(...tip)), B.at(L(0, f.q, ZST))]));
      }
      if (t < sim.tRel) nocks.push(B.at(L(0, f.nock, ZBOLT)));
    }
    svg += B.L(lines.join(""), { tone: "lo" }) + B.D(nocks, { size: 1.4, tone: "hi" });
  }
  B.marks("strobe", svg, [L(0, 0.2, 0.4)], { r: 300, layer: 6 });
}

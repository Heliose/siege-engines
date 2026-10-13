// Gastraphetes, the "belly-bow" (Zopyrus of Tarentum, c. 400–375 BC; Heron, Belopoeica; Biton).
// Authored in metres (S converts to world units). The weapon lies in a tilting oak cradle on a
// trestle: the slider's nose is braced on a ground block at the cradle's front, and a
// lead-weighted bell-crank press bears on the belly rest exactly as the archer leaned on it.
//
// TRUTH
//   Composite bow (horn, wood, sinew): 1.31 m tip to tip braced, brace height 0.18 m, working
//   limbs 0.45 m bending uniformly, stiff recurved ears 0.17 m. Its shape at any draw is solved
//   from an inextensible string (half-length 0.66 m) that rides up over the slider top.
//   Case (syrinx) 1.40 m with the belly rest; slider (diostra) 0.95 m in the dovetail on top.
//   Two racks (katoches), pitch 35 mm: 12 notches = 0.42 m full draw. Pawls (katakleides) on the
//   slider drop into each notch and stop it springing forward.
//   Draw force F(d) = F_full (d / 0.42)^0.9, F_full 600–1000 N (default 850 N): roughly linear.
//   Stored energy E = F_full 0.42 / 1.9 = 133–221 J (188 J at 850 N).
//   Release: (m + m_v) d'' = −0.9 F(d), virtual mass m_v = 0.045 kg (limbs + string), 10 %
//   hysteresis, so efficiency = 0.9 m / (m + m_v) ≈ 0.55 (70 g) … 0.64 (110 g).
//   Bolt 70 g: 54 m/s at 850 N, 59 m/s at 1000 N; heavy bodkin 110 g: 47 m/s; fire arrow 85 g:
//   51 m/s. Power stroke ≈ 12 ms; then the limbs ring at ~30 Hz against the string and settle.
//   Flight with quadratic drag (shaft + fletching Cd·A): bolt max ≈ 200–225 m at 41–42°,
//   heavy ≈ 160–180 m, fire arrow (tow drag) ≈ 115–125 m. 120 m palisade at about 14–15°.
//   Press: 83.5 kg lead weight on a bell crank 0.75 / 0.60 m → 1024 N on the belly rest, which
//   is what a 70 kg man leaning his weight (≈ 700 N) and pushing gives; a check rope round a
//   bollard pays the press out notch by notch and hauls it back (a link lets it pull the case).
//   Aiming: the whole cradle turns on its trunnion, 0–40°, held by a pinned quadrant arm.
//
// PARTS (121 machine parts + plinth + ready rack of 7 bolts)
//   Trestle: 2 cross sills, 2 sole beams, 2 posts, 2 front braces, 2 rear knees, 2 washers,
//     3 axle stubs, 2 linchpins, 2 inner axle pieces, quadrant (degree arc, 2 brackets).
//   Front rest: crossbar, hide pad, 2 legs, stretcher, 2 feet.
//   Cradle: floor beam, 2 cheeks, trunnion block, press sill, granite ground block, iron face
//     plate, quadrant hub, arm and pin, bollard + cap, rope turns, rope coil, check rope.
//   Press: 2 posts, 2 braces, axle, 2 corner blocks, 2 down-arms (banded), 2 rear arms,
//     2 pad bars, hide pad, lead weight (2 bands), 2 weight bars, link strap.
//   Case: front block, bridge, main body (3 iron bands), 2 racks (sawtooth), belly rest
//     (5 segments), belly eye.
//   Bow: 2 riser stubs, 2 grip lashings, 2 × (2 working-limb bars + ear) bent from the string
//     model every frame, 2 horn nocks, string (2 halves).
//   Slider: nose shoe, body, saddle front, saddle rear, 2 slot walls, slot floor, 2 iron cheeks,
//     2 pawl lugs, 2 pawls (pins drawn on them).
//   Trigger: claw hub, 2 hooked fingers, tail, 2 iron cheeks, 2 trigger lugs, trigger lever,
//     handle knob.
//   Bolt on the slider; ready rack: base, 2 end boards, 7 bolts (3 bolts, 2 bodkins, 2 fire).
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { add, sub, mul, unit, lerp, clamp, rad, deg, ease, smoothstep, fmt, fmtInt } from "../engine/vec.js";
import * as PH from "../engine/physics.js";
import * as looks from "../engine/looks.js";
import { polyRect, extrudeAlong } from "../engine/geo.js";
import { shapeOf } from "../engine/scene.js";

const U = 0.008;
const S = 1 / U;
const w = (x, y, z) => [x * S, y * S, z * S];
const pl = (x0, x1, y0, y1, r = 0.6) => ({ x: x0 * S, y: y0 * S, w: (x1 - x0) * S, d: (y1 - y0) * S, r });

// ---------------- dimensions (metres, cradle frame; the cradle tilts about the trunnion) ----
const Y_T = 0.45, Z_T = 0.55; // trunnion axis (along x)
const Y_F = -0.85; // front rest
const Z_FL0 = 0.6, Z_FL = 0.66; // cradle floor
const Z_C1 = 0.75; // case top (case 0.66–0.75, x ±0.05)
const Z_S1 = 0.8; // slider top (slider 0.75–0.80)
const Z_AX = 0.804; // bolt axis and string centre on the slider
const Z_BOW = 0.733; // bow plane
const Y_N = -1.14; // slider nose, braced on the ground block
const S_HOOK = 0.875; // string held by the claw, measured along the slider from its nose
const Y_HOOK = Y_N + S_HOOK;
const PITCH = 0.035;
const D_FULL = 0.42;
const H_T = 0.007; // tooth height
const Z_ROOT = 0.738; // tooth roots (rack 0.705–0.738, teeth to 0.745)
const S_PIV = 0.84, Z_PIV = 0.788, PAWL_L = 0.066; // pawl pivot on the slider
const S_CP = 0.888, Z_CP = 0.792; // claw pin
const S_TP = 0.938, Z_TP = 0.808; // trigger pin
const G_SLIP = 0.3, G_OPEN = 0.7; // claw angle where the string slips, fully open
const T_UNLATCH = 0.36; // the trigger lever's travel before the claw is free

// ---------------- the bow ----------------
const BOW = { riser: 0.07, Lw: 0.45, Le: 0.17, kb: 1.3, ke: 3.2 };
const DZ_STR = Z_AX - Z_BOW;
const NW = 10, NE = 4; // working-limb and ear segments
const KNOTS = Array.from({ length: NW + 1 }, (_, i) => (i / NW) * BOW.Lw).concat(Array.from({ length: NE }, (_, i) => BOW.Lw + ((i + 1) / NE) * BOW.Le));
// Knots of one limb (x > 0) in the bow plane: [x, u (toward the string), angle], for an added
// working-limb curvature a (rad/m). The ears are stiff and turn with the limb's end.
function limbPath(a) {
  const out = [[BOW.riser, 0, 0]];
  let x = BOW.riser, u = 0, psi = 0, s = 0;
  for (let i = 1; i < KNOTS.length; i++) {
    while (s < KNOTS[i] - 1e-9) {
      const h = Math.min(0.006, KNOTS[i] - s);
      const kk = s + h / 2 < BOW.Lw ? BOW.kb + a : -BOW.ke;
      const p2 = psi + (kk * h) / 2;
      x += Math.cos(p2) * h;
      u += Math.sin(p2) * h;
      psi += kk * h;
      s += h;
    }
    out.push([x, u, psi]);
  }
  return out;
}
const TIP0 = limbPath(0)[KNOTS.length - 1];
const U_BR = TIP0[1]; // brace height (string centre behind the grip)
const LH = Math.hypot(TIP0[0], DZ_STR); // string half-length
const YB0 = Y_HOOK - U_BR; // grip position when the claw holds the string at brace
// Draw (string centre behind brace) for each bend a; a < 0 is the limbs overshooting forward.
const BOW_TABLE = (() => {
  const as = [], ds = [];
  for (let a = -1.4; a <= 1.6 + 1e-9; a += 0.005) {
    const T = limbPath(a)[KNOTS.length - 1];
    const h2 = LH * LH - DZ_STR * DZ_STR - T[0] * T[0];
    as.push(a);
    ds.push(a <= 0 ? T[1] - U_BR : T[1] + Math.sqrt(Math.max(0, h2)) - U_BR);
  }
  return { as, ds };
})();
function bendOf(d) {
  const { as, ds } = BOW_TABLE;
  if (d <= ds[0]) return as[0];
  if (d >= ds[ds.length - 1]) return as[as.length - 1];
  let lo = 0, hi = ds.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (ds[m] <= d) lo = m;
    else hi = m;
  }
  return as[lo] + ((as[hi] - as[lo]) * (d - ds[lo])) / (ds[hi] - ds[lo] || 1);
}
const forceAt = (d, Ff) => (d > 0 ? Ff * Math.pow(d / D_FULL, 0.9) : 0);
const energyAt = (d, Ff) => (d > 0 ? ((Ff * D_FULL) / 1.9) * Math.pow(d / D_FULL, 1.9) : 0);
const MV = 0.045, HYST = 0.9, K_OVER = 20;

// ---------------- the press ----------------
const U_BELLY = 1.3; // centre of the belly rest's rear face, along the case from the grip
const R_PAD = 0.034;
const FW = 0.11; // cradle floor half-width
const PX = 0.4, LX = 0.3; // press posts and lever plates
const padY = (sl) => YB0 - sl + U_BELLY + R_PAD;
const LEV_Y = (padY(0) + padY(D_FULL)) / 2;
const RF = 0.6, RW = 0.75;
const B_MAX = Math.asin((padY(0) - LEV_Y) / RF);
const LEV_Z = 0.7715 + RF * Math.cos(B_MAX);
const LEAD = [0.22, 0.18, 0.186]; // 83.5 kg of lead
const W_KG = LEAD[0] * LEAD[1] * LEAD[2] * 11340;
const THRUST = (W_KG * PH.GRAVITY * RW) / RF;
const betaOf = (sl) => Math.asin(clamp((LEV_Y - padY(sl)) / RF, -1, 1));

// ---------------- ratchet ----------------
const PAWL_DS0 = Math.sqrt(PAWL_L * PAWL_L - (Z_PIV - Z_ROOT - 0.0015) ** 2);
const U_TIP0 = Y_N + S_PIV - PAWL_DS0 - YB0; // pawl tip on the case at slide 0
const RACK_U = [U_TIP0 - 0.018, U_TIP0 + 12 * PITCH + 0.024];

// ---------------- the ready rack ----------------
const RACK = [["bolt", 0.47], ["bolt", 0.51], ["bolt", 0.55], ["heavy", 0.6], ["heavy", 0.645], ["fire", 0.7], ["fire", 0.745]];
const RACK_Z = 0.15, RACK_TAIL = -0.76;

// The cradle pose: rotate a cradle point (metres) about the trunnion by th (front up).
const tiltPt = (p, th) => {
  const c = Math.cos(th), s = Math.sin(th);
  const dy = p[1] - Y_T, dz = p[2] - Z_T;
  return [p[0], Y_T + dy * c + dz * s, Z_T - dy * s + dz * c];
};
const tiltDir = (d, th) => {
  const c = Math.cos(th), s = Math.sin(th);
  return [d[0], d[1] * c + d[2] * s, -d[1] * s + d[2] * c];
};

// Drawing helpers bound to one tilt: everything in metres, cradle frame.
function ctx(B, th) {
  const P = (p) => mul(tiltPt(p, th), S);
  const Dv = (d) => tiltDir(d, th);
  const Fr = (F) => ({ o: P(F.o), a: Dv(F.a), u: Dv(F.u), v: Dv(F.v) });
  const sc = (o = {}) => {
    const out = { ...o };
    if (o.bands) out.bands = o.bands.map((b) => ({ at: b.at * S, w: (b.w ?? 0.02) * S, t: (b.t ?? 0.004) * S }));
    if (o.nails) out.nails = o.nails.map((n) => ({ ...n, s: n.s * S }));
    if (o.pegs) out.pegs = o.pegs.map((n) => ({ ...n, s: n.s * S }));
    return out;
  };
  const C = {
    B,
    th,
    P,
    Dv,
    beam: (id, a, b, wd, ht, up, o = {}) => B.beam(id, P(a), P(b), { ...sc(o), w: wd * S, h: ht * S, up: Dv(up) }),
    boxY: (id, x0, x1, y0, y1, z0, z1, o = {}) => C.beam(id, [(x0 + x1) / 2, y0, (z0 + z1) / 2], [(x0 + x1) / 2, y1, (z0 + z1) / 2], x1 - x0, z1 - z0, [0, 0, 1], o),
    boxX: (id, x0, x1, y0, y1, z0, z1, o = {}) => C.beam(id, [x0, (y0 + y1) / 2, (z0 + z1) / 2], [x1, (y0 + y1) / 2, (z0 + z1) / 2], y1 - y0, z1 - z0, [0, 0, 1], o),
    boxZ: (id, x0, x1, y0, y1, z0, z1, o = {}) => C.beam(id, [(x0 + x1) / 2, (y0 + y1) / 2, z0], [(x0 + x1) / 2, (y0 + y1) / 2, z1], x1 - x0, y1 - y0, [0, 1, 0], o),
    cyl: (id, p0, p1, r, o = {}) => B.cyl(id, P(p0), P(p1), r * S, o),
    ring: (id, p0, p1, r0, r1, o = {}) => B.ring(id, P(p0), P(p1), r0 * S, r1 * S, o),
    ball: (id, c, r, o = {}) => B.ball(id, P(c), r * S, o),
    prism: (id, F, poly, s0, s1, o = {}) => B.prism(id, Fr(F), poly.map(([x, y]) => [x * S, y * S]), s0 * S, s1 * S, o),
    // A non-convex profile (sawtooth rack, hooked finger) with a box proxy for the painter.
    solidX: (id, F, poly, s0, s1, o = {}) => {
      const FF = Fr(F);
      const ring = poly.map(([x, y]) => [x * S, y * S]);
      const paths = extrudeAlong(FF, ring, s0 * S, s1 * S, B.P, { convex: false });
      const pts = [];
      for (const [x, y] of ring) for (const s of [s0 * S, s1 * S]) pts.push(add(add(add(FF.o, mul(FF.a, s)), mul(FF.u, x)), mul(FF.v, y)));
      B.solid(id, paths, shapeOf(pts, { axes: [FF.a, FF.u, FF.v], edges: [FF.a, FF.u, FF.v] }), o);
    },
    rope: (id, pts, r, o = {}) => B.rope(id, pts.map(P), r * S, o),
    cord: (id, pts, o = {}) => B.cord(id, pts.map(P), o),
    turned: (id, o3, axis, profile, o = {}) => B.turned(id, G.frameAlong(P(o3), Dv(axis)), profile.map(([s, r, f]) => (f ? [s * S, r * S, f] : [s * S, r * S])), o.seams ? { ...o, seams: o.seams.map(([s, r, sl = 0]) => [s * S, r * S, sl]) } : o),
    dots: (pts, o = {}) => B.D(pts.map((p) => B.at(P(p))), o),
    line: (pts, o = {}) => B.L(k.pathOf(pts.map((p) => B.at(P(p)))), o),
    // A pin's head drawn on the face of the part it runs through: a ring and a centre dot.
    pin: (c, r, axis = [1, 0, 0]) => B.L(G.circleOf(G.frameAlong(P(c), Dv(axis)), 0, r * S, B.P, 12), { tone: "lo" }) + B.D([B.at(P(c))], { size: 0.5, tone: "hi" }),
  };
  return C;
}

// Re-emit a block of parts drawn once at slide 0, moved along the cradle by the slide: the
// SVG is translated on screen and the painter's proxy shapes in the world.
const TCACHE = new WeakMap();
function slideKeep(B, M, key, deps, sl, th, fn) {
  const scene = M.scene;
  if (!B.dynamic || !scene || B !== M.B) return fn(sl);
  let store = TCACHE.get(scene);
  if (!store) TCACHE.set(scene, (store = {}));
  const sig = JSON.stringify(deps);
  let hit = store[key];
  if (!hit || hit.sig !== sig) {
    const parts = [];
    const put = scene.put;
    scene.put = (part) => parts.push(part);
    try {
      fn(0);
    } finally {
      scene.put = put;
    }
    hit = store[key] = { sig, parts };
  }
  const off = mul(tiltDir([0, -sl, 0], th), S);
  const a = B.at([0, 0, 0]), b = B.at(off);
  const tr = `<g transform="translate(${(b[0] - a[0]).toFixed(2)} ${(b[1] - a[1]).toFixed(2)})">`;
  for (const part of hit.parts) {
    const sh = part.shape;
    scene.put({ ...part, svg: tr + part.svg + "</g>", shape: { ...sh, pts: sh.pts.map((q) => add(q, off)), c: add(sh.c, off) } });
  }
}

// ---------------- the shot ----------------
function simulate(M, D, th) {
  const Ff = M.ctrl.weight;
  const m = M.ammo.mass;
  const kLin = Ff / D_FULL;
  const Fb = (d) => (d > 0 ? HYST * forceAt(d, Ff) : K_OVER * kLin * d);
  const rec = PH.timeline();
  const push = (t, d, claw, trig) => rec.push(t, { d, claw, trig });
  // 1. The trigger lever is pulled; its catch lifts off the claw's tail.
  for (let t = 0; t < T_UNLATCH; t += 1 / 120) push(t, D, 0, smoothstep(0.04, T_UNLATCH, t));
  // 2. The string's pull on the fingers snaps the claw open until the string slips over them.
  let t = T_UNLATCH, g = 0, gd = 0;
  const torque = forceAt(D, Ff) * 0.024;
  const I_CLAW = 2.2e-5;
  push(t, D, 0, 1);
  let n = 0;
  while (g < G_SLIP) {
    const dt = 2e-6;
    gd += (torque / I_CLAW) * dt;
    g += gd * dt;
    t += dt;
    if (n++ % 25 === 0) push(t, D, g, 1);
  }
  const tRel = t;
  const clawAt = (tt) => G_SLIP + (G_OPEN - G_SLIP) * smoothstep(0, 0.006, tt - tRel);
  // 3. Power stroke: string, limbs and bolt together.
  let y = [D, 0];
  const f1 = (tt, s) => [s[1], -Fb(s[0]) / (m + MV)];
  n = 0;
  while (y[0] > 0 && t < tRel + 0.2) {
    const dt = 1e-5;
    y = PH.rk4(f1, t, y, dt);
    t += dt;
    if (n++ % 10 === 0) push(t, Math.max(0, y[0]), clawAt(t), 1);
  }
  const tSep = t;
  const v0 = -y[1];
  push(t, 0, clawAt(t), 1);
  // 4. The bolt has gone: the limbs overshoot against the string and ring down.
  const damp = 2 * 0.045 * Math.sqrt(kLin * MV * 4);
  const f2 = (tt, s) => [s[1], (-Fb(s[0]) - damp * s[1]) / MV];
  n = 0;
  const end = tSep + 0.9;
  while (t < end) {
    const dt = 2e-5;
    y = PH.rk4(f2, t, y, dt);
    t += dt;
    if (n++ % 25 === 0) push(t, y[0], clawAt(t), 1);
  }
  push(t, 0, G_OPEN, 1);
  const E = energyAt(D, Ff);
  return { rec, tRel, tSep, v0, D, th, E, ke: 0.5 * m * v0 * v0, end: t };
}

export default {
  id: "gastraphetes",
  name: "Gastraphetes",
  short: "Gastraphetes",
  unit: U,
  view: {
    W: 1000,
    H: 640,
    azimuth: 44,
    elevation: 27,
    pad: 26,
    fit: [w(-0.84, -1.64, -0.15), w(1.0, -1.64, -0.15), w(-0.84, 1.72, -0.15), w(1.0, 1.72, -0.15), w(0, -0.8, 1.95), w(0, 1.4, 1.76), w(0.66, -0.9, 1.3)],
  },
  target: { kind: "palisade", distance: 120, maxRange: 280 },
  ammo: [
    { id: "bolt", name: "Bronze-tipped bolt", look: "bolt", mass: 0.07, radius: 0.0065, shaft: 0.0065, length: 0.65, cd: 2.0, area: Math.PI * 0.0065 ** 2 },
    { id: "heavy", name: "Heavy bodkin", look: "bolt", heavy: true, mass: 0.11, radius: 0.008, shaft: 0.008, length: 0.68, cd: 2.2, area: Math.PI * 0.008 ** 2 },
    { id: "fire", name: "Fire arrow", look: "firebolt", fire: true, mass: 0.085, radius: 0.007, shaft: 0.007, length: 0.7, cd: 1.1, area: Math.PI * 0.018 ** 2 },
  ],
  controls: [
    { id: "draw", name: "Draw", min: 4, max: 12, step: 1, value: 12, unit: "notches" },
    { id: "elev", name: "Elevation", min: 0, max: 40, step: 1, value: 15, unit: "°" },
    { id: "weight", name: "Bow draw weight", min: 600, max: 1000, step: 25, value: 850, unit: "N" },
    { id: "distance", name: "Palisade distance", min: 60, max: 260, step: 10, value: 120, unit: "m" },
  ],
  actions: [
    { id: "span", name: "Span", key: "w" },
    { id: "loose", name: "Loose", key: " ", primary: true },
  ],
  toggles: [
    { id: "cut", name: "Cutaway" },
    { id: "strobe", name: "Strobe" },
  ],
  focus: [
    { id: "bow", name: "Bow" },
    { id: "string", name: "String" },
    { id: "slider", name: "Slider" },
    { id: "ratchet", name: "Ratchet" },
    { id: "trigger", name: "Trigger" },
    { id: "cradle", name: "Cradle" },
  ],
  phases: ["rest", "reset", "span", "load", "aim", "loose", "flight", "impact"],
  hint: "Space · loose   W · span",
  holdShot: true,

  build(B, M) {
    const mini = !!B.mini;
    if (!mini) {
      B.plinth(pl(-0.84, 1.0, -1.64, 1.72, 10), { h: 12, foot: 6, ruler: "y", label: { x: 0.42 * S, y: 1.22 * S, w: 46, d: 22, r: 1.5 } });
      B.halo("trestle.halo", [w(-0.42, -1.2, 0), w(0.42, -1.2, 0), w(0.42, 0.95, 0), w(-0.42, 0.95, 0)], 0, { blur: 6 });
    }
    const o = { mat: "oak", sys: "cradle", tone: "mid" };
    // Rear trestle: sills, sole beams, posts carrying the trunnion, braces.
    for (const y of [Y_T - 0.4, Y_T + 0.22]) B.slab(`rt.sill${y.toFixed(2)}`, pl(-0.34, 0.34, y - 0.05, y + 0.05, 0.8), 0, 0.09 * S, { ...o, steps: 2, bevel: 0.5, tone: "mid" });
    for (const sx of [-1, 1]) {
      const x = sx * 0.21;
      const cut = sx > 0 ? true : undefined;
      B.slab(`rt.sole${sx}`, pl(x - 0.045, x + 0.045, Y_T - 0.46, Y_T + 0.28, 0.8), 0.09 * S, 0.08 * S, { ...o, steps: 2, bevel: 0.5, tone: "mid" });
      B.slab(`rt.post${sx}`, pl(x - 0.04, x + 0.04, Y_T - 0.04, Y_T + 0.04, 0.6), 0.17 * S, 0.46 * S, { ...o, cut, steps: 2, bevel: 0.5, seams: [0.4 * S] });
      B.beam(`rt.brace${sx}`, w(x, Y_T - 0.4, 0.17), w(x, Y_T - 0.04, 0.47), { w: 0.055 * S, h: 0.05 * S, up: [0, 0, 1], ...o, cut, grain: 1 });
      B.beam(`rt.knee${sx}`, w(x, Y_T + 0.22, 0.17), w(x, Y_T + 0.04, 0.32), { w: 0.05 * S, h: 0.045 * S, up: [0, 0, 1], ...o, cut });
      // Trunnion: inner axle pieces (block to post), washers, stubs and linchpins outside.
      B.cyl(`rt.axle${sx}`, w(sx * 0.1, Y_T, Z_T), w(sx * 0.17, Y_T, Z_T), 0.022 * S, { mat: "iron", sys: "cradle" });
      B.ring(`rt.washer${sx}`, w(sx * 0.25, Y_T, Z_T), w(sx * 0.258, Y_T, Z_T), 0.022 * S, 0.036 * S, { mat: "iron", sys: "cradle" });
      // Near side: the stub is split where the quadrant arm's hub is keyed on it.
      if (sx > 0) {
        B.cyl("rt.stub1a", w(0.258, Y_T, Z_T), w(0.262, Y_T, Z_T), 0.022 * S, { mat: "iron", sys: "cradle" });
        B.cyl("rt.stub1b", w(0.272, Y_T, Z_T), w(0.3, Y_T, Z_T), 0.022 * S, { mat: "iron", sys: "cradle", faceRing: [{ r: 0.012 * S }] });
      } else B.cyl(`rt.stub${sx}`, w(-0.258, Y_T, Z_T), w(-0.3, Y_T, Z_T), 0.022 * S, { mat: "iron", sys: "cradle" });
      B.cyl(`rt.linch${sx}`, w(sx * 0.283, Y_T, Z_T + 0.022), w(sx * 0.283, Y_T, Z_T + 0.05), 0.005 * S, { mat: "iron", sys: "cradle" });
    }
    // Front rest: a low trestle the cradle lies on when level.
    B.slab("ft.bar", pl(-0.2, 0.2, Y_F - 0.035, Y_F + 0.035, 0.6), 0.53 * S, 0.06 * S, { ...o, steps: 2, bevel: 0.5 });
    B.slab("ft.pad", pl(-0.15, 0.15, Y_F - 0.03, Y_F + 0.03, 0.6), 0.59 * S, 0.01 * S, { mat: "hide", sys: "cradle", steps: 2 });
    for (const sx of [-1, 1]) {
      B.beam(`ft.leg${sx}`, w(sx * 0.13, Y_F, 0.53), w(sx * 0.3, Y_F, 0.03), { w: 0.05 * S, h: 0.055 * S, up: [0, 1, 0], ...o, grain: 1 });
      B.slab(`ft.foot${sx}`, pl(sx * 0.3 - 0.05, sx * 0.3 + 0.05, Y_F - 0.05, Y_F + 0.05, 0.6), 0, 0.03 * S, { ...o, steps: 2, bevel: 0.4, tone: "mid" });
    }
    B.beam("ft.stretcher", w(-0.222, Y_F, 0.17), w(0.222, Y_F, 0.17), { w: 0.04 * S, h: 0.04 * S, up: [0, 0, 1], ...o });
    if (mini) return;
    // Elevation quadrant on the near post: an iron arc round the trunnion with a hole every 5°.
    const RQ = 0.26;
    const arcAt = (a, r = RQ) => [0.256, Y_T - r * Math.cos(rad(a)), Z_T + r * Math.sin(rad(a))];
    const A0 = -4, A1 = 42;
    // One annular sector extruded across x (a non-convex outline with a box proxy).
    const QF = { o: w(0.252, Y_T, Z_T), a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] };
    const ring = [];
    for (let i = 0; i <= 23; i++) {
      const a = rad(A0 + ((A1 - A0) * i) / 23);
      ring.push([-(RQ + 0.013) * Math.cos(a) * S, (RQ + 0.013) * Math.sin(a) * S]);
    }
    for (let i = 23; i >= 0; i--) {
      const a = rad(A0 + ((A1 - A0) * i) / 23);
      ring.push([-(RQ - 0.013) * Math.cos(a) * S, (RQ - 0.013) * Math.sin(a) * S]);
    }
    const qpts = [];
    for (const [u, v] of ring) for (const sx of [0, 0.008 * S]) qpts.push([QF.o[0] + sx, QF.o[1] + u, QF.o[2] + v]);
    // Degree scale on the arc's face: ticks rooted on its outer edge, a hole every 5°.
    const holes = [], minor = [], major = [];
    const onArc = (a, r) => B.at(w(0.26, Y_T - r * Math.cos(rad(a)), Z_T + r * Math.sin(rad(a))));
    for (let a = 0; a <= 40; a += 1) (a % 5 ? minor : major).push(k.pathOf([onArc(a, RQ + 0.013), onArc(a, RQ + (a % 5 ? 0.007 : 0.003))]));
    for (let a = 0; a <= 40; a += 5) holes.push(onArc(a, RQ - 0.004));
    B.solid("quad.arc", extrudeAlong(QF, ring, 0, 0.008 * S, B.P, { convex: false }), shapeOf(qpts, { axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], edges: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] }), { mat: "iron", sys: "cradle", tone: "hi", over: B.L(minor.join(""), { tone: "lo" }) + B.L(major.join(""), { tone: "mid" }) + B.D(holes, { size: 0.6, tone: "lo" }) });
    B.beam("quad.bracketLo", w(0.256, Y_T - 0.04, Z_T - 0.03), w(0.256, Y_T - RQ * Math.cos(rad(A0)) + 0.01, Z_T - 0.03), { w: 0.022 * S, h: 0.008 * S, up: [1, 0, 0], mat: "iron", sys: "cradle" });
    B.beam("quad.bracketHi", w(0.256, Y_T - 0.04, Z_T + 0.06), w(...arcAt(A1 - 3, RQ - 0.012)), { w: 0.02 * S, h: 0.008 * S, up: [1, 0, 0], mat: "iron", sys: "cradle" });
    // The ready rack: a base board and two notched end boards.
    B.slab("rack.base", pl(0.42, 0.78, -1.46, -0.72, 1), 0, 0.025 * S, { mat: "oak", steps: 3, bevel: 0.4, tone: "mid" });
    for (const y of [-1.38, -0.82]) B.slab(`rack.end${y}`, pl(0.43, 0.77, y - 0.015, y + 0.015, 0.4), 0.025 * S, (RACK_Z - 0.025) * S, { mat: "oak", steps: 2, bevel: 0.3, over: B.D(RACK.map(([, x]) => B.at(w(x, y + 0.015, RACK_Z - 0.03))), { size: 0.45, tone: "lo" }) });
  },

  init(M) {
    return { mode: "rest", t: 0, T: 1, caught: true, slide: 0, th: 0, D: 0, loaded: false, auto: false, sim: null, flight: null };
  },

  act(M, id) {
    const st = M.state;
    if (id === "span") {
      if (st.mode === "rest") this.begin(M);
    }
    if (id === "loose") {
      if (st.mode === "armed") return this.fire(M);
      if (st.mode === "rest") this.begin(M);
      if (st.mode !== "shot") st.auto = true;
    }
  },

  // From rest: reset a spent weapon first, then span.
  begin(M) {
    const st = M.state;
    const q = M.calm ? 0.02 : 1;
    if (st.caught) {
      st.mode = "span";
      st.D = M.ctrl.draw * PITCH;
      st.t = 0;
      st.T = (0.6 + M.ctrl.draw * 0.32) * q;
      M.setPhase("span");
      return;
    }
    st.mode = "reset";
    st.t = 0;
    st.th0 = st.th;
    st.slide0 = st.slide;
    st.segs = [st.th > 0.002 ? 0.45 + st.th / rad(30) : 0, 0.3, 0.4 + st.slide * 3, 0.45].map((x) => x * q);
    st.T = st.segs.reduce((a, b) => a + b, 0);
    st.loaded = false;
    M.setPhase("reset");
  },

  onControl(M, id) {
    if (id === "distance") {
      M.def.target.distance = M.ctrl.distance;
      M.range.mount(M.def, M);
    }
  },

  fire(M) {
    const st = M.state;
    const sim = simulate(M, st.D, st.th);
    st.sim = sim;
    st.sfxT = 0;
    st.mode = "shot";
    st.auto = false;
    const L = M.ammo.length;
    const tail = tiltPt([0, Y_N + S_HOOK - 0.004 - st.D, Z_AX], st.th);
    const dir = tiltDir([0, -1, 0], st.th);
    const p = add(mul(tail, S), mul(dir, 0.8 * L * S));
    const flight = M.launch({ p, v: mul(dir, sim.v0), t0: sim.tSep, spin: 0 }) || { impact: { t: 3 } };
    st.flight = flight;
    const T = Math.max(sim.end, sim.tSep + flight.impact.t + 2.4);
    M.startShot(T, [[T_UNLATCH, "trip"], [sim.tSep, "loose"], [sim.tSep + flight.impact.t, "impact"]]);
    M.setPhase("loose");
  },

  endShot(M) {
    const st = M.state;
    st.mode = "rest";
    st.caught = false;
    st.slide = st.D;
    st.loaded = false;
    M.dirty = true;
    M.setPhase("rest");
  },

  tour(M) {
    if (M.state.mode === "rest") this.act(M, "loose");
  },

  update(M, dt) {
    const st = M.state;
    const q = M.calm ? 0.02 : 1;
    const sfx = (name, o) => M.sfx?.(name, o);
    const crossed = (at) => st.t - dt < at && st.t >= at;
    if (st.mode === "reset") {
      st.t += dt;
      const [a, b, c] = st.segs;
      if (st.t - dt <= 0 && a > 0) sfx("creak", { pitch: 0.6 });
      if (crossed(a)) sfx("tick");
      if (crossed(a + b)) sfx("creak", { pitch: 0.8 });
      if (crossed(a + b + c)) sfx("click", { pitch: 0.7 });
      if (st.t >= st.T) {
        st.caught = true;
        st.slide = 0;
        st.th = 0;
        sfx("clank", { pitch: 1.3, gain: 0.5 });
        this.begin(M);
      }
      return true;
    }
    if (st.mode === "span") {
      if (st.t === 0) sfx("creak", { pitch: 0.7 });
      st.t += dt;
      // Each notch the pawls drop into clicks.
      const n = Math.floor(this.pose(M).slide / PITCH + 1e-6);
      if (n > (st.notch ?? 0)) sfx("click", { pitch: 0.9 + 0.03 * n });
      st.notch = n;
      if (st.t >= st.T) {
        st.slide = st.D;
        st.notch = 0;
        st.mode = "load";
        st.t = 0;
        st.T = 1.3 * q;
        M.setPhase("load");
      }
      return true;
    }
    if (st.mode === "load") {
      st.t += dt;
      if (st.t >= st.T) {
        st.loaded = true;
        sfx("tick");
        this.aimTo(M);
      }
      return true;
    }
    if (st.mode === "aim") {
      if (st.t === 0 && Math.abs(st.th1 - st.th0) > 0.01) sfx("creak", { pitch: 0.5 });
      st.t += dt;
      if (st.t >= st.T) {
        st.th = st.th1;
        st.mode = "armed";
        if (Math.abs(st.th1 - st.th0) > 0.01) sfx("thunk", { gain: 0.35, pitch: 1.6 });
        if (st.auto) this.fire(M);
      }
      return true;
    }
    if (st.mode === "armed") {
      if (Math.abs(st.th - rad(M.ctrl.elev)) > 1e-4) this.aimTo(M);
      return !!M.ammo.fire;
    }
    if (st.mode === "shot" && M.shot && st.sim) {
      const t = M.shot.t;
      const hit = st.sim.tSep + st.flight.impact.t;
      M.setPhase(t < st.sim.tSep ? "loose" : t < hit ? "flight" : "impact");
      // Sounds only while the record plays forward (not when scrubbed).
      const prev = st.sfxT ?? 0;
      if (M.shot.playing && t > prev) {
        if (prev < 0.08 && t >= 0.08) sfx("click", { pitch: 1.4, gain: 0.5 });
        if (prev < T_UNLATCH && t >= T_UNLATCH) sfx("clank", { pitch: 1.5 });
        if (prev < st.sim.tRel + 0.002 && t >= st.sim.tRel + 0.002) sfx("twang", { pitch: 0.75 + (M.ctrl.weight - 600) / 1600 });
        if (prev < st.sim.tSep + 0.05 && t >= st.sim.tSep + 0.05) sfx("whoosh", { size: 0.5, gain: 0.5 });
      }
      st.sfxT = t;
      return !!M.shot.playing;
    }
    return false;
  },

  aimTo(M) {
    const st = M.state;
    st.th0 = st.th;
    st.th1 = rad(M.ctrl.elev);
    st.mode = "aim";
    st.t = 0;
    st.T = (0.35 + Math.abs(st.th1 - st.th0) / rad(22)) * (M.calm ? 0.02 : 1);
    M.setPhase("aim");
  },

  // The configuration drawn this frame.
  pose(M) {
    const st = M.state;
    const p = { th: st.th, slide: st.slide, draw: st.caught ? st.slide : 0, claw: st.caught ? 0 : G_OPEN, trig: st.caught ? 0 : 1, lift: 0, bolt: null, spanning: false };
    const u = (t0, T) => (T > 0 ? clamp((st.t - t0) / T, 0, 1) : 1);
    if (st.mode === "reset") {
      const [a, b, c, e] = st.segs;
      p.th = st.th0 * (1 - ease(u(0, a)));
      p.lift = ease(u(a, b));
      p.slide = st.slide0 * (1 - ease(u(a + b, c)));
      p.draw = 0;
      const close = ease(u(a + b + c, e));
      p.claw = G_OPEN * (1 - close);
      p.trig = 1 - close;
      p.lift *= 1 - close;
      p.rope = true;
    } else if (st.mode === "span") {
      const v = u(0, st.T);
      p.slide = st.D * (v < 0.08 ? 0 : ease((v - 0.08) / 0.92));
      p.draw = p.slide;
      p.spanning = true;
    } else if (st.mode === "load") {
      p.bolt = { load: ease(u(0, st.T)), s: S_HOOK - 0.004 };
    } else if (st.mode === "aim") {
      p.th = st.th0 + (st.th1 - st.th0) * ease(u(0, st.T));
      p.bolt = { s: S_HOOK - 0.004 };
    } else if (st.mode === "armed") {
      p.bolt = { s: S_HOOK - 0.004 };
    } else if (st.mode === "shot" && M.shot && st.sim) {
      const f = st.sim.rec.at(M.shot.t);
      p.th = st.sim.th;
      p.slide = st.sim.D;
      p.draw = f.d;
      p.claw = f.claw;
      p.trig = f.trig;
      if (M.shot.t < st.sim.tSep) p.bolt = { s: S_HOOK - 0.004 - (st.sim.D - Math.max(0, f.d)) };
    }
    return p;
  },

  draw(B, M) {
    const p = this.pose(M);
    const st = M.state;
    const mini = !!B.mini;
    const C = ctx(B, p.th);
    const thK = p.th.toFixed(4);
    const slK = p.slide.toFixed(4);
    B.keep("cradle", [thK], () => drawCradle(C, mini));
    // The case only slides while the press works: draw it once, then move the cached parts.
    if (mini) drawCase(C, p.slide, mini);
    else slideKeep(B, M, "case", [thK], p.slide, p.th, (sl) => drawCase(C, sl, mini));
    B.keep("slider", [thK], () => drawSlider(C, mini));
    B.keep("press", [thK, slK], () => drawPress(C, p.slide, mini));
    B.keep("bow", [thK, slK, p.draw.toFixed(4)], () => drawBow(C, p.slide, p.draw, mini));
    if (mini) return;
    const strOn = M.stage?.dataset?.focus === "string";
    B.keep("string", [thK, slK, p.draw.toFixed(4), strOn], () => drawString(C, p.slide, p.draw, strOn));
    B.keep("claw", [thK, p.claw.toFixed(3), p.trig.toFixed(3)], () => drawClaw(C, p.claw, p.trig));
    B.keep("pawls", [thK, slK, p.lift.toFixed(3)], () => drawPawls(C, p.slide, p.lift));
    B.keep("rope", [thK, slK], () => drawRope(C, p.slide));
    const taken = !!p.bolt;
    B.keep("rack", [M.ammo.id, taken], () => drawRack(B, M, taken));
    // In the shot the bolt only runs along the slider: draw it once and move it.
    const s0 = S_HOOK - 0.004;
    if (p.bolt && st.mode === "shot") slideKeep(B, M, "boltShot", [thK, M.ammo.id], s0 - p.bolt.s, p.th, () => drawBolt(C, M, { ...p, bolt: { s: s0 } }));
    else if (p.bolt) B.keep("bolt", [thK, M.ammo.id, p.bolt.s.toFixed(4), (p.bolt.load ?? 1).toFixed(4)], () => drawBolt(C, M, p));
    if (M.toggles.strobe && st.sim && M.shot) drawStrobe(B, M, st.sim, M.shot.t);
    // The fire arrow's tow burns from the moment it is laid in until it leaves.
    if (M.ammo.fire && p.bolt && !M.calm && p.bolt.load === undefined) {
      const L = M.ammo.length;
      const at = tiltPt([0, Y_N + p.bolt.s - 0.77 * L, Z_AX + 0.012], p.th);
      if (Math.random() < 0.85) M.fx.emit("fire", mul(at, S), { n: 2, v: [0, 0, 12], spread: 2.2, size: 4.6, grow: 2.6, life: 0.42, heat: 1, buoy: 34, drag: 2 });
      if (Math.random() < 0.3) M.fx.emit("ember", mul(at, S), { v: [0, 0, 16], spread: 3, size: 0.9, life: 0.7, heat: 0.9, buoy: 10, drag: 1 });
      if (Math.random() < 0.22) M.fx.emit("smoke", mul(add(at, [0, 0, 0.06]), S), { v: [0, 0, 9], spread: 2, size: 3.6, grow: 12, life: 1.8, alpha: 0.45, buoy: 8, drag: 1.2 });
    }
  },

  occluders(M) {
    return [{ min: w(-FW, -1.34, 0.6), max: w(FW, 1.02, 0.8) }];
  },

  readouts(M) {
    const st = M.state;
    const p = this.pose(M);
    const Ff = M.ctrl.weight;
    const F = forceAt(p.draw, Ff);
    const notches = Math.floor(p.slide / PITCH + 1e-6);
    const caught = p.draw > 0.001 && p.claw < G_SLIP;
    const weapon = 7.5 * PH.GRAVITY * Math.sin(p.th);
    const rows = [
      ["Draw", fmt(p.draw * 100, 1), "cm"],
      ["Notches", `${notches} / ${M.ctrl.draw}`, ""],
      ["Draw force", fmtInt(F), "N"],
      ["Stored energy", fmtInt(energyAt(p.draw, Ff)), "J"],
      ["Belly-rest load", fmtInt(p.spanning ? F : caught ? weapon : 0), "N"],
      ["Pawl load", fmtInt(caught && !p.spanning ? F : 0), "N"],
      ["Press thrust", fmtInt(p.spanning ? THRUST : 0), "N"],
      ["Elevation", fmt(deg(p.th), 1), "°"],
    ];
    if (st.sim && st.flight) rows.push(["Efficiency", fmtInt((st.sim.ke / st.sim.E) * 100), "%"], ["Power stroke", fmt((st.sim.tSep - st.sim.tRel) * 1000, 1), "ms"]);
    return rows;
  },
};

// ---------------- cradle: floor, cheeks, ground block, trunnion block, pointer, posts ----
function drawCradle(C, mini) {
  const o = { mat: "oak", sys: "cradle", tone: "mid" };
  C.boxY("cr.floor", -FW, FW, -1.34, 1.02, Z_FL0, Z_FL, { ...o, grain: 2, nails: [-1.24, -0.85, -0.2, 0.45, 0.9].map((y) => ({ s: y + 1.34, face: "v", x: [-0.75, 0.75] })) });
  for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? 0.062 : -0.088, x1 = sx > 0 ? 0.088 : -0.062;
    C.boxY(`cr.cheek${sx}`, x0, x1, -1.1, 0.84, Z_FL, 0.69, { ...o, grain: 1, nails: [-1.0, -0.5, 0.0, 0.5].map((y) => ({ s: y + 1.1, face: "v", x: 0 })) });
    // Corner irons on the floor's sides.
  }
  // Trunnion block under the floor, and the sill that carries the press posts.
  C.boxY("cr.trunnion", -0.1, 0.1, Y_T - 0.06, Y_T + 0.06, 0.5, Z_FL0, { ...o, tone: "mid" });
  C.boxX("cr.sill", -PX - 0.15, PX + 0.15, LEV_Y - 0.05, LEV_Y + 0.05, 0.54, Z_FL0, { ...o, grain: 1, nails: [{ s: 0.04, face: "v", x: 0 }, { s: 2 * PX + 0.26, face: "v", x: 0 }] });
  // Ground block: a granite block with an iron face where the slider's shoe bears.
  C.boxY("cr.ground", -0.06, 0.06, -1.32, -1.15, Z_FL, 0.775, { mat: "granite", sys: "cradle slider", nails: [{ s: 0.035, face: "v", x: [-0.55, 0.55] }, { s: 0.135, face: "v", x: [-0.55, 0.55] }], nailTone: "mid", nailSize: 0.7 });
  C.boxY("cr.face", -0.045, 0.045, -1.15, -1.14, 0.7, 0.775, { mat: "iron", sys: "slider", tone: "hi" });
  // Press posts on the sill, joined by a lintel over the lever's axle.
  for (const sx of [-1, 1]) {
    const x = sx * PX;
    C.boxZ(`pr.post${sx}`, x - 0.04, x + 0.04, LEV_Y - 0.035, LEV_Y + 0.035, Z_FL0, LEV_Z + 0.06, { ...o, cut: sx > 0 ? true : undefined, grain: 1, nails: [{ s: 0.03, face: "v", x: 0 }, { s: 0.03, face: "u", x: 0 }] });
  }
  for (const sx of [-1, 1]) C.beam(`pr.brace${sx}`, [sx * (PX + 0.135), LEV_Y, Z_FL0], [sx * (PX + 0.04), LEV_Y, 0.98], 0.05, 0.045, [0, 1, 0], { ...o, cut: sx > 0 ? true : undefined });
  C.cyl("pr.axle", [-PX - 0.07, LEV_Y, LEV_Z], [PX + 0.07, LEV_Y, LEV_Z], 0.016, { mat: "iron", sys: "cradle", faceRing: [{ r: 0.008 * S }] });
  if (mini) return;
  // Bollard for the check rope.
  C.cyl("cr.bollard", [0, 0.985, Z_FL], [0, 0.985, 0.82], 0.028, { mat: "oak", sys: "cradle" });
  C.cyl("cr.bollardCap", [0, 0.985, 0.82], [0, 0.985, 0.835], 0.036, { mat: "iron", sys: "cradle" });
  // Quadrant arm keyed on the trunnion stub (it turns with the cradle), pinned to the arc.
  C.ring("cr.qhub", [0.262, Y_T, Z_T], [0.272, Y_T, Z_T], 0.022, 0.036, { mat: "iron", sys: "cradle" });
  C.beam("cr.qarm", [0.267, Y_T - 0.036, Z_T], [0.267, Y_T - 0.278, Z_T], 0.01, 0.022, [0, 0, 1], { mat: "iron", sys: "cradle", tone: "hi" });
  C.cyl("cr.qpin", [0.272, Y_T - 0.256, Z_T], [0.282, Y_T - 0.256, Z_T], 0.0065, { mat: "iron", sys: "cradle" });
}

// ---------------- case (syrinx): head, body, racks, belly rest ----------------
function drawCase(C, sl, mini) {
  const yb = YB0 - sl; // grip
  const o = { mat: "oak" };
  C.boxY("case.front", -0.05, 0.05, yb - 0.1, yb - 0.025, Z_FL, Z_C1, { ...o, grain: 1 });
  C.boxY("case.bridge", -0.05, 0.05, yb - 0.025, yb + 0.025, Z_FL, Z_BOW - 0.015, o);
  C.boxY("case.body", -0.05, 0.05, yb + 0.025, yb + 1.24, Z_FL, Z_C1, { ...o, grain: 2, bands: [{ at: 0.78 }, { at: 1.0 }, { at: 1.17 }].map((b) => ({ ...b, w: 0.022, t: 0.004 })), nails: [0.6, 0.9, 1.1].map((s) => ({ s, face: "-u", x: 0 })) });
  // Belly rest (gaster): a crosspiece curved to fit the belly.
  const R = 0.6;
  const xs = [-0.15, -0.09, -0.03, 0.03, 0.09, 0.15];
  for (let i = 0; i < xs.length - 1; i++) {
    const xm = (xs[i] + xs[i + 1]) / 2;
    const a = [xs[i], yb + 1.24 + (xs[i] * xs[i]) / (2 * R) + 0.03, 0.7525];
    const b = [xs[i + 1], yb + 1.24 + (xs[i + 1] * xs[i + 1]) / (2 * R) + 0.03, 0.7525];
    C.beam(`case.belly${i}`, a, b, 0.06, 0.095, [0, 0, 1], { mat: "oak", sys: "cradle", grain: 1, nails: Math.abs(xm) > 0.05 ? [{ s: 0.03, face: "v", x: 0 }] : [] });
  }
  if (mini) return;
  C.cyl("case.eye", [-0.005, yb + 1.27, 0.806], [0.005, yb + 1.27, 0.806], 0.007, { mat: "iron", sys: "cradle", faceRing: [{ r: 0.003 * S, tone: "lo" }] });
  // Racks (katoches): sawtooth strips on both sides; each notch holds the pawl.
  const top = [[RACK_U[0], Z_ROOT]];
  for (let i = 0; i <= 12; i++) {
    const u0 = U_TIP0 + i * PITCH;
    top.push([u0, Z_ROOT]);
    if (i < 12) top.push([u0 + PITCH, Z_ROOT + H_T]);
  }
  top.push([RACK_U[1], Z_ROOT]);
  const poly = [[RACK_U[0], 0.705], [RACK_U[1], 0.705], ...top.slice().reverse()].map(([u, z]) => [u, z - 0.705]);
  for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? 0.05 : -0.062;
    const F = { o: [x0, yb, 0.705], a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] };
    const nails = sx > 0 ? C.dots([0.13, 0.27, 0.41, 0.53].map((u) => [0.062, yb + u, 0.716]), { size: 0.45, tone: "hi" }) : "";
    C.solidX(`case.rack${sx}`, F, poly, 0, 0.012, { mat: "iron", sys: "ratchet", tone: "hi", over: nails });
  }
}

// ---------------- slider (diostra): body, shoe, saddle, slot, cheeks, lugs ----------------
function drawSlider(C, mini) {
  const y = (s) => Y_N + s;
  const o = { mat: "oak", sys: "slider" };
  C.boxY("sl.shoe", -0.032, 0.032, y(0), y(0.02), 0.748, 0.802, { mat: "iron", sys: "slider", tone: "hi" });
  C.boxY("sl.body", -0.03, 0.03, y(0.02), y(0.7), 0.75, Z_S1, { ...o, grain: 1, inner: C.line([[0, y(0.04), Z_S1], [0, y(0.69), Z_S1]], { tone: "faint" }), nails: [0.1, 0.4, 0.62].map((s) => ({ s, face: "-u", x: 0 })) });
  C.boxY("sl.saddleF", -0.045, 0.045, y(0.7), y(0.835), 0.75, Z_S1, { ...o, nails: [{ s: 0.03, face: "v", x: [-0.6, 0.6] }] });
  C.boxY("sl.saddleR", -0.045, 0.045, y(0.925), y(0.95), 0.75, Z_S1, o);
  C.boxY("sl.slotFloor", -0.021, 0.021, y(0.835), y(0.925), 0.75, 0.775, o);
  for (const sx of [-1, 1]) {
    const cut = sx > 0 ? true : undefined;
    C.boxY(`sl.wall${sx}`, sx > 0 ? 0.029 : -0.045, sx > 0 ? 0.045 : -0.029, y(0.835), y(0.925), 0.75, Z_S1, { ...o, cut });
    C.boxY(`sl.cheek${sx}`, sx > 0 ? 0.021 : -0.029, sx > 0 ? 0.029 : -0.021, y(0.835), y(0.925), 0.75, 0.799, { mat: "iron", sys: "trigger", cut, tone: "hi", over: sx > 0 ? C.pin([0.029, y(S_CP), Z_CP], 0.0045) : "" });
    if (mini) continue;
    C.boxY(`sl.lug${sx}`, sx > 0 ? 0.045 : -0.05, sx > 0 ? 0.05 : -0.045, y(S_PIV - 0.016), y(S_PIV + 0.016), 0.774, Z_S1, { mat: "iron", sys: "ratchet" });
    C.boxY(`sl.tlug${sx}`, sx > 0 ? 0.006 : -0.012, sx > 0 ? 0.012 : -0.006, y(S_TP - 0.01), y(S_TP + 0.01), Z_S1, Z_TP + 0.01, { mat: "iron", sys: "trigger", over: sx > 0 ? C.pin([0.012, y(S_TP), Z_TP], 0.0035) : "" });
  }
  if (mini) return;
}

// ---------------- the press: bell crank, pad, lead weight, link ----------------
function drawPress(C, sl, mini) {
  const b = betaOf(sl);
  const piv = [0, LEV_Y, LEV_Z];
  const dn = [0, -Math.sin(b), -Math.cos(b)];
  const rr = [0, Math.cos(b), -Math.sin(b)];
  const at = (x, d, r) => add(add([x, LEV_Y, LEV_Z], mul(dn, d)), mul(rr, r));
  const o = { mat: "oak", sys: "cradle", tone: "mid" };
  for (const sx of [-1, 1]) {
    const x = sx * LX;
    // Corner block round the axle, then the down-arm to the pad and the arm to the weight.
    const F = { o: [x - 0.02, LEV_Y, LEV_Z], a: [1, 0, 0], u: rr, v: mul(dn, -1) };
    C.prism(`pr.corner${sx}`, F, polyRect(0.09, 0.09), 0, 0.04, { ...o, over: sx > 0 && !mini ? C.pin([x + 0.02, LEV_Y, LEV_Z], 0.024) : "" });
    C.beam(`pr.down${sx}`, at(x, 0.045, 0), at(x, RF + 0.03, 0), 0.04, 0.065, rr, { ...o, grain: 1, bands: [{ at: 0.42, w: 0.022, t: 0.004 }] });
    C.beam(`pr.rear${sx}`, at(x, 0, 0.045), at(x, 0, RW + 0.1), 0.04, 0.065, dn, { ...o, grain: 1 });
  }
  // Pad bar across the down-arms with a stuffed leather pad that nests in the belly rest.
  const pad = at(0, RF, 0);
  C.cyl("pr.padbarL", add(pad, [-LX + 0.02, 0, 0]), add(pad, [-0.1, 0, 0]), 0.015, { mat: "iron", sys: "cradle" });
  C.cyl("pr.padbarR", add(pad, [0.1, 0, 0]), add(pad, [LX - 0.02, 0, 0]), 0.015, { mat: "iron", sys: "cradle" });
  C.cyl("pr.pad", add(pad, [-0.1, 0, 0]), add(pad, [0.1, 0, 0]), R_PAD, { mat: "hide", sys: "cradle", steps: 24, seams: [0.05 * S, 0.1 * S, 0.15 * S] });
  // Lead weight on a bar between the two rear arms, bound with iron.
  const wc = at(0, 0, RW);
  C.beam("pr.lead", add(wc, [-LEAD[0] / 2, 0, 0]), add(wc, [LEAD[0] / 2, 0, 0]), LEAD[1], LEAD[2], mul(dn, -1), { mat: "lead", sys: "cradle", bands: [{ at: 0.05 }, { at: 0.21 }].map((q) => ({ ...q, w: 0.025, t: 0.005 })), bandNails: true });
  C.cyl("pr.leadbarL", add(wc, [-LX - 0.04, 0, 0]), add(wc, [-0.11, 0, 0]), 0.012, { mat: "iron", sys: "cradle" });
  C.cyl("pr.leadbarR", add(wc, [0.11, 0, 0]), add(wc, [LX + 0.04, 0, 0]), 0.012, { mat: "iron", sys: "cradle", faceRing: [{ r: 0.006 * S }] });
  if (mini) return;
  // Link from the pad to the eye on the belly rest, so the press can haul the case back.
  const yb = YB0 - sl;
  const eye = [0, yb + 1.27, 0.808];
  const lp = add(pad, [0, -0.006, R_PAD + 0.004]);
  C.beam("pr.link", lp, eye, 0.008, 0.005, [1, 0, 0], { mat: "iron", sys: "cradle", tone: "hi" });
}

// ---------------- check rope: pad → bollard, coil on the floor ----------------
function drawRope(C, sl) {
  const b = betaOf(sl);
  const pad = [0, LEV_Y - RF * Math.sin(b), LEV_Z - RF * Math.cos(b)];
  const from = add(pad, [0, R_PAD + 0.002, -0.01]);
  const to = [0, 0.985 - 0.03, 0.79];
  C.rope("pr.rope", [from, lerp(from, to, 0.5), to], 0.006, { sys: "cradle", maxLength: 12 });
  // Turns round the bollard and the rest coiled beside it (the coil shrinks as rope pays out).
  C.ring("cr.turns", [0, 0.985, 0.77], [0, 0.985, 0.81], 0.028, 0.036, { mat: "rope", sys: "cradle" });
  const paid = clamp((padY(sl) - padY(0)) / (padY(D_FULL) - padY(0)), 0, 1);
  const r = 0.04 - 0.01 * paid;
  const ring = [];
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    ring.push([0.058 + r * Math.cos(a), 0.93 + r * Math.sin(a) * 0.9, Z_FL + 0.008]);
  }
  C.rope("cr.coil", ring, 0.006, { sys: "cradle", maxLength: 10 });
}

// ---------------- composite bow ----------------
function drawBow(C, sl, d, mini) {
  const yb = YB0 - sl;
  const a = bendOf(d);
  const knots = limbPath(a);
  const at = (sx, kk) => [sx * kk[0], yb + kk[1], Z_BOW];
  // Riser stubs where the bow comes out of the case head.
  for (const sx of [-1, 1]) C.boxY(`bow.riser${sx}`, sx > 0 ? 0.05 : -0.07, sx > 0 ? 0.07 : -0.05, yb - 0.025, yb + 0.025, Z_BOW - 0.015, Z_BOW + 0.015, { mat: "oak", sys: "bow" });
  for (const sx of [-1, 1]) {
    // Each limb is a curved bar: its plan outline extruded through the bow's height.
    const pts = knots.map((kk) => [sx * kk[0], yb + kk[1]]);
    const wd = knots.map((_, i) => (i <= NW ? 0.027 - (0.009 * i) / NW : 0.018 - (0.005 * (i - NW)) / NE));
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const n = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
      L.push([pts[i][0] + (n[0] * wd[i]) / 2, pts[i][1] + (n[1] * wd[i]) / 2]);
      R.push([pts[i][0] - (n[0] * wd[i]) / 2, pts[i][1] - (n[1] * wd[i]) / 2]);
    }
    const piece = (id, i0, i1, h, mat) => C.solidX(id, { o: [0, 0, Z_BOW - h / 2], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, [...L.slice(i0, i1 + 1), ...R.slice(i0, i1 + 1).reverse()], 0, h, { mat, sys: "bow", tone: "hi" });
    if (mini) {
      piece(`bow.l${sx}`, 0, knots.length - 1, 0.03, "sinew");
      continue;
    }
    // Sinew grip lashing at the root, the working limb in two lengths, the stiff ear.
    C.beam(`bow.lash${sx}`, [sx * 0.07, yb, Z_BOW], [pts[1][0], pts[1][1], Z_BOW], wd[0] + 0.007, 0.038, [0, 0, 1], { mat: "sinew", sys: "bow", tone: "hi" });
    piece(`bow.l${sx}.0`, 1, 5, 0.031, "sinew");
    piece(`bow.l${sx}.1`, 5, NW, 0.029, "sinew");
    piece(`bow.l${sx}.2`, NW, NW + NE, 0.025, "oak");
    if (mini) continue;
    // Horn nock at the tip.
    const kt = knots[knots.length - 1];
    const dirT = [sx * Math.cos(kt[2]), Math.sin(kt[2]), 0];
    C.cyl(`bow.nock${sx}`, at(sx, kt), add(at(sx, kt), mul(dirT, 0.02)), 0.0085, { mat: "hide", sys: "bow string" });
  }
}

// String: tip → claw (or the slider top at brace) → tip.
// Drawn as a stroked path so it can take the accent when the String is in focus.
function drawString(C, sl, d, on) {
  const yb = YB0 - sl;
  const kt = limbPath(bendOf(d))[KNOTS.length - 1];
  const c = [0, yb + U_BR + d, Z_AX];
  const half = (id, a, b) => {
    const pts = [a, b].map(C.P);
    const style = `stroke-width:${on ? 1.5 : 1.15}px${on ? ";stroke:var(--accent)" : ""}`;
    C.B.raw(id, `<path class="iso-line cord" data-tone="hi" style="${style}" d="${k.pathOf(pts.map(C.B.at))}"/>`, shapeOf(pts, { r: 0.4, edges: [unit(sub(pts[1], pts[0]))] }), { sys: "string", mat: "sinew" });
  };
  half("string.l", [-kt[0], yb + kt[1], Z_BOW], c);
  half("string.r", c, [kt[0], yb + kt[1], Z_BOW]);
}

// ---------------- claw (cheir) and trigger lever (schaster) ----------------
const FINGER = [[-0.031, -0.006], [-0.017, -0.006], [-0.017, 0.026], [-0.007, 0.026], [-0.007, 0.034], [-0.031, 0.034]];
function drawClaw(C, g, trig) {
  const pin = [0, Y_N + S_CP, Z_CP];
  const u = [0, Math.cos(g), Math.sin(g)];
  const v = [0, -Math.sin(g), Math.cos(g)];
  const o = { mat: "bronze", sys: "trigger", tone: "hi" };
  C.prism("claw.hub", { o: [-0.019, pin[1], pin[2]], a: [1, 0, 0], u, v }, [[-0.017, -0.012], [0.014, -0.012], [0.014, 0.006], [-0.017, 0.006]], 0, 0.038, o);
  for (const sx of [-1, 1]) C.solidX(`claw.finger${sx}`, { o: [sx > 0 ? 0.009 : -0.019, pin[1], pin[2]], a: [1, 0, 0], u, v }, FINGER, 0, 0.01, o);
  C.prism("claw.tail", { o: [-0.007, pin[1], pin[2]], a: [1, 0, 0], u, v }, [[0.014, -0.002], [0.032, -0.002], [0.032, 0.012], [0.014, 0.012]], 0, 0.014, o);
  // The trigger lever's catch rides on the tail; pulled, it lifts and the tail follows it up.
  const need = Math.asin(clamp((Z_CP + 0.022 * Math.sin(g) + 0.012 * Math.cos(g) - Z_TP + 0.004) / 0.028, -1, 1));
  const dl = Math.max(trig * 0.3, need, 0);
  const ut = [0, Math.cos(dl), -Math.sin(dl)];
  const vt = [0, Math.sin(dl), Math.cos(dl)];
  const tp = [0, Y_N + S_TP, Z_TP];
  C.prism("trig.lever", { o: [-0.005, tp[1], tp[2]], a: [1, 0, 0], u: ut, v: vt }, [[-0.035, -0.004], [0.058, -0.004], [0.058, 0.004], [-0.035, 0.004]], 0, 0.01, { mat: "iron", sys: "trigger", tone: "hi" });
  const h = add(tp, mul(ut, 0.066));
  C.ball("trig.handle", h, 0.0065, { mat: "iron", sys: "trigger" });
}

// ---------------- pawls (katakleides) on the racks ----------------
function drawPawls(C, sl, lift) {
  const h = H_T * (((sl / PITCH) % 1) + 1) % 1;
  const zt = Z_ROOT + h + 0.0015;
  const alpha = Math.asin(clamp((Z_PIV - zt) / PAWL_L, -1, 1)) - lift * 0.55;
  const y = (s) => Y_N + s;
  const piv = [0, y(S_PIV), Z_PIV];
  const tip = [0, piv[1] - PAWL_L * Math.cos(alpha), piv[2] - PAWL_L * Math.sin(alpha)];
  for (const sx of [-1, 1]) {
    const x = sx * 0.0545;
    C.beam(`pawl${sx}`, [x, piv[1] + 0.006 * Math.cos(alpha), piv[2] + 0.006 * Math.sin(alpha)], [x, tip[1], tip[2]], 0.011, 0.008, [1, 0, 0], { mat: "iron", sys: "ratchet", tone: "hi", over: sx > 0 ? C.pin([0.0585, piv[1], piv[2]], 0.004) : "" });
  }
}

// ---------------- the bolt on the slider, and on its way from the rack ----------------
function drawBolt(C, M, p) {
  const a = M.ammo;
  const L = a.length;
  const r = a.shaft;
  const dir = [0, -1, 0];
  let tail = [0, Y_N + p.bolt.s, Z_AX];
  if (p.bolt.load !== undefined) {
    const slot = RACK.findIndex(([kind]) => kind === a.id);
    const from = [RACK[slot][1], RACK_TAIL, RACK_Z + r];
    const u = p.bolt.load;
    tail = lerp(from, tail, u);
    tail[2] += Math.sin(u * Math.PI) * 0.32;
  }
  const T = mul(tiltPt(tail, p.th), S);
  const D = tiltDir(dir, p.th);
  const F = G.frameAlong(T, D);
  const roll = G.angleToward(F, tiltDir([0, 0, 1], p.th));
  looks.bolt(C.B, "bolt", T, D, L * S, r * S, { fire: a.fire, heavy: a.heavy, roll, sys: "slider" });
}

function drawRack(B, M, taken) {
  const id = M.ammo.id;
  const skip = taken ? RACK.findIndex(([kind]) => kind === id) : -1;
  RACK.forEach(([kind, x], i) => {
    if (i === skip) return;
    const a = M.def.ammo.find((q) => q.id === kind);
    const tail = w(x, RACK_TAIL, RACK_Z + a.shaft);
    looks.bolt(B, `rack.b${i}`, tail, [0, -1, 0], a.length * S, a.shaft * S, { fire: a.fire, heavy: a.heavy, lit: kind === id, roll: Math.PI / 2 });
  });
}

// ---------------- strobe: string, limbs and bolt tail through the release ----------------
function drawStrobe(B, M, sim, now) {
  if (now < sim.tRel) return;
  const C = ctx(B, sim.th);
  const lines = [];
  const pts = [];
  const times = [];
  for (let i = 0; i <= 8; i++) times.push(sim.tRel + ((sim.tSep - sim.tRel) * i) / 8);
  for (let i = 1; i <= 10; i++) times.push(sim.tSep + i * 0.006);
  const yb = YB0 - sim.D;
  for (const t of times) {
    if (t > now) break;
    const f = sim.rec.at(t);
    const knots = limbPath(bendOf(f.d));
    const kt = knots[knots.length - 1];
    const c = [0, yb + U_BR + f.d, Z_AX];
    const L = [-kt[0], yb + kt[1], Z_BOW], R = [kt[0], yb + kt[1], Z_BOW];
    lines.push(k.pathOf([L, c, R].map((q) => B.at(C.P(q)))));
    for (const sx of [-1, 1]) lines.push(k.pathOf(knots.map((kk) => B.at(C.P([sx * kk[0], yb + kk[1], Z_BOW])))));
    pts.push(B.at(C.P(c)));
  }
  const path = [];
  for (let t = sim.tRel; t <= Math.min(now, sim.tSep); t += (sim.tSep - sim.tRel) / 30) {
    const f = sim.rec.at(t);
    path.push(B.at(C.P([0.0, yb + U_BR + Math.max(0, f.d), Z_AX + 0.002])));
  }
  const svg = B.L(lines.join(""), { tone: "lo" }) + (path.length > 1 ? `<path class="iso-line" data-tone="lit" style="stroke:var(--accent);stroke-width:1.2px" d="${k.pathOf(path)}"/>` : "") + B.D(pts, { size: 1.2, tone: "mid" });
  B.marks("strobe", svg, [C.P([0, yb, 0.9])], { r: 200, layer: 6 });
}

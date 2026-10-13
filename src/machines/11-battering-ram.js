// Battering ram under a wheeled shed (testudo arietaria; Vitruvius X.13–15, Apollodorus of Damascus,
// Assyrian six-wheeled rams). Authored in metres (S converts to world units).
//
// TRUTH
//  Ram beam   silver fir, squared 0.40 m with chamfers (A ≈ 0.158 m²), ρ 540 kg/m³ → 85 kg/m;
//             iron bands 0.12 × 0.018 m (≈ 24 kg each) every ~1.4 m; 9–14 m long → 1.0–1.6 t with its head.
//  Suspension two V-pairs of ropes from the tie-beam soffits (4.45 m), 2.7 m apart: a parallelogram, so
//             the beam translates on a circle of radius l (rope length 1.6–2.7 m) without turning.
//             Pendulum: m l θ'' = −m g sin θ + F_crew cos θ − c l θ'   (period 2π√(l/g) ≈ 2.5–3.3 s).
//  Crew       pulls with F (1–10 kN, about 6–60 men) in the direction of motion: back on the back-swing,
//             forward on the heave. Hill's force–velocity law F·(1 − v/5 m/s); a new crew falls into step
//             over a few pulls (effort 1 − 0.5·0.55ⁿ), so the swing builds up pull by pull.
//  Strike     when the head reaches the wall (sin θc = stand-off / l): v = l θ', E = ½ m v², p = m v;
//             restitution e (blunt 0.32, bore 0.10, hook 0.12; a bitten hook holds, e = 0);
//             contact lasts one axial wave round trip of the beam, Δt = 2L/c (c ≈ 4400 m/s in fir),
//             so the peak force is p(1 + e)/Δt (≈ 1–2 MN).
//  Bore       (terebra) rides on rollers in a trough instead: m ẍ = ±F_crew − μ m g, μ = 0.015 (rollers),
//             drawn back 1.4 m and driven at the bottom of its hole; depth += (E − 0.5 kJ)/55 kJ·m⁻¹.
//  Damage     ram's head: D += (E − 1 kJ)/62 kJ, cracks spread with D·e^(−d/0.95 m), blocks at the blow
//             are pushed in; breach at D = 1 (a ragged 6–8 cell hole, the blocks above fall out).
//             bore: D = depth / 0.9 m, hairline cracks only, a narrow 2-cell breach.
//             hook: bites if E > 1.8 kJ, loosens the block by (E − 1.8)/10 kJ, and on the back-swing the
//             crew's pull F extracts it once F > 2 + 22·(1 − looseness) kN; five blocks out → breach.
//
// PARTS (≈ 200 for the machine)
//  base       2 sills, 4 transoms, 6 bearing blocks + 6 straps, 3 axles + 6 axle stubs
//  wheels     6 solid plank wheels (tyre seams, battens on the near three), 6 hubs, 6 axle caps + linchpins,
//             2 handspikes in the rear wheel sockets; plank tracks under both wheel lines
//  frame      8 posts, 2 wall plates, 4 tie beams, 2 king posts, ridge beam, 8 side braces, 4 cross braces,
//             2 gables, 6 side-board panels (+ 6 ledgers on the near side)
//  roof       14 rafters, 2 board decks, 8 wet ox-hides in two layers, 4 hanging flaps, ridge roll,
//             12 lashings with knots
//  ram        beam in band-split segments, ~9 iron bands, 4 langets, 2 suspension eyes, 4 pull eyes,
//             tail cap + ring; 4 suspension ropes from 4 eye bolts; 4 pull ropes with toggle handles
//  heads      ram's head (sleeve, bronze head, two ribbed horns), bore (sleeve, collar, fluted point, trough
//             with rollers), wall hook (sleeve, spike, point, recurved barb); a cradle with the spare heads
//  target     ashlar curtain wall: footing, 21 struck-zone blocks over a rubble core, outer courses,
//             parapet, coping, 5 merlons, wall walk, rear parapet; fallen blocks and rubble
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { add, sub, mul, dot, cross, unit, len, lerp, clamp, rad, deg, ease, smoothstep, fmt, fmtInt, TAU, rng, rotate } from "../engine/vec.js";
import * as PH from "../engine/physics.js";
import * as looks from "../engine/looks.js";
import { frameFrom, framePoint, polyRect, polyRound, polyCircle, createBuilder } from "../engine/geo.js";
import { shapeOf } from "../engine/scene.js";

const U = 0.05;
const S = 1 / U;
const w = (x, y, z) => [x * S, y * S, z * S];
const W3 = (p) => [p[0] * S, p[1] * S, p[2] * S];
const Z = [0, 0, 1];
const g0 = PH.GRAVITY;

// ---------------- the shed (shed-local metres: y from its front 0 to its back LS) ----------------
const LS = 8.5;
const HX = 1.62; // sill, post and plate centre line
const SB = 0.3; // their width
const XO = HX + SB / 2; // 1.77, outer face of the frame
const STATIONS = [0.15, 2.9, 5.6, 8.35];
const AXLES = [1.3, 4.25, 7.2];
const RW = 0.45; // wheel radius
const TRK = 0.06; // plank track
const ZAX = TRK + RW;
const XW = [1.86, 2.04]; // wheel faces
const ZS0 = 0.7;
const ZS1 = 1.02; // sills and transoms
const ZT0 = 4.45;
const ZT1 = 4.75; // plates and tie beams
const ZSUS = ZT0; // rope pivots: the tie-beam soffits
const PITCH = rad(26);
const TP = Math.tan(PITCH);
const CP = Math.cos(PITCH);
const SPI = Math.sin(PITCH);
const RAFTERS = [0.15, 1.52, 2.9, 4.25, 5.6, 6.97, 8.35];
const zRafB = (x) => ZT1 + (XO - Math.abs(x)) * TP; // rafter soffit
const zRoof = (x) => zRafB(x) + 0.18 / CP; // rafter top, where the boards lie
const XR = 0.11; // ridge beam half width
const XE = 2.32; // eave edge
const SUSP = [2.9, 5.6];
const PULL = [6.6, 7.8];
const YC = 4.25; // the ram's centre, midway between its suspension ties
const EYE = 0.285; // eye ring centre above (or beside) the beam axis
const BEAMW = 0.4;
const ROLL = { z: 1.11, r: 0.08 };
const Z_BORE = ROLL.z + ROLL.r + BEAMW / 2; // the bore's axis on its rollers
const S_BORE = 1.4;
const C_FIR = 4400; // m/s, axial wave speed in fir
const RHO = 540;
const SECTION = BEAMW * BEAMW - 4 * 0.05 * 0.05 * (1 - Math.PI / 4);
const BAND_KG = 24;
const VMAX = 5;
const ramAxisZ = (l, bore) => (bore ? Z_BORE : ZSUS - l - EYE);

// ---------------- the wall (world metres; its struck face is the plane y = 0) ----------------
const WX = 4.6;
const WT = 2.6;
const FT = 0.4; // ashlar facing
const WH = 6.0;
const CO = 0.6; // course height
const BL = 1.2; // block length
const jointsOf = (k, x0, x1) => {
  const off = k % 2 ? 0.6 : 0;
  const out = [];
  for (let x = Math.ceil((x0 - off) / BL) * BL + off; x <= x1 + 1e-6; x += BL) if (x > x0 + 1e-6 && x < x1 - 1e-6) out.push(+x.toFixed(4));
  return out;
};
const BLOCKS = [];
for (let kk = 1; kk <= 6; kk++) {
  const edge = kk % 2 ? 1.8 : 2.4;
  const xs = [-edge, ...jointsOf(kk, -edge, edge), edge];
  for (let i = 0; i + 1 < xs.length; i++) BLOCKS.push({ i: BLOCKS.length, k: kk, x0: xs[i], x1: xs[i + 1], z0: kk * CO, z1: (kk + 1) * CO });
}
const zoneEdge = (kk) => (kk % 2 ? 1.8 : 2.4);
const cellKey = (i, j) => `${i},${j}`;
const cellsOf = (b) => {
  const out = [];
  for (let i = 0; i < 8; i++) {
    const x0 = -2.4 + i * 0.6;
    if (x0 + 0.3 > b.x0 && x0 + 0.3 < b.x1) out.push(cellKey(i, b.k - 1));
  }
  return out;
};
BLOCKS.forEach((b) => (b.cells = cellsOf(b)));
const distTo = (b, [hx, hz]) => Math.hypot(Math.max(b.x0 - hx, 0, hx - b.x1), Math.max(b.z0 - hz, 0, hz - b.z1));

// Where fallen blocks come to rest (x, y, yaw°) and loose rubble (x, y, r), clear of each other.
const SLOTS = [[0.7, 1.05, 4], [-0.62, 1.08, -5], [2.0, 1.1, 6], [-1.95, 1.05, -4], [0.6, 1.85, -6], [-0.75, 1.88, 5], [-0.65, 2.55, 3], [0.65, 2.6, -3]];
const slotPoly = ([x, y, yaw], grow = 0) => {
  const a = rad(yaw);
  const c = Math.cos(a), s = Math.sin(a);
  return [[-0.6 - grow, -0.3 - grow], [0.6 + grow, -0.3 - grow], [0.6 + grow, 0.3 + grow], [-0.6 - grow, 0.3 + grow]].map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]);
};
const inPoly = (poly, [px, py]) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const RUBBLE = (() => {
  const R = rng(17);
  const out = [];
  const polys = SLOTS.map((s) => slotPoly(s, 0.08));
  for (let tries = 0; tries < 4000 && out.length < 26; tries++) {
    const r = 0.06 + R() * 0.09;
    const x = (R() - 0.5) * 4.2;
    const y = 0.24 + r + Math.pow(R(), 1.8) * 0.9;
    if (polys.some((p) => inPoly(p, [x, y]) || [0, 1, 2, 3].some((a) => inPoly(p, [x + r * Math.cos(a * 1.57), y + r * Math.sin(a * 1.57)])))) continue;
    if (out.some((q) => Math.hypot(q[0] - x, q[1] - y) < q[2] + r + 0.02)) continue;
    out.push([x, y, r]);
  }
  return out.sort((a, b) => a[1] - b[1] || Math.abs(a[0]) - Math.abs(b[0]));
})();

// ---------------- plinth and the approach ----------------
const PL = { x0: -4.95, x1: 4.95, y0: -3.3, y1: 17.5 };
const Y_START = 6.0;

// ---------------- heads ----------------
const HEADS = {
  ram: { mass: 160, sleeve: 0.5, reach: 0.5 + 0.555, e: 0.32, bite: 0 },
  bore: { mass: 75, sleeve: 0.45, reach: 0.45 + 0.95, e: 0.1, bite: 0 },
  hook: { mass: 110, sleeve: 0.45, reach: 0.45 + 0.74, e: 0.12, bite: 0.1 },
};

const bandsFor = (L) => {
  const y0 = YC - L / 2;
  const fixed = [1.0, SUSP[0] - y0, SUSP[1] - y0, PULL[0] - y0, PULL[1] - y0, L - 0.35].filter((s) => s < L - 0.2).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < fixed.length; i++) {
    out.push(fixed[i]);
    const next = fixed[i + 1];
    if (next === undefined) break;
    const gap = next - fixed[i];
    const n = Math.floor(gap / 1.45);
    for (let j = 1; j <= n; j++) out.push(fixed[i] + (gap * j) / (n + 1));
  }
  return out;
};
const massOf = (L, kind) => RHO * SECTION * L + BAND_KG * bandsFor(L).length + HEADS[kind].mass;
const targetY = (L, kind, gap) => gap + L / 2 + HEADS[kind].reach - YC; // shed front for the head to stand off by gap

// ---------------- the damage model ----------------
let UID = 1;
const freshDamage = () => ({ uid: UID++, n: 0, D: 0, breach: false, depth: 0, blocks: BLOCKS.map(() => ({ crack: 0, push: 0, loose: 0, out: false })), hole: [], fallen: [], rubble: 0, spots: [], hit: null, by: null });
const cloneDamage = (d) => ({ ...d, uid: UID++, blocks: d.blocks.map((b) => ({ ...b })), hole: [...d.hole], fallen: d.fallen.map((f) => ({ ...f })), spots: d.spots.map((s) => ({ ...s })), hit: d.hit ? [...d.hit] : null });

function addSpot(d, kind, x, z, r) {
  const s = d.spots.find((q) => q.kind === kind && Math.hypot(q.x - x, q.z - z) < 0.25);
  if (s) s.r = Math.max(s.r, r);
  else d.spots.push({ kind, x, z, r });
}

// Applies one strike; returns the new state and the events it starts (falls, effects).
function strike(d0, { kind, E, F, hit, t, tRel }) {
  const d = cloneDamage(d0);
  d.n++;
  d.by = kind;
  if (!d.hit) d.hit = [...hit];
  const ev = { falls: [], extract: false, bite: false };
  const dist = BLOCKS.map((b) => distTo(b, hit));
  const nextSlot = () => (d.fallen.length < SLOTS.length ? d.fallen.length : -1);
  const fall = (bi, t0, slide, kindOf) => {
    const slot = nextSlot();
    d.blocks[bi].out = true;
    if (slot < 0) return;
    const b = BLOCKS[bi];
    const from = [(b.x0 + b.x1) / 2, -FT / 2, (b.z0 + b.z1) / 2];
    const fallT = Math.sqrt((2 * Math.max(0.05, from[2] - 0.2)) / g0);
    const f = { b: bi, slot, anim: { kind: kindOf, t0, t1: t0 + slide + fallT + 0.12, slide, fallT, from } };
    d.fallen.push(f);
    ev.falls.push(f);
  };
  if (kind === "ram") {
    const dD = Math.max(0, E - 1000) / 62000;
    d.D = Math.min(1, d.D + dD);
    addSpot(d, "spall", hit[0], hit[1], 0.1 + 0.32 * Math.min(1, d.D * 1.3));
    BLOCKS.forEach((b, i) => {
      const s = d.D * Math.exp(-dist[i] / 0.95);
      d.blocks[i].crack = Math.max(d.blocks[i].crack, Math.min(3, Math.floor(s * 4.6)));
      if (dist[i] < 0.3) d.blocks[i].push = Math.max(d.blocks[i].push, Math.min(0.12, 0.13 * d.D));
    });
    d.rubble = Math.max(d.rubble, Math.round(d.D * 12));
  } else if (kind === "bore") {
    const dd = Math.max(0, E - 500) / 55000;
    d.depth = Math.min(0.9, d.depth + dd);
    d.D = Math.min(1, d.D + dd / 0.9);
    addSpot(d, "bore", hit[0], hit[1], 0.05 + 0.17 * Math.min(1, d.depth / 0.95));
    BLOCKS.forEach((b, i) => {
      if (dist[i] < 0.32) d.blocks[i].crack = Math.max(d.blocks[i].crack, 1 + Math.floor(d.depth / 0.45));
    });
    d.rubble = Math.max(d.rubble, Math.min(4, d.n));
  } else if (kind === "hook") {
    if (E >= 1800) {
      ev.bite = true;
      addSpot(d, "bite", hit[0], hit[1], 0.08);
      const exposed = (i) => dist[i] < 0.05 || BLOCKS.some((q, j) => d.blocks[j].out && adjacent(BLOCKS[i], q));
      const order = BLOCKS.map((b, i) => i).filter((i) => !d.blocks[i].out && exposed(i)).sort((a, b) => dist[a] - dist[b] || BLOCKS[b].z0 - BLOCKS[a].z0);
      const ti = order[0];
      if (ti !== undefined) {
        const blk = d.blocks[ti];
        const before = blk.loose;
        blk.loose = Math.min(1, blk.loose + (E - 1800) / 10000);
        const hold = 2000 + 22000 * (1 - blk.loose);
        if (F >= hold) {
          d.D = Math.min(1, d.D + (1 - before) / 5);
          ev.extract = true;
          fall(ti, t, tRel - t, "pull");
          d.rubble = Math.min(RUBBLE.length, d.rubble + 1);
        } else {
          d.D = Math.min(1, d.D + (blk.loose - before) / 5);
          blk.push = -0.05 * blk.loose;
        }
        BLOCKS.forEach((b, i) => {
          if (i === ti || adjacent(b, BLOCKS[ti])) d.blocks[i].crack = Math.max(d.blocks[i].crack, Math.ceil(blk.loose * 2));
        });
      }
    }
  }
  if (d.D >= 1 - 1e-9 && !d.breach) {
    d.breach = true;
    d.D = 1;
    const ell = (c, rx, rz) => {
      const [i, j] = c.split(",").map(Number);
      const x = -2.1 + i * 0.6, z = 0.9 + j * 0.6;
      return ((x - hit[0]) / rx) ** 2 + ((z - hit[1]) / rz) ** 2 <= 1;
    };
    if (kind === "ram") {
      BLOCKS.forEach((b, i) => {
        if (dist[i] < 0.7) d.blocks[i].out = true;
      });
      const holeCells = new Set();
      BLOCKS.forEach((b, i) => d.blocks[i].out && b.cells.forEach((c) => ell(c, 1.05, 0.8) && holeCells.add(c)));
      d.hole = [...new Set([...d.hole, ...holeCells])];
      // Blocks above the hole lose their bed and fall outward.
      const above = BLOCKS.map((b, i) => i).filter((i) => !d.blocks[i].out && BLOCKS.some((q, j) => d.blocks[j].out && q.k === BLOCKS[i].k - 1 && q.x0 < BLOCKS[i].x1 - 0.1 && q.x1 > BLOCKS[i].x0 + 0.1) && dist[i] < 1.5);
      above.sort((a, b) => dist[a] - dist[b]).slice(0, 3).forEach((i, n) => fall(i, t + 0.05 + n * 0.14, 0.18, "tumble"));
      d.rubble = RUBBLE.length;
    } else if (kind === "bore") {
      const cells = [];
      for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) if (ell(cellKey(i, j), 0.5, 0.32)) cells.push(cellKey(i, j));
      d.hole = [...new Set([...d.hole, ...cells])];
      BLOCKS.forEach((b, i) => b.cells.some((c) => cells.includes(c)) && (d.blocks[i].out = true));
      d.rubble = Math.max(d.rubble, 9);
    } else {
      const cells = [];
      BLOCKS.forEach((b, i) => d.blocks[i].out && b.cells.forEach((c) => ell(c, 1.2, 0.9) && cells.push(c)));
      d.hole = [...new Set([...d.hole, ...cells])];
      d.rubble = Math.min(RUBBLE.length, d.rubble + 8);
    }
  }
  return { d, ev };
}
const adjacent = (a, b) => (a.k === b.k && (Math.abs(a.x1 - b.x0) < 1e-6 || Math.abs(a.x0 - b.x1) < 1e-6)) || (Math.abs(a.k - b.k) === 1 && a.x0 < b.x1 - 0.05 && a.x1 > b.x0 + 0.05);

// ---------------- the physics of one sequence ----------------
// Simulates a sequence of up to N strikes from rest. Returns the recorded motion and the strikes.
function simulate(P, dmg0) {
  const { L, l, F, gap, kind, N } = P;
  const bore = kind === "bore";
  const H = HEADS[kind];
  const m = massOf(L, kind);
  const rec = PH.timeline();
  const strikes = [];
  const snaps = [];
  let dmg = dmg0;
  const dt = 1 / 1000;
  const every = 8;
  let t = 0;
  let i = 0;
  let dir = -1;
  let tSwitch = 0;
  let pulls = 0;
  let stage = "pump";
  let maxBack = 0;
  let tLast = 0;
  let hold = null; // a bitten hook dragging a block out
  const rhythm = (n) => 1 - 0.5 * Math.pow(0.55, n);
  const crew = (u, tt) => {
    if (stage !== "pump") return 0;
    const ramp = smoothstep(0, 0.3, tt - tSwitch);
    const hill = clamp(1 - (dir * u) / VMAX, 0, 1);
    return dir * rhythm(pulls) * ramp * hill;
  };
  const hit0 = bore ? [0, Z_BORE] : null;
  const zAxis = ramAxisZ(l, bore);
  if (!bore) {
    const thc = Math.asin(clamp((gap + H.bite) / l, 0, 0.9));
    let th = 0, w = 0;
    const acc = (th, w, tt) => {
      const v = l * w;
      let f = crew(v, tt) * F;
      let c = 90;
      if (stage === "check") {
        f = -clamp(6000 * v, -F, F);
        c = 900;
      }
      if (hold) f -= 3000 * Math.sign(v || -1);
      return (-m * g0 * Math.sin(th) + f * Math.cos(th) - c * v) / (m * l);
    };
    const f2 = (tt, y) => [y[1], acc(y[0], y[1], tt)];
    rec.push(0, { a: 0, v: 0, c: 0 });
    while (t < 40) {
      const y = PH.rk4(f2, t, [th, w], dt);
      const pth = th;
      t += dt;
      th = y[0];
      w = y[1];
      if (stage === "pump" && pth < thc && th >= thc && w > 0) {
        // Impact: interpolate the crossing, then bounce.
        const v = l * w;
        const E = 0.5 * m * v * v;
        const hit = [0, zAxis + l * (1 - Math.cos(thc))];
        const bite = kind === "hook" && E >= 1800;
        const e = kind === "ram" ? H.e * (1 - 0.3 * dmg.D) : bite ? 0 : H.e;
        const tRel = t + 0.42;
        const r = strike(dmg, { kind, E, F, hit, t, tRel });
        const s = { t, v, E, p: m * v, e, Fpk: (m * v * (1 + e)) / ((2 * L) / C_FIR), amp: deg(-maxBack), hit, ev: r.ev, D: r.d.D, extract: r.ev.extract };
        strikes.push(s);
        dmg = r.d;
        snaps.push({ t, d: dmg });
        th = thc;
        w = -e * w;
        if (r.ev.extract) {
          hold = { y0: l * Math.sin(thc), until: 0.4 };
          if (w === 0) w = -1e-3;
        }
        dir = -1;
        tSwitch = t;
        pulls++;
        maxBack = 0;
        tLast = t;
        if (strikes.length >= N || dmg.breach) stage = "check";
      }
      if (hold && hold.y0 - l * Math.sin(th) >= hold.until) {
        // the block clears the face: it drops off the hook here
        const s = strikes[strikes.length - 1];
        const f = s.ev.falls[0];
        if (f) {
          f.anim.slide = t - f.anim.t0;
          f.anim.t1 = t + f.anim.fallT + 0.12;
        }
        hold = null;
      }
      if (th < maxBack) maxBack = th;
      if (stage === "pump") {
        if (dir < 0 && w >= 0 && th < 0) {
          dir = 1;
          tSwitch = t;
          pulls++;
        } else if (dir > 0 && w <= 0) {
          dir = -1;
          tSwitch = t;
          pulls++;
        }
        if (t > 26) stage = "check";
      } else if ((t > tLast + 0.6 && Math.abs(w) < 0.004 && Math.abs(th) < 0.002) || t > tLast + 6) break;
      if (++i % every === 0) rec.push(t, { a: th, v: l * w, c: crew(l * w, t) });
    }
    rec.push(t + 0.25, { a: 0, v: 0, c: 0 });
    t += 0.25;
  } else {
    let x = 0, v = 0;
    const mu = 0.015 * m * g0;
    const acc = (x, v, tt) => {
      let f = crew(v, tt) * F;
      if (stage === "check") f = clamp(-(F / 0.25) * x - 2 * Math.sqrt((F / 0.25) * m) * v, -F, F);
      return (f - mu * Math.tanh(v / 0.05) - 60 * v) / m;
    };
    const f2 = (tt, y) => [y[1], acc(y[0], y[1], tt)];
    rec.push(0, { a: 0, v: 0, c: 0 });
    while (t < 40) {
      const y = PH.rk4(f2, t, [x, v], dt);
      t += dt;
      x = y[0];
      v = y[1];
      const xc = gap + dmg.depth;
      if (stage === "pump" && x >= xc && v > 0) {
        const E = 0.5 * m * v * v;
        const hit = [...hit0];
        const r = strike(dmg, { kind, E, F, hit, t, tRel: t });
        const into = r.d.depth - dmg.depth;
        const s = { t, v, E, p: m * v, e: H.e, Fpk: (m * v * (1 + H.e)) / ((2 * L) / C_FIR), amp: -maxBack, hit, ev: r.ev, D: r.d.D, into };
        strikes.push(s);
        dmg = r.d;
        snaps.push({ t, d: dmg });
        x = xc + into;
        v = -H.e * v;
        dir = -1;
        tSwitch = t;
        pulls++;
        maxBack = 0;
        tLast = t;
        if (strikes.length >= N || dmg.breach) stage = "check";
      }
      if (x < maxBack) maxBack = x;
      if (stage === "pump") {
        if (dir < 0 && x <= -S_BORE) {
          dir = 1;
          tSwitch = t;
          pulls++;
        }
        if (t > 26) stage = "check";
      } else if ((t > tLast + 0.6 && Math.abs(v) < 0.004 && Math.abs(x) < 0.003) || t > tLast + 6) break;
      if (++i % every === 0) rec.push(t, { a: x, v, c: crew(v, t) });
    }
    rec.push(t + 0.25, { a: 0, v: 0, c: 0 });
    t += 0.25;
  }
  return { rec, strikes, snaps, end: t, m, P: { ...P }, dmg0, dmgEnd: dmg, zAxis };
}

// ---------------- parts of the scene, built once per layer and moved by translation ----------------
// A layer captures the parts a draw function makes at a reference pose; while it moves it is put as
// dynamic parts with translated proxies, and once still it is added as static parts (solved once).
function lay(M, name) {
  M._lay = M._lay || {};
  return (M._lay[name] = M._lay[name] || { name, sig: null, parts: [], ids: new Set(), mode: null, off: null, tf: null });
}
function capture(M, fn) {
  const sc = M.scene;
  const real = [sc.put, sc.add];
  const list = [];
  sc.put = sc.add = (p) => list.push(p);
  try {
    fn();
  } finally {
    [sc.put, sc.add] = real;
  }
  return list;
}
const shift = (p, d) => {
  if (!d || (!d[0] && !d[1] && !d[2])) return p;
  const s = p.shape;
  const shape = { ...s, pts: s.pts.map((q) => [q[0] + d[0], q[1] + d[1], q[2] + d[2]]), c: [s.c[0] + d[0], s.c[1] + d[1], s.c[2] + d[2]] };
  return { ...p, shape };
};
function dropPart(M, id) {
  const p = M.scene.parts.get(id);
  if (!p) return;
  p.el.remove();
  M.scene.parts.delete(id);
  M.scene.touch();
}
function place(M, name, sig, fn, { off = [0, 0, 0], tf: tfOff = null, moving = false, jitter = null, layer } = {}) {
  const L = lay(M, name);
  let rebuilt = false;
  if (L.sig !== sig) {
    L.parts = capture(M, fn);
    if (layer !== undefined) L.parts = L.parts.map((p) => (p.layer ? p : { ...p, layer }));
    L.sig = sig;
    rebuilt = true;
  }
  const offKey = off.map((v) => v.toFixed(3)).join(",");
  const ids = new Set(L.parts.map((p) => p.id));
  if (moving) {
    for (const p of L.parts) M.scene.put(shift(p, off));
    if (L.mode === "static") {
      for (const id of L.ids) if (!ids.has(id)) dropPart(M, id);
      M._seal = true;
    }
    L.mode = "dyn";
    L.ids = ids;
  } else if (L.mode !== "static" || rebuilt || L.off !== offKey) {
    if (L.mode === "static") for (const id of L.ids) if (!ids.has(id)) dropPart(M, id);
    for (const p of L.parts) M.scene.add(shift(p, off));
    L.mode = "static";
    L.ids = ids;
    L.off = offKey;
    L.tf = null;
  }
  // The drawn picture moves by the screen image of the translation (plus a shudder).
  const o0 = M.B.at([0, 0, 0]);
  const o1 = M.B.at(tfOff || off);
  let dx = o1[0] - o0[0], dy = o1[1] - o0[1];
  if (jitter) {
    dx += jitter[0];
    dy += jitter[1];
  }
  const tf = Math.abs(dx) < 0.005 && Math.abs(dy) < 0.005 ? "" : `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`;
  if (tf !== L.tf || rebuilt || moving) {
    for (const id of ids) {
      const el = M.scene.parts.get(id)?.el;
      if (!el || el.__tf === tf) continue;
      if (tf) el.setAttribute("transform", tf);
      else el.removeAttribute("transform");
      el.__tf = tf;
    }
    L.tf = tf;
  }
}

// ---------------- drawing ----------------
// Painter layers by depth for this camera family (viewer on +x): the far wall, the interior, the near
// wall and the roof. Anything in a later layer is never behind anything in an earlier one.
const LY = { far: 0, mid: 1, near: 2, roof: 3, cover: 4, lash: 5, crest: 6 };
const side = (sx) => (sx > 0 ? LY.near : LY.far);
function drawShed(B) {
  const fr = { mat: "oak", sys: "frame" };
  // Sills on the bearing blocks, transoms between them.
  for (const sx of [-1, 1]) {
    B.beam(`sill${sx}`, w(sx * HX, 0, (ZS0 + ZS1) / 2), w(sx * HX, LS, (ZS0 + ZS1) / 2), { w: SB * S, h: (ZS1 - ZS0) * S, up: Z, ...fr, grain: 2, nails: STATIONS.map((y) => ({ s: y * S, face: "-u", x: [-0.45, 0.45] })), layer: side(sx) });
  }
  STATIONS.forEach((y, i) => B.beam(`transom${i}`, w(-HX + SB / 2, y, (ZS0 + ZS1) / 2), w(HX - SB / 2, y, (ZS0 + ZS1) / 2), { w: 0.28 * S, h: (ZS1 - ZS0) * S, up: Z, ...fr, grain: 1, layer: LY.mid }));
  AXLES.forEach((y, i) => {
    for (const sx of [-1, 1]) {
      // iron straps round the bearing block, drawn on its outer face, with their bolts
      const straps = sx > 0 ? B.L([-0.17, 0.17].map((dy) => k.pathOf([B.at(w(XO, y + dy, 0.4)), B.at(w(XO, y + dy, ZS0))])).join(""), { tone: "hi" }) + B.D([-0.17, 0.17].flatMap((dy) => [B.at(w(XO, y + dy, 0.47)), B.at(w(XO, y + dy, 0.63))]), { size: 0.6, tone: "hi" }) : "";
      B.slab(`bearing${i}${sx}`, { x: (sx * HX - SB / 2) * S, y: (y - 0.24) * S, w: SB * S, d: 0.48 * S, r: 0.6 }, 0.4 * S, (ZS0 - 0.4) * S, { mat: "oak", sys: "wheels", steps: 2, bevel: 0.3, tone: "mid", layer: side(sx), over: straps });
      B.cyl(`axleStub${i}${sx}`, w(sx * XO, y, ZAX), w(sx * XW[0], y, ZAX), 0.085 * S, { mat: "iron", sys: "wheels", layer: side(sx) });
    }
    B.cyl(`axle${i}`, w(-HX + SB / 2, y, ZAX), w(HX - SB / 2, y, ZAX), 0.085 * S, { mat: "oak", sys: "wheels", seams: [0.15 * S, (2 * HX - SB - 0.15) * S], layer: LY.mid });
  });
  // Posts, wall plates and tie beams.
  for (const sx of [-1, 1]) {
    STATIONS.forEach((y, i) => B.beam(`post${sx}${i}`, w(sx * HX, y, ZS1), w(sx * HX, y, ZT0), { w: SB * S, h: 0.26 * S, up: [0, 1, 0], ...fr, grain: 2, pegs: [{ s: 0.16 * S, face: "u", x: 0 }, { s: (ZT0 - ZS1 - 0.16) * S, face: "u", x: 0 }], layer: side(sx) }));
    B.beam(`plate${sx}`, w(sx * HX, 0, (ZT0 + ZT1) / 2), w(sx * HX, LS, (ZT0 + ZT1) / 2), { w: SB * S, h: (ZT1 - ZT0) * S, up: Z, ...fr, grain: 2, pegs: STATIONS.map((y) => ({ s: y * S, face: "-u", x: 0 })), layer: side(sx) });
    // Knee braces in the side frames.
    for (const [y0, y1] of [[STATIONS[0] + 0.13, STATIONS[0] + 0.95], [STATIONS[1] - 0.13, STATIONS[1] - 0.95], [STATIONS[2] + 0.13, STATIONS[2] + 0.95], [STATIONS[3] - 0.13, STATIONS[3] - 0.95]]) {
      B.beam(`brace${sx}${y0}`, w(sx * HX, y0, ZT0 - 0.82), w(sx * HX, y1, ZT0), { w: 0.16 * S, h: 0.14 * S, up: [0, Math.sign(y1 - y0), -1], ...fr, nails: [{ s: 0.12 * S, face: "-u", x: 0 }], layer: side(sx) });
    }
  }
  STATIONS.forEach((y, i) => B.beam(`tie${i}`, w(-HX + SB / 2, y, (ZT0 + ZT1) / 2), w(HX - SB / 2, y, (ZT0 + ZT1) / 2), { w: 0.26 * S, h: (ZT1 - ZT0) * S, up: Z, ...fr, grain: 2, layer: LY.mid }));
  // Cross braces under the end ties.
  for (const i of [0, 3]) for (const sx of [-1, 1]) B.beam(`xbrace${i}${sx}`, w(sx * (HX - SB / 2), STATIONS[i], ZT0 - 0.7), w(sx * (HX - SB / 2 - 0.7), STATIONS[i], ZT0), { w: 0.12 * S, h: 0.12 * S, up: [-sx, 0, 1], ...fr, layer: LY.mid });
  // Eye bolts for the suspension ropes under the two middle ties.
  for (const y of SUSP) for (const sx of [-1, 1]) {
    B.slab(`washer${y}${sx}`, { x: (sx * 0.5 - 0.07) * S, y: (y - 0.07) * S, w: 0.14 * S, d: 0.14 * S, r: 0.4 }, (ZT0 - 0.015) * S, 0.015 * S, { mat: "iron", sys: "suspension", steps: 2, layer: LY.mid });
    B.ring(`bolt${y}${sx}`, w(sx * 0.5, y - 0.018, ZT0 - 0.075), w(sx * 0.5, y + 0.018, ZT0 - 0.075), 0.028 * S, 0.06 * S, { mat: "iron", sys: "suspension", layer: LY.mid });
  }
  // King posts and the ridge beam.
  for (const y of [STATIONS[1], STATIONS[2]]) B.beam(`king${y}`, w(0, y, ZT1), w(0, y, 5.52), { w: 0.18 * S, h: 0.18 * S, up: [0, 1, 0], ...fr, pegs: [{ s: 0.12 * S, face: "u", x: 0 }], layer: LY.mid });
  B.beam("ridge", w(0, 0.08, 5.67), w(0, LS - 0.08, 5.67), { w: 2 * XR * S, h: 0.3 * S, up: Z, mat: "oak", sys: "roof", grain: 1, layer: LY.roof });
  // Rafters, both slopes; the near slope is cut away.
  for (const sx of [-1, 1]) {
    const n = [sx * SPI, 0, CP];
    const xa = XE - 0.04, xb = XR + 0.01;
    const LR = dot(n, B.V) > 0.02 ? LY.roof : LY.far; // a slope seen from below sits behind the frame
    RAFTERS.forEach((y, i) => {
      const za = zRafB(xa) + 0.09 / CP, zb = zRafB(xb) + 0.09 / CP;
      B.beam(`rafter${sx}${i}`, w(sx * xa, y, za), w(sx * xb, y, zb), { w: 0.14 * S, h: 0.18 * S, up: n, mat: "oak", sys: "roof", cut: sx > 0 || undefined, layer: LR });
    });
  }
  // Boards and hides on each slope. A slope turned away from the camera (the far one at a low tilt)
  // shows its underside: then its covering lies behind the frame, in the far layer.
  for (const sx of [-1, 1]) {
    const near = sx > 0;
    const cut = near || undefined;
    const d = [sx * CP, 0, -SPI];
    const n = [sx * SPI, 0, CP];
    const up = dot(n, B.V) > 0.02;
    const LC = up ? LY.cover : LY.far;
    const LL = up ? LY.lash : LY.far;
    const o = [sx * XR, 0, zRoof(XR)];
    const Ls = (XE - XR) / CP;
    const FB = { o: W3(o), a: [0, 1, 0], u: d, v: n };
    const plankLines = [];
    for (let u = 0.3; u < Ls - 0.1; u += 0.3) plankLines.push(k.pathOf([B.at(W3(add(o, add(mul(d, u), mul(n, 0.04))))), B.at(W3(add(add(o, [0, -0.15, 0]), add(mul(d, u), mul(n, 0.04)))))]));
    B.prism(`boards${sx}`, { ...FB, o: W3(add(o, [0, -0.15, 0])) }, [[0, 0], [Ls * S, 0], [Ls * S, 0.04 * S], [0, 0.04 * S]], 0, (LS + 0.3) * S, { mat: "wood", sys: "roof", cut, tone: "mid", layer: LC });
    // Ox-hides: four per slope in two layers, overlapping like shingles, run over the eave.
    const spans = [[-0.2, 2.3], [2.05, 4.5], [4.25, 6.6], [6.35, 8.7]];
    if (up) spans.forEach(([y0, y1], i) => {
      const lift = 0.04 + (i % 2 ? 0.026 : 0);
      const R = rng(30 + i * 7 + (near ? 0 : 50));
      const j = () => (R() - 0.5) * 0.08;
      const uEnd = Ls + 0.05;
      const poly = [[-0.06, y0 + 0.06 + j()], [uEnd * 0.5, y0 + j()], [uEnd + j() * 0.5, y0 + 0.05], [uEnd + 0.02, (y0 + y1) / 2 + j()], [uEnd + j() * 0.5, y1 - 0.04], [uEnd * 0.5, y1 + j()], [-0.06, y1 - 0.05 + j()]].map(([u, y]) => [u * S, y * S]);
      const FH = { o: W3(o), a: n, u: d, v: [0, 1, 0] };
      B.prism(`hide${sx}${i}`, FH, poly, lift * S, (lift + 0.026) * S, { mat: "hide", sys: "roof", cut, tone: "hi", layer: LC, inner: B.L(hideTexture(B, o, d, n, y0, y1, uEnd, lift + 0.026, i), { tone: "faint" }) });
    });
    // Hanging flaps on the near side (the far ones face away).
    if (near) {
      const xF = sx * (XO + (XE - XO) + 0.035);
      spans.forEach(([y0, y1], i) => {
        const R = rng(90 + i);
        const top = zRoof(XE) + 0.02;
        const pts = [[y0 + 0.03, top], [y1 - 0.03, top]];
        const nb = 7;
        for (let q = nb; q >= 0; q--) {
          const y = y1 - 0.05 - ((y1 - y0 - 0.1) * (nb - q)) / nb;
          pts.push([y, top - 0.5 - 0.12 * Math.sin(q * 1.9 + i) - R() * 0.06]);
        }
        const FF = { o: [xF * S, 0, 0], a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] };
        const lift = i % 2 ? 0.026 : 0;
        B.prism(`flap${i}`, FF, pts.map(([y, z]) => [y * S, z * S]), lift * S, (lift + 0.024) * S, { mat: "hide", sys: "roof", cut: true, convex: false, tone: "hi", layer: LY.cover });
      });
    }
    // Lashings over the hides, knotted at the eave.
    if (up) [1.05, 3.25, 5.35, 7.55].forEach((y, i) => {
      const lift = 0.04 + 0.052 + 0.012;
      const edge = add(add(o, mul(d, Ls + 0.04)), add([0, y, 0], mul(n, lift)));
      const mid = add(add(o, mul(d, 0.02)), add([0, y, 0], mul(n, lift)));
      const svg = `<path class="iso-line cord" data-tone="mid" style="stroke-width:0.9px" d="${k.pathOf([B.at(W3(mid)), B.at(W3(edge))])}"/>` + B.D([B.at(W3(edge))], { size: 0.9, tone: "hi" });
      B.marks(`lash${sx}${i}`, svg, [W3(mid), W3(edge)], { r: 0.3, sys: "roof", cut, mat: "rope", layer: LL });
    });
  }
  B.cyl("ridgeRoll", w(0, -0.22, 5.92), w(0, LS + 0.22, 5.92), 0.1 * S, { mat: "hide", sys: "roof", layer: LY.crest, seams: [1.05, 3.25, 5.35, 7.55].map((y) => (y + 0.22) * S), seamTone: "mid" });
  // Gables, boarded, front and back.
  for (const [i, y0] of [[0, 0.03], [1, LS - 0.08]]) {
    const poly = [[-XO, ZT1], [XO, ZT1], [0.18, 5.52], [-0.18, 5.52]].map(([x, z]) => [x * S, z * S]);
    const F = { o: [0, y0 * S, 0], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] };
    const lines = [];
    for (let x = -XO + 0.24; x < XO - 0.1; x += 0.24) {
      const zt = Math.min(5.52, ZT1 + (XO - Math.abs(x)) * ((5.52 - ZT1) / (XO - 0.18)));
      if (zt - ZT1 > 0.05) lines.push(k.pathOf([B.at(w(x, y0 + 0.05, ZT1)), B.at(w(x, y0 + 0.05, zt))]));
    }
    B.prism(`gable${i}`, F, poly, 0, 0.05 * S, { mat: "wood", sys: "frame", tone: "mid", layer: LY.roof, inner: B.L(lines.join(""), { tone: "faint" }) });
  }
  // Side boards in three panels a side, with ledgers outside on the near side.
  for (const sx of [-1, 1]) {
    const near = sx > 0;
    const x0 = sx > 0 ? XO : -XO - 0.05;
    [[0.02, STATIONS[1]], [STATIONS[1], STATIONS[2]], [STATIONS[2], LS - 0.02]].forEach(([y0, y1], i) => {
      const xf = near ? XO + 0.05 : -XO;
      const lines = [];
      for (let y = y0 + 0.24; y < y1 - 0.08; y += 0.24) lines.push(k.pathOf([B.at(w(xf, y, ZS1)), B.at(w(xf, y, ZT1))]));
      B.slab(`boards${sx}${i}`, { x: x0 * S, y: y0 * S, w: 0.05 * S, d: (y1 - y0) * S, r: 0.1 }, ZS1 * S, (ZT1 - ZS1) * S, { mat: "wood", sys: "frame", steps: 1, cut: near || undefined, tone: "mid", layer: side(sx), inner: B.L(lines.join(""), { tone: "faint" }) });
      if (near) for (const zl of [1.55, 3.55]) {
        B.slab(`ledger${i}${zl}`, { x: (XO + 0.05) * S, y: (y0 + 0.08) * S, w: 0.035 * S, d: (y1 - y0 - 0.16) * S, r: 0.1 }, zl * S, 0.16 * S, { mat: "wood", sys: "frame", steps: 1, cut: true, tone: "mid", layer: LY.near, over: B.D(Array.from({ length: Math.floor((y1 - y0) / 0.24) }, (_, q) => B.at(w(XO + 0.085, y0 + 0.2 + q * 0.24, zl + 0.08))), { size: 0.45, tone: "hi" }) });
      }
    });
  }
}

// Rows of hair, faint, on a hide; each runs edge to edge of the hide along the slope.
function hideTexture(B, o, d, n, y0, y1, uEnd, lift, i) {
  const lines = [];
  for (let q = 1; q <= 3; q++) {
    const y = y0 + ((y1 - y0) * q) / 4 + ((i * 13 + q * 7) % 5) * 0.03 - 0.06;
    const pts = [];
    for (let u = 0; u <= uEnd; u += uEnd / 6) pts.push(B.at(W3(add(add(o, mul(d, u)), add([0, y + Math.sin(u * 3 + q) * 0.05, 0], mul(n, lift + 0.001))))));
    lines.push(k.pathOf(pts));
  }
  return lines.join("");
}

// Six solid wheels: the discs, hubs and caps are round, so they are drawn once with the shed.
function drawWheelDiscs(B) {
  AXLES.forEach((y, i) => {
    for (const sx of [-1, 1]) {
      const xa = sx * XW[0], xb = sx * XW[1];
      const L = (XW[1] - XW[0]) * S;
      B.cyl(`wheel${i}${sx}`, w(xa, y, ZAX), w(xb, y, ZAX), RW * S, { mat: "oak", sys: "wheels", seams: [0.02 * S, L - 0.02 * S], seamTone: "lo", faceRing: [{ s: sx > 0 ? L : 0, r: (RW - 0.05) * S, tone: "lo" }], layer: side(sx) });
      B.cyl(`hub${i}${sx}`, w(xb, y, ZAX), w(sx * (XW[1] + 0.1), y, ZAX), 0.13 * S, { mat: "oak", sys: "wheels", bolts: sx > 0 ? [{ s: 0.1 * S, r: 0.095 * S, count: 6, size: 0.45 }] : undefined, layer: side(sx) });
      B.cyl(`cap${i}${sx}`, w(sx * (XW[1] + 0.1), y, ZAX), w(sx * (XW[1] + 0.16), y, ZAX), 0.07 * S, { mat: "iron", sys: "wheels", layer: side(sx) });
    }
  });
}
// What shows the wheels turning: plank joints, tyre nails, battens and linchpins on the near wheels,
// and the two handspikes seated in a socket of each rear wheel's tread. phi: wheel turn (rad).
function drawWheelMarks(B, phi, lever) {
  const u = [0, Math.cos(phi), Math.sin(phi)];
  const v = [0, -Math.sin(phi), Math.cos(phi)];
  const xb = XW[1];
  AXLES.forEach((y, i) => {
    const c = [0, y, ZAX];
    const at = (a, b) => W3(add([xb + 0.002, 0, 0], add(c, add(mul(u, a), mul(v, b)))));
    const joints = [-0.15, 0.15].map((b) => {
      const a = Math.sqrt(RW * RW - b * b) - 0.05;
      return k.pathOf([B.at(at(-a, b)), B.at(at(a, b))]);
    });
    const nails = Array.from({ length: 10 }, (_, q) => B.at(at((RW - 0.03) * Math.cos((q / 10) * TAU), (RW - 0.03) * Math.sin((q / 10) * TAU))));
    const ring = Array.from({ length: 8 }, (_, q) => at(RW * 0.9 * Math.cos((q / 8) * TAU), RW * 0.9 * Math.sin((q / 8) * TAU)));
    B.marks(`wface${i}`, B.L(joints.join(""), { tone: "lo" }) + B.D(nails, { size: 0.45, tone: "hi" }), ring, { r: 0.2, sys: "wheels", mat: "oak", layer: LY.near });
    for (const a of [-0.2, 0.2]) {
      const p0 = add(add(c, mul(u, a)), add(mul(v, -0.33), [xb + 0.02, 0, 0]));
      const p1 = add(add(c, mul(u, a)), add(mul(v, 0.33), [xb + 0.02, 0, 0]));
      B.beam(`batten${i}${a}`, W3(p0), W3(p1), { w: 0.1 * S, h: 0.04 * S, up: [1, 0, 0], mat: "oak", sys: "wheels", nails: [{ s: 0.1 * S, face: "v", x: 0 }, { s: 0.56 * S, face: "v", x: 0 }], layer: LY.near });
    }
    const pin = [XW[1] + 0.13, y, ZAX];
    B.beam(`linchpin${i}`, W3(add(pin, mul(v, -0.11))), W3(add(pin, mul(v, 0.11))), { w: 0.025 * S, h: 0.025 * S, up: [1, 0, 0], mat: "iron", sys: "wheels", layer: LY.near });
  });
  const y = AXLES[2];
  for (const sx of [-1, 1]) {
    const dir = [0, Math.sin(lever), Math.cos(lever)];
    const x = sx * ((XW[0] + XW[1]) / 2);
    const p0 = add([x, y, ZAX], mul(dir, RW - 0.05));
    const p1 = add([x, y, ZAX], mul(dir, RW + 1.9));
    B.cyl(`spike${sx}`, W3(p0), W3(p1), 0.04 * S, { mat: "oak", sys: "wheels", faceRing: [{ s: 1.95 * S, r: 0.025 * S }], layer: side(sx) });
    B.cyl(`spikeShoe${sx}`, W3(p0), W3(add(p0, mul(dir, 0.12))), 0.045 * S, { mat: "iron", sys: "wheels", layer: side(sx) });
  }
}

// The trough with its rollers, installed for the bore.
function drawTrough(B) {
  const y0 = -0.9, y1 = LS;
  for (const sx of [-1, 1]) B.beam(`trough${sx}`, w(sx * 0.27, y0, (ZS1 + ROLL.z + 0.02) / 2), w(sx * 0.27, y1, (ZS1 + ROLL.z + 0.02) / 2), { w: 0.12 * S, h: (ROLL.z + 0.02 - ZS1) * S, up: Z, mat: "oak", sys: "suspension", nails: Array.from({ length: 15 }, (_, q) => ({ s: (0.3 + q * 0.6) * S, face: "-u", x: 0.3 })) });
  for (let q = 0; q < 15; q++) {
    const y = y0 + 0.3 + q * 0.6;
    B.cyl(`roller${q}`, w(-0.21, y, ROLL.z), w(0.21, y, ROLL.z), ROLL.r * S, { mat: "oak", sys: "suspension", seams: [0.04 * S, 0.38 * S], seamTone: "lo" });
  }
  // a stop block at the cantilevered front end
  B.slab("troughStop", { x: -0.33 * S, y: (y0 - 0.1) * S, w: 0.66 * S, d: 0.1 * S, r: 0.4 }, ZS1 * S - 0.0, (ROLL.z - ZS1 - 0.03) * S, { mat: "iron", sys: "suspension", steps: 2 });
}

// The ram beam with bands, eyes, langets and tail cap, at shed y = 0, at rest.
function drawRam(B, gm) {
  const { L, z, y0, y1 } = gm;
  const bands = bandsFor(L);
  B.beam("ram", w(0, y0, z), w(0, y1, z), { w: BEAMW * S, h: BEAMW * S, up: Z, round: 0.05 * S, mat: "wood", sys: "ram", grain: 2, bands: bands.map((s) => ({ at: s * S, w: 0.12 * S, t: 0.018 * S })), nailSize: 0.45 });
  for (const ys of SUSP) B.ring(`ramEye${ys}`, w(0, ys - 0.025, z + EYE), w(0, ys + 0.025, z + EYE), 0.035 * S, 0.065 * S, { mat: "iron", sys: "suspension" });
  for (const ys of PULL) for (const sx of [-1, 1]) B.ring(`pullEye${ys}${sx}`, w(sx * 0.283, ys - 0.02, z), w(sx * 0.283, ys + 0.02, z), 0.03 * S, 0.062 * S, { mat: "iron", sys: "ram" });
  // tail cap and ring
  B.beam("ramCap", w(0, y1, z), w(0, y1 + 0.03, z), { w: 0.42 * S, h: 0.42 * S, up: Z, mat: "iron", sys: "ram", nails: [] });
  B.ring("ramTailRing", w(-0.02, y1 + 0.03 + 0.07, z), w(0.02, y1 + 0.03 + 0.07, z), 0.04 * S, 0.075 * S, { mat: "iron", sys: "ram" });
  // langets: iron straps from the head's sleeve back along four faces
  const top = BEAMW / 2;
  B.beam("langetT", w(0, y0, z + top + 0.01), w(0, y0 + 0.94, z + top + 0.01), { w: 0.14 * S, h: 0.02 * S, up: Z, mat: "iron", sys: "head", nails: [0.18, 0.5, 0.82].map((s) => ({ s: s * S, face: "v", x: 0 })), nailSize: 0.55 });
  B.beam("langetB", w(0, y0, z - top - 0.01), w(0, y0 + 0.94, z - top - 0.01), { w: 0.14 * S, h: 0.02 * S, up: Z, mat: "iron", sys: "head" });
  for (const sx of [-1, 1]) B.beam(`langet${sx}`, w(sx * (top + 0.01), y0, z), w(sx * (top + 0.01), y0 + 0.94, z), { w: 0.02 * S, h: 0.14 * S, up: Z, mat: "iron", sys: "head", nails: [0.18, 0.5, 0.82].map((s) => ({ s: s * S, face: sx > 0 ? "-u" : "u", x: 0 })), nailSize: 0.55 });
}

// A head on the beam's front end. base: the end's centre (units), sc: units per metre, axis toward −y.
// clip: the largest s (metres from the sleeve's back) that is still outside the wall.
function drawHead(B, kind, base, sc, o = {}) {
  const a = o.dir || [0, -1, 0];
  const v = o.up || [0, 0, 1];
  const u = cross(v, a);
  const pt = (s, x, zz) => add(base, add(mul(a, s * sc), add(mul(u, x * sc), mul(v, zz * sc))));
  const H = HEADS[kind];
  const id = o.id || "head";
  const clip = o.clip ?? Infinity;
  const vis = { sys: "head", lit: o.lit, layer: o.layer };
  const sl = Math.min(H.sleeve, clip);
  if (sl > 0.02) {
    const rivets = [0.08, H.sleeve - 0.08].filter((s) => s < sl).flatMap((s) => [{ s: s * sc, face: "u", x: [-0.6, 0, 0.6] }, { s: s * sc, face: "-u", x: [-0.6, 0, 0.6] }, { s: s * sc, face: "v", x: [-0.6, 0, 0.6] }]);
    B.beam(`${id}.sleeve`, pt(0, 0, 0), pt(sl, 0, 0), { w: 0.48 * sc, h: 0.48 * sc, up: v, round: 0.025 * sc, mat: "iron", ...vis, nails: rivets, nailSize: 0.5, nailTone: "hi" });
  }
  const F = { o: pt(H.sleeve, 0, 0), a, u, v };
  const cut = (prof) => {
    const lim = clip - H.sleeve;
    if (lim <= 0) return null;
    const out = [];
    for (let i = 0; i < prof.length; i++) {
      const [s, r, sm] = prof[i];
      if (s <= lim) out.push(prof[i]);
      else {
        const [s0, r0] = prof[i - 1] || [0, r];
        const r1 = r0 + ((r - r0) * (lim - s0)) / (s - s0 || 1);
        if (lim - s0 > 0.005) out.push([lim, r1, sm]);
        break;
      }
    }
    return out.length > 1 ? out.map(([s, r, sm]) => (sm ? [s * sc, r * sc, 1] : [s * sc, r * sc])) : null;
  };
  if (kind === "ram") {
    const prof = cut([[0, 0.25], [0.04, 0.262, 1], [0.13, 0.276, 1], [0.24, 0.27, 1], [0.34, 0.246, 1], [0.43, 0.21, 1], [0.5, 0.168, 1], [0.54, 0.13, 1], [0.555, 0.09], [0.555, 0]]);
    if (prof) {
      const eyes = [-1, 1].map((sx) => B.at(pt(0.3, sx * 0.205, 0.13)));
      B.turned(`${id}.skull`, F, prof, { mat: "bronze", ...vis, tone: "hi", smooth: "auto", over: B.D(eyes.filter((_, i) => dot(mul(u, i ? 1 : -1), B.V) > -0.2), { size: 0.9, tone: "hi" }), seams: [[0.04 * sc, 0.262 * sc]] });
    }
    // Horns: ribbed spirals curling back, down and forward from the crown.
    if (clip > H.sleeve + 0.2) for (const sx of [-1, 1]) {
      const pts = [];
      for (let q = 0; q <= 22; q++) {
        const f = q / 22;
        const ph = rad(95 + f * 300);
        const r = 0.24 - 0.15 * f;
        const s = H.sleeve + 0.13 + r * Math.cos(ph);
        const zz = -0.02 + r * Math.sin(ph);
        const x = sx * (0.17 + 0.16 * smoothstep(0, 0.3, f) + 0.02 * f);
        pts.push(pt(s, x, zz));
      }
      B.rope(`${id}.horn${sx}`, pts, 0.05 * sc, { mat: "bronze", ...vis, twist: true, lay: 0, pitch: 0.07 * sc, maxLength: 0.5 * sc, tone: "hi" });
    }
  } else if (kind === "bore") {
    const prof = cut([[0, 0.23], [0.07, 0.23], [0.07, 0.205], [0.12, 0.2], [0.95, 0.0]]);
    if (prof) {
      const lim = Math.min(0.95, clip - H.sleeve);
      const s1 = Math.min(0.95, lim) * 0.94;
      const rAt = (q) => (0.2 * (0.95 - q)) / 0.83 + 0.003;
      const flutes = s1 > 0.25 ? k.fadedSvg(G.ribsOf(F, 0.14 * sc, s1 * sc, rAt(0.14) * sc, 8, B.P, { twist: 2.4 * (s1 / 0.9), r1: rAt(s1) * sc, fade: [0.1, 0.55] }), { tone: "lo" }) : "";
      B.turned(`${id}.point`, F, prof, { mat: "iron", ...vis, tone: "hi", inner: flutes, seams: [[0.07 * sc, 0.23 * sc]] });
    }
  } else if (kind === "hook") {
    // falx muralis: a long square spike with a point, and a recurved barb that catches the joint
    const SP = 0.44;
    const lim = clip - H.sleeve;
    const sp = Math.min(SP, lim);
    if (sp > 0.02) B.beam(`${id}.spike`, pt(H.sleeve, 0, 0), pt(H.sleeve + sp, 0, 0), { w: 0.16 * sc, h: 0.16 * sc, up: v, round: 0.02 * sc, mat: "iron", ...vis, nails: [{ s: 0.06 * sc, face: "u", x: 0 }, { s: 0.06 * sc, face: "-u", x: 0 }] });
    const prof = cut([[SP, 0.09], [SP + 0.3, 0.0]]);
    if (prof && lim > SP) B.turned(`${id}.tip`, F, [[SP * sc, 0.09 * sc], ...prof.slice(1)], { mat: "iron", ...vis, tone: "hi", smooth: false });
    const barb = [[0.36, 0.08], [0.45, 0.2], [0.45, 0.36], [0.37, 0.47], [0.22, 0.51], [0.08, 0.47]].map(([s, zz]) => pt(H.sleeve + s, 0, zz));
    if (lim > SP) {
      B.rope(`${id}.barb`, barb, 0.05 * sc, { mat: "iron", ...vis, twist: false, maxLength: 0.25 * sc, tone: "hi" });
      const end = barb[barb.length - 1];
      const dirB = unit(sub(end, barb[barb.length - 2]));
      B.turned(`${id}.barbTip`, G.frameAlong(end, dirB), [[0, 0.05 * sc], [0.16 * sc, 0]], { mat: "iron", ...vis, tone: "hi", smooth: false });
    }
  }
}

// Suspension ropes (V-pairs) or, for the bore, the ropes stowed in coils; the crew's pull ropes.
function drawRopes(B, gm, off, crew, bore, yf) {
  const ropeR = 0.032 * S;
  for (const ys of SUSP) {
    for (const sx of [-1, 1]) {
      const top = [sx * 0.5, ys + yf, ZT0 - 0.075 - 0.045];
      if (bore) {
        const low = add(top, [0, 0, -0.42]);
        B.rope(`susp${ys}${sx}`, [W3(top), W3(low)], ropeR, { sys: "suspension", maxLength: 40 });
        B.ring(`coil${ys}${sx}`, W3(add(low, [0, 0, -0.04])), W3(add(low, [0, 0, 0.04])), 0.06 * S, 0.14 * S, { mat: "rope", sys: "suspension" });
      } else {
        const eye = add(add([0, ys, gm.z + EYE], off), [sx * 0.03, 0, 0.04]);
        B.rope(`susp${ys}${sx}`, [W3(top), W3(eye)], ropeR, { sys: "suspension", maxLength: 30 });
      }
    }
  }
  // Pull ropes from the side eyes to toggle handles where the crew's hands are.
  for (const ys of PULL) {
    for (const sx of [-1, 1]) {
      const eye = add([sx * 0.33, ys, gm.z], off);
      const hand = [sx * 0.68, eye[1] + 0.55 - 0.35 * crew, 1.08];
      const sag = lerp(eye, hand, 0.5);
      sag[2] -= 0.06 + 0.1 * (1 - Math.abs(crew));
      B.rope(`pull${ys}${sx}`, [W3(eye), W3(sag), W3(hand)], 0.02 * S, { sys: "ram", twist: false, maxLength: 60 });
      B.cyl(`handle${ys}${sx}`, W3(add(hand, [0, -0.17, 0])), W3(add(hand, [0, 0.17, 0])), 0.028 * S, { mat: "oak", sys: "ram", faceRing: [] });
    }
  }
}

// The struck zone: the rubble core (split round any breach), the zone's blocks with their cracks,
// fallen blocks at rest and loose rubble.
function drawZone(B, d, settled) {
  const hole = new Set(d.hole);
  const outCells = new Set();
  BLOCKS.forEach((b, i) => d.blocks[i].out && b.cells.forEach((c) => outCells.add(c)));
  const coreBox = (id, x0, x1, z0, z1) => {
    const over = rubbleFace(B, x0, x1, z0, z1, outCells, hole);
    const end = x1 >= WX - 1e-6 ? endSection(B, z0, z1) : "";
    B.slab(`core.${id}`, { x: x0 * S, y: -WT * S, w: (x1 - x0) * S, d: (WT - FT) * S, r: 0 }, z0 * S, (z1 - z0) * S, { mat: "granite", sys: "wall", steps: 1, tone: "mid", over: over + end });
  };
  if (!hole.size) coreBox("all", -WX, WX, 0, WH);
  else {
    const cells = [...hole].map((c) => c.split(",").map(Number));
    const i0 = Math.min(...cells.map((c) => c[0])), i1 = Math.max(...cells.map((c) => c[0]));
    const j0 = Math.min(...cells.map((c) => c[1])), j1 = Math.max(...cells.map((c) => c[1]));
    const X0 = -2.4 + i0 * 0.6, X1 = -2.4 + (i1 + 1) * 0.6, Z0 = 0.6 + j0 * 0.6, Z1 = 0.6 + (j1 + 1) * 0.6;
    coreBox("left", -WX, X0, 0, WH);
    coreBox("right", X1, WX, 0, WH);
    coreBox("below", X0, X1, 0, Z0);
    coreBox("above", X0, X1, Z1, WH);
    for (let j = j0; j <= j1; j++) {
      let run = null;
      for (let i = i0; i <= i1 + 1; i++) {
        const solid = i <= i1 && !hole.has(cellKey(i, j));
        if (solid && run === null) run = i;
        if (!solid && run !== null) {
          coreBox(`r${j}.${run}`, -2.4 + run * 0.6, -2.4 + i * 0.6, 0.6 + j * 0.6, 0.6 + (j + 1) * 0.6);
          run = null;
        }
      }
    }
  }
  // Blocks of the struck zone.
  const main = d.hit || [0, 1.8];
  BLOCKS.forEach((b, i) => {
    const s = d.blocks[i];
    if (s.out) return;
    const yF = -s.push;
    const y0 = s.push > 0 ? -FT : -FT - s.push;
    const over = blockMarks(B, b, s, d, yF, main, i);
    B.slab(`block${i}`, { x: b.x0 * S, y: y0 * S, w: (b.x1 - b.x0) * S, d: (yF - y0) * S, r: 0.3 }, b.z0 * S, CO * S, { mat: "stone", sys: "wall", steps: 1, bevel: 0.25, tone: "mid", over });
  });
  // Fallen blocks lying where they came to rest, and rubble.
  d.fallen.forEach((f, n) => {
    if (n >= settled) return;
    const [x, y, yaw] = SLOTS[f.slot];
    const a = rad(yaw);
    const Fb = { o: w(x, y, 0), a: [0, 0, 1], u: [Math.cos(a), Math.sin(a), 0], v: [-Math.sin(a), Math.cos(a), 0] };
    B.prism(`fallen${n}`, Fb, polyRound(1.2 * S, 0.6 * S, 0.4), 0, 0.4 * S, { mat: "stone", sys: "wall", tone: "hi", over: B.L(k.pathOf(polyRound(1.1 * S, 0.5 * S, 0.4).map(([p, q]) => B.at(add(Fb.o, add(mul(Fb.u, p), add(mul(Fb.v, q), [0, 0, 0.4 * S]))))), true), { tone: "faint" }) });
  });
  for (let n = 0; n < Math.min(d.rubble, RUBBLE.length); n++) {
    const [x, y, r] = RUBBLE[n];
    looks.stone(B, `rubble${n}`, w(x, y, r * 0.85), r * S, { mat: n % 3 ? "stone" : "granite", seed: n + 3, pits: 3, sys: "wall" });
  }
}

// Rubble texture on the core's front face where the facing is gone (not where it is holed).
function rubbleFace(B, x0, x1, z0, z1, outCells, hole) {
  const pts = [];
  const lines = [];
  for (const c of outCells) {
    if (hole.has(c)) continue;
    const [i, j] = c.split(",").map(Number);
    const cx0 = -2.4 + i * 0.6, cz0 = 0.6 + j * 0.6;
    if (cx0 < x0 - 1e-6 || cx0 + 0.6 > x1 + 1e-6 || cz0 < z0 - 1e-6 || cz0 + 0.6 > z1 + 1e-6) continue;
    const R = rng(i * 31 + j * 7 + 5);
    for (let q = 0; q < 6; q++) pts.push(B.at(w(cx0 + 0.06 + R() * 0.48, -FT, cz0 + 0.06 + R() * 0.48)));
    for (let q = 0; q < 2; q++) {
      const cx = cx0 + 0.12 + R() * 0.36, cz = cz0 + 0.12 + R() * 0.36, rr = 0.06 + R() * 0.05;
      lines.push(k.pathOf(Array.from({ length: 7 }, (_, m) => B.at(w(cx + rr * Math.cos((m / 7) * TAU) * (0.8 + 0.3 * R()), -FT, cz + rr * 0.7 * Math.sin((m / 7) * TAU)))), true));
    }
  }
  return (lines.length ? B.L(lines.join(""), { tone: "lo" }) : "") + (pts.length ? B.D(pts, { size: 0.5, tone: "mid" }) : "");
}

// The wall's end section on its +x face: the two facings and the rubble core between them.
function endSection(B, z0, z1) {
  const x = WX;
  const lines = [-FT, -WT + FT].map((y) => k.pathOf([B.at(w(x, y, z0)), B.at(w(x, y, z1))]));
  const R = rng(77 + Math.round(z0 * 10));
  const pts = [];
  for (let q = 0; q < Math.round((z1 - z0) * 9); q++) pts.push(B.at(w(x, -FT - 0.1 - R() * (WT - 2 * FT - 0.2), z0 + 0.05 + R() * (z1 - z0 - 0.1))));
  const beds = [];
  for (let z = Math.ceil(z0 / CO) * CO; z < z1 - 1e-6; z += CO) if (z > z0 + 1e-6) beds.push(k.pathOf([B.at(w(x, -WT, z)), B.at(w(x, -WT + FT, z))]));
  return B.L(lines.join("") + beds.join(""), { tone: "lo" }) + B.D(pts, { size: 0.5, tone: "mid" });
}

// Polygon clipped to a rectangle (Sutherland–Hodgman), in face coordinates (x, z).
function clipRect(poly, x0, x1, z0, z1) {
  const planes = [[(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]], [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]], [(p) => p[1] >= z0, (a, b) => [a[0] + ((b[0] - a[0]) * (z0 - a[1])) / (b[1] - a[1]), z0]], [(p) => p[1] <= z1, (a, b) => [a[0] + ((b[0] - a[0]) * (z1 - a[1])) / (b[1] - a[1]), z1]]];
  let out = poly;
  for (const [inside, cut] of planes) {
    if (!out.length) break;
    const src = out;
    out = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i], b = src[(i + 1) % src.length];
      const ia = inside(a), ib = inside(b);
      if (ia) out.push(a);
      if (ia !== ib) out.push(cut(a, b));
    }
  }
  return out;
}

// Face marks on one block: drafted margin, crushed spall, bore hole, bite, cracks.
function blockMarks(B, b, s, d, yF, main, seed) {
  const at = (x, z) => B.at(w(x, yF + 0.002, z));
  const path = (pts, closed) => k.pathOf(pts.map(([x, z]) => at(x, z)), closed);
  let svg = B.L(path([[b.x0 + 0.05, b.z0 + 0.05], [b.x1 - 0.05, b.z0 + 0.05], [b.x1 - 0.05, b.z1 - 0.05], [b.x0 + 0.05, b.z1 - 0.05]], true), { tone: "faint" });
  const starts = [];
  for (const sp of d.spots) {
    const R = rng(Math.round(sp.x * 100 + sp.z * 37) + 11);
    const n = sp.kind === "bore" ? 16 : 11;
    const poly = Array.from({ length: n }, (_, q) => {
      const a = (q / n) * TAU;
      const rr = sp.kind === "bore" ? sp.r : sp.kind === "bite" ? sp.r * (0.6 + 0.8 * (q % 2)) : sp.r * (0.72 + 0.4 * R());
      return [sp.x + rr * Math.cos(a), sp.z + rr * Math.sin(a) * (sp.kind === "bite" ? 0.5 : 0.85)];
    });
    const c = clipRect(poly, b.x0, b.x1, b.z0, b.z1);
    if (c.length < 3) continue;
    const dpath = path(c, true);
    if (sp.kind === "spall") {
      svg += `<path d="${dpath}" style="fill:var(--anatomy-shade-0);stroke:none"/>` + B.L(dpath, { tone: "lo" });
      const R2 = rng(seed * 13 + 1);
      const dots = [];
      for (let q = 0; q < 14; q++) {
        const p = [sp.x + (R2() - 0.5) * sp.r * 1.5, sp.z + (R2() - 0.5) * sp.r * 1.3];
        if (p[0] > b.x0 + 0.02 && p[0] < b.x1 - 0.02 && p[1] > b.z0 + 0.02 && p[1] < b.z1 - 0.02 && inPoly(poly, p)) dots.push(at(...p));
      }
      if (dots.length) svg += B.D(dots, { size: 0.55, tone: "mid" });
    } else {
      svg += `<path d="${dpath}" style="fill:var(--anatomy-halo);fill-opacity:.62;stroke:none"/>` + B.L(dpath, { tone: "hi" });
    }
    starts.push(sp);
  }
  // Cracks: radial from the blow, edge to edge across the block (or from a mark's rim).
  if (s.crack > 0) {
    const R = rng(seed * 97 + 3);
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const inside = main[0] >= b.x0 && main[0] <= b.x1 && main[1] >= b.z0 && main[1] <= b.z1;
    for (let q = 0; q < s.crack; q++) {
      let a = Math.atan2(cz - main[1], cx - main[0]) + (R() - 0.5) * 1.3 + (q - (s.crack - 1) / 2) * 0.55;
      if (inside) a = (q / s.crack) * TAU + R() * 0.8 + 0.4;
      const dir = [Math.cos(a), Math.sin(a)];
      let p0;
      if (inside) {
        const sp = starts.find((x) => Math.hypot(x.x - main[0], x.z - main[1]) < 0.3);
        const r0 = sp ? sp.r * (sp.kind === "spall" ? 0.95 : 1) : 0.02;
        p0 = [main[0] + dir[0] * r0, main[1] + dir[1] * r0 * 0.85];
      } else {
        // enter on the edge nearest the blow
        const ex = clamp(main[0], b.x0, b.x1), ez = clamp(main[1], b.z0, b.z1);
        p0 = [clamp(ex + (R() - 0.5) * 0.3, b.x0, b.x1), clamp(ez + (R() - 0.5) * 0.2, b.z0, b.z1)];
        if (ex > b.x0 && ex < b.x1 && ez > b.z0 && ez < b.z1) p0 = [ex, ez];
      }
      // run to the boundary along dir
      let tMax = Infinity;
      if (dir[0] > 1e-6) tMax = Math.min(tMax, (b.x1 - p0[0]) / dir[0]);
      if (dir[0] < -1e-6) tMax = Math.min(tMax, (b.x0 - p0[0]) / dir[0]);
      if (dir[1] > 1e-6) tMax = Math.min(tMax, (b.z1 - p0[1]) / dir[1]);
      if (dir[1] < -1e-6) tMax = Math.min(tMax, (b.z0 - p0[1]) / dir[1]);
      if (!(tMax > 0.08) || !isFinite(tMax)) continue;
      const nrm = [-dir[1], dir[0]];
      const pts = [p0];
      for (let m = 1; m < 5; m++) {
        const f = m / 5;
        const jit = (R() - 0.5) * 0.07;
        pts.push([clamp(p0[0] + dir[0] * tMax * f + nrm[0] * jit, b.x0 + 0.01, b.x1 - 0.01), clamp(p0[1] + dir[1] * tMax * f + nrm[1] * jit, b.z0 + 0.01, b.z1 - 0.01)]);
      }
      pts.push([p0[0] + dir[0] * tMax, p0[1] + dir[1] * tMax]);
      svg += B.L(path(pts), { tone: q === 0 && s.crack >= 2 ? "hi" : "mid" });
    }
  }
  return svg;
}

// Blocks in flight: pulled by the hook or tumbling from above the breach.
function drawFalling(B, d, t, settled) {
  d.fallen.forEach((f, n) => {
    if (n < settled) return;
    const A = f.anim;
    if (!A || t < A.t0) return;
    const [sx, sy, yaw] = SLOTS[f.slot];
    const from = A.from;
    const u = clamp((t - A.t0) / Math.max(0.01, A.slide), 0, 1);
    let c, ang = 0, yw = 0;
    const out = FT + 0.05;
    if (t < A.t0 + A.slide) c = [from[0], from[1] + out * ease(u), from[2]];
    else {
      const tf = clamp((t - A.t0 - A.slide) / A.fallT, 0, 1);
      const p0 = [from[0], from[1] + out, from[2]];
      c = [lerp(p0, [sx, sy, 0.2], tf)[0], lerp(p0, [sx, sy, 0.2], tf)[1], Math.max(0.2, p0[2] - 0.5 * g0 * (tf * A.fallT) ** 2)];
      if (tf >= 1) c[2] = 0.2;
      ang = -Math.PI / 2 * smoothstep(0, 1, tf);
      yw = rad(yaw) * tf;
    }
    const up = rotate(rotate([0, 0, 1], [1, 0, 0], ang), [0, 0, 1], yw);
    const ax = rotate([1, 0, 0], [0, 0, 1], yw);
    const ay = cross(up, ax);
    // block dims: 1.2 along ax, 0.6 along up (its face height), 0.4 along ay (its depth)
    const F = { o: W3(c), a: ay, u: ax, v: up };
    B.prism(`flying${n}`, F, polyRect(1.2 * S, 0.6 * S), -0.2 * S, 0.2 * S, { mat: "stone", sys: "wall", tone: "hi" });
  });
}

// A cradle beside the wall with the spare heads; the slot of the mounted one is empty.
const RACK = { ram: { x: 2.86, y: 2.0, top: 0.174 }, bore: { x: 3.55, y: 1.9, top: 0.251 }, hook: { x: 4.1, y: 1.85, top: 0.34 } };
const RACK_Y = 1.2; // the sleeves' back ends; the heads face the viewer
const RACK_Z = 0.42; // head axis: the sleeve lies on the sleeper
function drawRackFrame(B) {
  B.beam("sleeper", w(2.4, 1.45, 0.09), w(4.45, 1.45, 0.09), { w: 0.24 * S, h: 0.18 * S, up: Z, mat: "oak", sys: "head", tone: "mid", grain: 1, layer: LY.near, nails: [2.86, 3.55, 4.1].map((x) => ({ s: (x - 2.4) * S, face: "v", x: [-0.6, 0.6] })) });
  for (const kind of ["ram", "bore", "hook"]) {
    const r = RACK[kind];
    B.slab(`rest.${kind}`, { x: (r.x - 0.16) * S, y: (r.y - 0.11) * S, w: 0.32 * S, d: 0.22 * S, r: 0.5 }, 0, r.top * S, { mat: "oak", sys: "head", steps: 2, bevel: 0.3, tone: "mid", layer: LY.near });
  }
}
function drawRack(B, mounted) {
  for (const kind of ["ram", "bore", "hook"]) {
    if (kind === mounted) continue;
    drawHead(B, kind, w(RACK[kind].x, RACK_Y, RACK_Z), S, { id: `rack.${kind}`, layer: LY.roof, dir: [0, 1, 0] });
  }
}

// Strobe: ghosts of the beam's line and the head's path, sampled from the record.
function drawStrobe(B, M, sim, now, yf) {
  const lines = [];
  const pts = [];
  const gm = geoOf(sim.P);
  const tipOf = (f) => offOf(gm, f.a);
  for (let t = 0; t <= Math.min(now, sim.end); t += 0.14) {
    const f = sim.rec.at(t);
    const o = tipOf(f);
    lines.push(k.pathOf([B.at(W3(add([0, yf + gm.tip, gm.z], o))), B.at(W3(add([0, yf + gm.y1, gm.z], o)))]));
    pts.push(B.at(W3(add([0, yf + gm.tip, gm.z], o))));
  }
  const path = [];
  for (let t = 0; t <= Math.min(now, sim.end); t += 1 / 60) path.push(B.at(W3(add([0, yf + gm.tip, gm.z], tipOf(sim.rec.at(t))))));
  const svg = B.L(lines.join(""), { tone: "lo" }) + (path.length > 1 ? `<path class="iso-line" data-tone="lit" style="stroke:var(--accent);stroke-width:1.2px" d="${k.pathOf(path)}"/>` : "") + B.D(pts, { size: 1.4, tone: "mid" });
  B.marks("strobe", svg, [w(0, yf, 3)], { r: 400, layer: 8 });
}

const geoOf = (P) => {
  const bore = P.kind === "bore";
  const z = ramAxisZ(P.l, bore);
  const y0 = YC - P.L / 2;
  return { L: P.L, l: P.l, kind: P.kind, bore, z, y0, y1: YC + P.L / 2, tip: y0 - HEADS[P.kind].reach };
};
// The beam's translation for a pendulum angle (or a bore displacement).
const offOf = (gm, a) => (gm.bore ? [0, -a, 0] : [0, -gm.l * Math.sin(a), gm.l * (1 - Math.cos(a))]);

const AMMO = [
  { id: "ram", name: "Ram's head", look: "iron", mass: HEADS.ram.mass, radius: 0.28, cd: 1 },
  { id: "bore", name: "Bore point", look: "iron", mass: HEADS.bore.mass, radius: 0.23, cd: 1 },
  { id: "hook", name: "Wall hook", look: "iron", mass: HEADS.hook.mass, radius: 0.2, cd: 1 },
];

export default {
  id: "battering-ram",
  name: "Battering Ram",
  short: "Ram",
  unit: U,
  view: { W: 1000, H: 640, azimuth: 40, elevation: 30, pad: 24, fit: [w(PL.x0, PL.y0, -0.9), w(PL.x1, PL.y0, -0.9), w(PL.x0, PL.y1, -0.9), w(PL.x1, PL.y1, -0.9), w(-WX, -0.5, 7.9), w(WX, -0.5, 7.9), w(0, Y_START + 4, 6.1)] },
  target: null,
  ammo: AMMO,
  controls: [
    { id: "crew", name: "Crew pull", min: 1, max: 10, step: 0.5, value: 5, unit: "kN", digits: 1 },
    { id: "len", name: "Ram length", min: 9, max: 14, step: 0.5, value: 12, unit: "m", digits: 1 },
    { id: "rope", name: "Rope length", min: 1.6, max: 2.7, step: 0.05, value: 2.3, unit: "m", digits: 2 },
    { id: "gap", name: "Stand-off", min: 0.05, max: 0.6, step: 0.05, value: 0.2, unit: "m", digits: 2 },
  ],
  actions: [
    { id: "advance", name: "Advance", key: "a" },
    { id: "swing", name: "Swing", key: "w" },
    { id: "loose", name: "Loose", key: " ", primary: true },
  ],
  toggles: [
    { id: "cut", name: "Cutaway", value: true },
    { id: "strobe", name: "Strobe" },
  ],
  focus: [
    { id: "ram", name: "Ram beam" },
    { id: "head", name: "Head" },
    { id: "suspension", name: "Suspension" },
    { id: "frame", name: "Shed frame" },
    { id: "wheels", name: "Wheels" },
    { id: "roof", name: "Hides/roof" },
  ],
  phases: ["rest", "advance", "draw", "heave", "strike", "breach"],
  holdShot: true,
  hint: "Space · loose   W · swing   A · advance",

  ammoIcon(a) {
    const ic = looks.icon(() => {}, [1.15, 1.15, 0.6], { width: 64, height: 46, azimuth: 40, elevation: 26 });
    const B = createBuilder(ic.collector, { unit: 1 });
    const H = HEADS[a.id];
    drawHead(B, a.id, [0, (H.reach * 1.7) / 2, 0], 1.7, { id: "icon" });
    return ic.finish();
  },

  build(B, M) {
    M._lay = {};
    B.plinth({ x: PL.x0 * S, y: PL.y0 * S, w: (PL.x1 - PL.x0) * S, d: (PL.y1 - PL.y0) * S, r: 10 }, { h: 12, foot: 6, ruler: "y", label: { x: 1.4 * S, y: 16.2 * S, w: 46, d: 22, r: 1.5 } });
    // Plank tracks laid for the wheels.
    for (const sx of [-1, 1]) {
      const x0 = sx > 0 ? 1.62 : -2.3;
      const lines = [k.pathOf([B.at(w(x0 + 0.34, 1.6, TRK)), B.at(w(x0 + 0.34, 15.0, TRK))])];
      for (let y = 4.2; y < 13.4; y += 3.1) lines.push(k.pathOf([B.at(w(x0, y, TRK)), B.at(w(x0 + 0.34, y, TRK))]), k.pathOf([B.at(w(x0 + 0.34, y + 1.4, TRK)), B.at(w(x0 + 0.68, y + 1.4, TRK))]));
      B.slab(`track${sx}`, { x: x0 * S, y: 1.6 * S, w: 0.68 * S, d: 13.4 * S, r: 0.6 }, 0, TRK * S, { mat: "wood", tone: "mid", steps: 2, sys: "wheels", layer: -1, inner: B.L(lines.join(""), { tone: "faint" }), over: B.D([1.75, 14.85].flatMap((y) => [B.at(w(x0 + 0.17, y, TRK)), B.at(w(x0 + 0.51, y, TRK))]), { size: 0.5, tone: "mid" }) });
    }
    // ---- the wall ----
    const face = (x, z) => B.at(w(x, 0.001, z));
    const facing = (id, x0, x1, kk0, kk1) => {
      const lines = [];
      const margins = [];
      for (let kk = kk0; kk < kk1; kk++) {
        if (kk > kk0) lines.push(k.pathOf([face(x0, kk * CO), face(x1, kk * CO)]));
        const js = jointsOf(kk, x0, x1);
        for (const x of js) lines.push(k.pathOf([face(x, kk * CO), face(x, (kk + 1) * CO)]));
        const xs = [x0, ...js, x1];
        for (let i = 0; i + 1 < xs.length; i++) if (xs[i + 1] - xs[i] > 0.2) margins.push(k.pathOf([face(xs[i] + 0.05, kk * CO + 0.05), face(xs[i + 1] - 0.05, kk * CO + 0.05), face(xs[i + 1] - 0.05, (kk + 1) * CO - 0.05), face(xs[i] + 0.05, (kk + 1) * CO - 0.05)], true));
      }
      const end = x1 >= WX - 1e-6 ? B.L(Array.from({ length: kk1 - kk0 - 1 }, (_, q) => k.pathOf([B.at(w(WX, -FT, (kk0 + q + 1) * CO)), B.at(w(WX, 0, (kk0 + q + 1) * CO))])).join(""), { tone: "lo" }) : "";
      B.slab(`face.${id}`, { x: x0 * S, y: -FT * S, w: (x1 - x0) * S, d: FT * S, r: 0.3 }, kk0 * CO * S, (kk1 - kk0) * CO * S, { mat: "stone", sys: "wall", steps: 1, tone: "mid", inner: B.L(lines.join(""), { tone: "mid" }) + B.L(margins.join(""), { tone: "faint" }) + end });
    };
    facing("c0", -WX, WX, 0, 1);
    for (let kk = 1; kk <= 6; kk++) {
      facing(`l${kk}`, -WX, -zoneEdge(kk), kk, kk + 1);
      facing(`r${kk}`, zoneEdge(kk), WX, kk, kk + 1);
    }
    facing("top", -WX, WX, 7, 10);
    // Footing: a chamfered base course standing proud of the face.
    B.prism("footing", { o: [-WX * S, 0, 0], a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] }, [[0, 0], [0.22 * S, 0], [0.22 * S, 0.2 * S], [0.08 * S, 0.34 * S], [0, 0.34 * S]], 0, 2 * WX * S, { mat: "stone", sys: "wall", tone: "mid", inner: B.L(Array.from({ length: 7 }, (_, q) => k.pathOf([B.at(w(-WX + 1.3 * (q + 0.6), 0.22, 0)), B.at(w(-WX + 1.3 * (q + 0.6), 0.22, 0.2)), B.at(w(-WX + 1.3 * (q + 0.6), 0.08, 0.34))])).join(""), { tone: "faint" }) });
    // Wall walk, parapet, coping, merlons with slits, rear parapet.
    const paving = [];
    for (let x = -WX + 0.9; x < WX; x += 0.9) paving.push(k.pathOf([B.at(w(x, -WT + 0.3, WH + 0.06)), B.at(w(x, -0.5, WH + 0.06))]));
    paving.push(k.pathOf([B.at(w(-WX, -1.4, WH + 0.06)), B.at(w(WX, -1.4, WH + 0.06))]));
    B.slab("walk", { x: -WX * S, y: (-WT + 0.3) * S, w: 2 * WX * S, d: (WT - 0.8) * S, r: 0 }, WH * S, 0.06 * S, { mat: "stone", sys: "wall", steps: 1, tone: "mid", inner: B.L(paving.join(""), { tone: "faint" }) });
    B.slab("rearParapet", { x: -WX * S, y: -WT * S, w: 2 * WX * S, d: 0.3 * S, r: 0 }, WH * S, 0.7 * S, { mat: "stone", sys: "wall", steps: 1, tone: "mid" });
    B.slab("parapet", { x: -WX * S, y: -0.5 * S, w: 2 * WX * S, d: 0.5 * S, r: 0 }, WH * S, 1.0 * S, { mat: "stone", sys: "wall", steps: 1, tone: "hi", inner: B.L(jointsOf(1, -WX, WX).map((x) => k.pathOf([face(x, WH), face(x, WH + 1.0)])).join(""), { tone: "lo" }) });
    B.slab("coping", { x: -WX * S, y: -0.56 * S, w: 2 * WX * S, d: 0.62 * S, r: 0.4 }, (WH + 1.0) * S, 0.1 * S, { mat: "stone", sys: "wall", steps: 2, bevel: 0.4, tone: "mid" });
    for (const x of [-3.6, -1.8, 0, 1.8, 3.6]) {
      const slit = k.pathOf([B.at(w(x - 0.05, 0.002, WH + 1.25)), B.at(w(x + 0.05, 0.002, WH + 1.25)), B.at(w(x + 0.05, 0.002, WH + 1.8)), B.at(w(x - 0.05, 0.002, WH + 1.8))], true);
      B.slab(`merlon${x}`, { x: (x - 0.55) * S, y: -0.5 * S, w: 1.1 * S, d: 0.5 * S, r: 0.3 }, (WH + 1.1) * S, 0.8 * S, { mat: "stone", sys: "wall", steps: 1, bevel: 0.3, tone: "hi", over: `<path d="${slit}" style="fill:var(--anatomy-halo);fill-opacity:.55;stroke:none"/>` + B.L(slit, { tone: "lo" }) });
      B.slab(`merlonCap${x}`, { x: (x - 0.6) * S, y: -0.55 * S, w: 1.2 * S, d: 0.6 * S, r: 0.3 }, (WH + 1.9) * S, 0.08 * S, { mat: "stone", sys: "wall", steps: 2, bevel: 0.3, tone: "mid" });
    }
    B.halo("wall.halo", [w(-WX, -WT, 0), w(WX, -WT, 0), w(WX, 0.3, 0), w(-WX, 0.3, 0)], 0, { blur: 6 });
    // The head cradle and a water butt for wetting the hides.
    drawRackFrame(B);
    looks.barrel(B, "butt", w(3.35, 14.5, 0.48), 0.42 * S, { axis: [0, 0, 1], layer: LY.near });
    B.cyl("bucket", w(2.75, 15.15, 0), w(2.75, 15.15, 0.28), 0.15 * S, { mat: "wood", seams: [0.06 * S, 0.22 * S], faceRing: [{ s: 0.28 * S, r: 0.12 * S }], layer: LY.near });
  },

  init(M) {
    return { mode: "rest", yf: Y_START, adv: null, dmg: freshDamage(), sim: null, last: null, total: 0, fxT: 0, then: null };
  },

  // The controls in force: the shot's while it plays, else the deck's.
  params(M) {
    const st = M.state;
    if (st.mode === "shot" && st.sim) return st.sim.P;
    return { L: M.ctrl.len, l: M.ctrl.rope, F: M.ctrl.crew * 1000, gap: M.ctrl.gap, kind: M.ammo.id };
  },
  goal(M) {
    const P = this.params(M);
    return targetY(P.L, P.kind, P.gap);
  },

  act(M, id) {
    const st = M.state;
    if (st.mode === "shot") return;
    if (id === "advance") {
      if (st.mode === "rest" || st.mode === "breach") this.roll(M, this.goal(M), null);
      return;
    }
    const N = id === "swing" ? 1 : 4;
    if (st.mode === "advance") {
      st.then = N;
      return;
    }
    if (st.dmg.breach) return;
    if (Math.abs(st.yf - this.goal(M)) > 0.005) return this.roll(M, this.goal(M), N);
    this.fire(M, N);
  },

  roll(M, to, then) {
    const st = M.state;
    const from = st.yf;
    st.then = then;
    if (Math.abs(to - from) < 0.005 || M.calm) {
      st.yf = to;
      st.mode = st.dmg.breach ? "breach" : "rest";
      M.setPhase(st.mode);
      return this.afterRoll(M);
    }
    const stroke = RW * 1.25;
    const n = Math.max(1, Math.ceil(Math.abs(to - from) / stroke));
    st.adv = { from, to, n, T: n * 0.9, t: 0, phi0: (Y_START - from) / RW };
    st.mode = "advance";
    M.setPhase("advance");
  },
  afterRoll(M) {
    const st = M.state;
    const then = st.then;
    st.then = null;
    if (st.reset) {
      st.reset = false;
      st.dmg = freshDamage();
      st.mode = "rest";
      M.setPhase("rest");
    }
    if (then && !st.dmg.breach) this.fire(M, then);
  },

  fire(M, N) {
    const st = M.state;
    const P = { ...this.params(M), N };
    const sim = simulate(P, st.dmg);
    st.sim = sim;
    st.mode = "shot";
    st.fxT = 0;
    const marks = sim.strikes.map((s, i) => [s.t, `${st.total + i + 1}`]);
    const br = sim.strikes.find((s) => s.D >= 1);
    if (br) marks.push([br.t + 0.01, "breach"]);
    M.startShot(sim.end, marks);
    M.setPhase("draw");
  },

  endShot(M) {
    const st = M.state;
    const sim = st.sim;
    if (!sim) return;
    st.dmg = sim.dmgEnd;
    st.total += sim.strikes.length;
    if (sim.strikes.length) st.last = { ...sim.strikes[sim.strikes.length - 1], m: sim.m, kind: sim.P.kind };
    st.mode = st.dmg.breach ? "breach" : "rest";
    M.setPhase(st.mode);
    // A change of head or length during the shot leaves the shed off its mark: roll to it.
    if (Math.abs(st.yf - this.goal(M)) > 0.005 && st.yf !== Y_START) this.roll(M, this.goal(M), null);
  },

  // A finished shot is held on the timeline; a new setting closes it first.
  release(M) {
    if (M.shot && M.shot.finished && M.state.mode === "shot") {
      this.endShot(M);
      M.shot = null;
    }
  },
  onControl(M, id) {
    this.release(M);
    const st = M.state;
    if ((id === "len" || id === "gap") && (st.mode === "rest" || st.mode === "breach") && st.yf !== Y_START) this.roll(M, this.goal(M), null);
  },
  onAmmo(M) {
    this.release(M);
    const st = M.state;
    if ((st.mode === "rest" || st.mode === "breach") && st.yf !== Y_START) this.roll(M, this.goal(M), null);
  },
  onToggle(M) {
    M.fx.setOccluders(this.occluders(M));
  },

  tour(M) {
    const st = M.state;
    if (st.mode === "breach" || (st.mode === "rest" && st.dmg.breach)) {
      st.reset = true;
      return this.roll(M, Y_START, null);
    }
    if (st.mode === "rest") this.act(M, "loose");
  },
  tourGap: 7,

  update(M, dt) {
    const st = M.state;
    if (st.mode === "advance" && st.adv) {
      const A = st.adv;
      A.t += dt;
      const u = clamp(A.t / A.T, 0, 1);
      const i = Math.min(A.n - 1, Math.floor(u * A.n));
      const local = u * A.n - i;
      const f = i + ease(clamp(local / 0.78, 0, 1));
      A.si = i;
      const prev = st.yf;
      st.yf = A.from + ((A.to - A.from) * Math.min(A.n, u >= 1 ? A.n : f)) / A.n;
      // the levers bite and the wheels creak on every stroke; the lever is re-seated between strokes
      const phase = local < 0.78 ? "push" : "seat";
      if (u < 1 && (A.i !== i || A.ph !== phase)) {
        if (M.sfx) M.sfx(phase === "push" ? "creak" : "thunk", phase === "push" ? { pitch: 0.55 + 0.1 * (i % 2), gap: 0.2 } : { pitch: 0.7, gap: 0.2 });
        A.i = i;
        A.ph = phase;
      }
      if (!M.calm && Math.abs(st.yf - prev) > 1e-4 && Math.random() < 0.35) {
        for (const y of AXLES) for (const sx of [-1, 1]) if (Math.random() < 0.25) M.fx.emit("dust", w(sx * 1.95, st.yf + y + (A.to < A.from ? -0.25 : 0.25), TRK + 0.02), { n: 1, v: [0, (A.to < A.from ? 0.3 : -0.3) * S, 0.25 * S], spread: 0.25 * S, size: 0.12 * S, grow: 0.6 * S, life: 1.1, drag: 1.4, alpha: 0.6 });
      }
      if (u >= 1) {
        st.yf = A.to;
        st.adv = null;
        st.mode = st.dmg.breach && !st.reset ? "breach" : "rest";
        M.setPhase(st.mode);
        this.afterRoll(M);
      }
      return true;
    }
    if (st.mode === "shot" && st.sim && M.shot) {
      const sim = st.sim;
      const t = M.shot.t;
      const f = sim.rec.at(t);
      const recent = sim.strikes.find((s) => t >= s.t && t < s.t + 0.35);
      const done = sim.strikes.length && t > sim.strikes[sim.strikes.length - 1].t + 0.35;
      // after the last blow the crew checks the ram and brings it to rest
      M.setPhase(recent ? (recent.D >= 1 ? "breach" : "strike") : done && sim.dmgEnd.breach ? "breach" : f.c < -0.02 ? "draw" : f.c > 0.02 ? "heave" : M.shot.finished || t > sim.end - 0.3 ? "rest" : "draw");
      this.effects(M, sim, st.fxT, t);
      st.fxT = t;
      return true;
    }
    return false;
  },

  // Particles for everything that happened between shot times a and b (only when played forward).
  effects(M, sim, a, b) {
    if (!(b > a) || b - a > 0.25) return;
    const sfx = (name, o) => M.sfx && M.sfx(name, o);
    // the crew changing the way it pulls makes the ropes creak
    const ca = sim.rec.at(a).c, cb = sim.rec.at(b).c;
    if (Math.sign(ca) !== Math.sign(cb) && Math.abs(cb) > 0.02) sfx("creak", { pitch: cb < 0 ? 1.25 : 0.95, gap: 0.3 });
    for (const s of sim.strikes) {
      if (s.t > a && s.t <= b) {
        const g = clamp(s.E / 12000, 0.25, 1);
        sfx("thud", { gain: g, size: 1 + s.E / 15000, pitch: sim.P.kind === "ram" ? 0.8 : 1 });
        if (sim.P.kind !== "ram" || s.E > 4000) sfx("crack", { gain: 0.35 + 0.5 * g, gap: 0.05 });
        if (sim.P.kind !== "ram") sfx("clank", { pitch: sim.P.kind === "bore" ? 0.7 : 0.9, gap: 0.05 });
        if (s.D >= 1) sfx("boom", { gain: 1, size: 1.6 });
      }
    }
    for (const s of sim.strikes) for (const f of s.ev.falls) {
      const A = f.anim;
      const land = A.t0 + A.slide + A.fallT;
      if (land > a && land <= b) sfx("thud", { gain: 0.7, pitch: 0.7, size: 0.8, gap: 0.08 });
      if (A.kind === "pull" && A.t0 + 0.05 > a && A.t0 + 0.05 <= b) sfx("crack", { gain: 0.5, gap: 0.05 });
    }
    if (M.calm) return;
    for (const s of sim.strikes) {
      if (s.t > a && s.t <= b) {
        const p = w(s.hit[0], 0.05, s.hit[1]);
        const E = s.E / 1000;
        const iron = sim.P.kind;
        M.fx.emit("dust", p, { n: Math.round(6 + E * 1.6), v: [0, 0.9 * S, 0.35 * S], spread: 0.9 * S, size: 0.22 * S, grow: 1.0 * S, life: 1.7, drag: 1.6, buoy: 0.15 * S, alpha: 0.75, jitter: 0.1 * S });
        M.fx.emit("debris", p, { n: Math.round(2 + E * (iron === "bore" ? 0.5 : 0.9)), v: [0, 1.6 * S, 0.9 * S], spread: 1.4 * S, size: 0.07 * S, life: 1.6, grav: 1, bounce: 0.3, drag: 0.2, jitter: 0.08 * S });
        M.fx.emit("spark", p, { n: Math.round(4 + E * 1.3), v: [0, 2.6 * S, 0.6 * S], spread: 3.2 * S, size: 0.025 * S, life: 0.32, heat: 1, grav: 0.4, drag: 1.4 });
        if (s.D >= 1) {
          M.fx.emit("dust", w(s.hit[0], 0.2, s.hit[1]), { n: 46, v: [0, 0.8 * S, 0.5 * S], spread: 1.4 * S, size: 0.45 * S, grow: 2.4 * S, life: 2.8, drag: 1.1, buoy: 0.2 * S, alpha: 0.8, jitter: 0.6 * S });
          M.fx.emit("debris", w(s.hit[0], 0.1, s.hit[1]), { n: 30, v: [0, 2.0 * S, 1.2 * S], spread: 2 * S, size: 0.1 * S, life: 2.0, grav: 1, bounce: 0.25, drag: 0.2, jitter: 0.4 * S });
        }
      }
      for (const f of s.ev.falls) {
        const A = f.anim;
        const land = A.t0 + A.slide + A.fallT;
        if (land > a && land <= b) {
          const [x, y] = SLOTS[f.slot];
          M.fx.emit("dust", w(x, y, 0.1), { n: 14, v: [0, 0, 0.3 * S], spread: 0.9 * S, size: 0.25 * S, grow: 1.2 * S, life: 1.6, drag: 1.8, alpha: 0.7, jitter: 0.4 * S });
          M.fx.emit("debris", w(x, y, 0.2), { n: 5, v: [0, 0, 1.2 * S], spread: 1.2 * S, size: 0.06 * S, life: 1.0, grav: 1, bounce: 0.25, drag: 0.3 });
        }
        if (A.kind === "pull" && A.t0 + 0.05 > a && A.t0 + 0.05 <= b) M.fx.emit("dust", w(A.from[0], 0.1, A.from[2]), { n: 10, v: [0, 0.6 * S, 0], spread: 0.6 * S, size: 0.18 * S, grow: 0.8 * S, life: 1.3, drag: 1.6, alpha: 0.7 });
      }
    }
  },

  // Everything that sets this frame's picture.
  pose(M) {
    const st = M.state;
    const shot = st.mode === "shot" && st.sim && M.shot;
    const P = shot ? st.sim.P : this.params(M);
    const gm = geoOf(P);
    let a = 0, v = 0, c = 0;
    let dmg = st.dmg;
    let t = Infinity;
    let jitter = null;
    if (shot) {
      t = M.shot.t;
      const f = st.sim.rec.at(t);
      a = f.a;
      v = f.v;
      c = f.c;
      dmg = st.sim.dmg0;
      for (const s of st.sim.snaps) if (s.t <= t) dmg = s.d;
      const s = [...st.sim.strikes].reverse().find((q) => q.t <= t);
      if (s && t - s.t < 0.6) {
        const A = clamp(s.p / 2.4e5, 0.004, 0.03) * Math.exp(-(t - s.t) / 0.12) * Math.sin(TAU * 11 * (t - s.t));
        const o0 = M.B.at([0, 0, 0]), o1 = M.B.at([0, -A * S, 0]);
        jitter = [o1[0] - o0[0], o1[1] - o0[1]];
      }
    }
    let lever = rad(42);
    if (st.mode === "advance" && st.adv) {
      const A = st.adv;
      const u = clamp(A.t / A.T, 0, 1) * A.n;
      const local = u - Math.min(A.n - 1, Math.floor(u));
      const dphi = ((A.to - A.from) / A.n / RW) * -1;
      lever = rad(42) - (local < 0.78 ? dphi * ease(local / 0.78) : dphi * (1 - smoothstep(0.78, 1, local)));
    }
    const A = st.mode === "advance" && st.adv;
    const shapeY = A ? A.from : st.yf;
    return { P, gm, a, v, c, dmg, t, yf: st.yf, shapeY, phi: (Y_START - st.yf) / RW, lever, shedMoving: st.mode === "advance", ramMoving: !!shot && !M.shot.finished, jitter, shot };
  },

  draw(B, M) {
    const st = M.state;
    const ps = this.pose(M);
    const { gm, yf } = ps;
    M._seal = false;
    // While the shed rolls its picture moves by translation; its painter proxies follow when it stops
    // (its order against everything round it is fixed by the depth layers, so it cannot change on the way).
    const shedOff = w(0, yf, 0);
    const proxyOff = w(0, ps.shapeY, 0);
    place(M, "shed", "shed", () => {
      drawShed(B);
      drawWheelDiscs(B);
    }, { off: proxyOff, tf: shedOff, jitter: ps.jitter });
    const phiKey = ps.shedMoving ? `${ps.phi.toFixed(4)}|${ps.lever.toFixed(4)}` : `${ps.phi.toFixed(3)}|r`;
    place(M, "wheels", phiKey, () => drawWheelMarks(B, ps.phi, ps.lever), { off: shedOff, moving: ps.shedMoving, jitter: ps.jitter });
    place(M, "trough", gm.bore ? "t" : "-", () => gm.bore && drawTrough(B), { off: proxyOff, tf: shedOff, jitter: ps.jitter, layer: LY.mid });
    // The ram and its head translate together; a head that has gone into the wall is redrawn cut.
    const o = offOf(gm, ps.a);
    const ramOff = add(shedOff, W3(o));
    const moving = ps.shedMoving || ps.ramMoving;
    const ramProxy = ps.ramMoving ? ramOff : add(proxyOff, W3(o));
    place(M, "ram", `${gm.L}|${gm.z}|${gm.kind}`, () => drawRam(B, gm), { off: ramProxy, tf: ramOff, moving: ps.ramMoving, layer: LY.mid });
    const tipY = yf + gm.tip + o[1];
    const base = w(0, gm.y0, gm.z);
    if (tipY < -0.002) {
      const clip = HEADS[gm.kind].reach + tipY;
      place(M, "head", `cut|${clip.toFixed(4)}|${ramOff.join()}`, () => drawHead(B, gm.kind, add(base, ramOff), S, { lit: true, clip }), { moving: true, layer: LY.mid });
    } else place(M, "head", `${gm.kind}|${gm.z}|${gm.L}`, () => drawHead(B, gm.kind, base, S, { lit: true }), { off: ramProxy, tf: ramOff, moving: ps.ramMoving, layer: LY.mid });
    const crew = ps.c;
    place(M, "ropes", `${gm.bore}|${gm.z}|${gm.l}|${ps.a.toFixed(4)}|${crew.toFixed(3)}|${yf.toFixed(4)}`, () => drawRopes(B, gm, add([0, yf, 0], o), crew, gm.bore, yf), { moving, layer: LY.mid });
    // The wall's struck zone, fallen blocks and blocks in flight.
    const d = ps.dmg;
    let settled = 0;
    let flying = false;
    for (const f of d.fallen) {
      if (!f.anim || ps.t >= f.anim.t1) settled++;
      else {
        if (ps.t >= f.anim.t0) flying = true;
        break;
      }
    }
    place(M, "zone", `${d.uid}|${settled}`, () => drawZone(B, d, settled), {});
    place(M, "fall", flying ? `f${ps.t.toFixed(4)}` : "-", () => flying && drawFalling(B, d, ps.t, settled), { moving: flying });
    place(M, "rack", gm.kind, () => drawRack(B, gm.kind), { layer: LY.near });
    if (M.toggles.strobe && st.sim && ps.shot) drawStrobe(B, M, st.sim, M.shot.t, yf);
    if (M._seal) {
      M.scene.seal();
      M._seal = false;
    }
    const occ = `${yf.toFixed(2)}|${!!M.toggles.cut}`;
    if (st._occ !== occ) {
      st._occ = occ;
      M.fx.setOccluders(this.occluders(M));
    }
  },

  occluders(M) {
    const yf = M.state ? M.state.yf : Y_START;
    const list = [{ min: w(-WX, -WT, 0), max: w(WX, 0, WH + 1) }];
    if (!M.toggles.cut) list.push({ min: w(-XO, yf, ZS0), max: w(XO + 0.05, yf + LS, ZT1) });
    return list;
  },

  readouts(M) {
    const st = M.state;
    const ps = this.pose(M);
    const P = ps.P;
    const gm = ps.gm;
    const m = massOf(P.L, P.kind);
    const rows = [["Ram mass", fmtInt(m), "kg"]];
    if (gm.bore) rows.push(["Stroke", fmt(ps.a, 2), "m"], ["Bore depth", fmt(ps.dmg.depth, 2), "m"]);
    else rows.push(["Period", fmt(TAU * Math.sqrt(P.l / g0), 2), "s"], ["Swing", fmt(deg(ps.a), 1), "°"]);
    rows.push(["Ram speed", fmt(Math.abs(ps.v), 2), "m/s"]);
    let last = st.last;
    if (ps.shot) {
      const s = [...st.sim.strikes].reverse().find((q) => q.t <= ps.t);
      last = s ? { ...s, m: st.sim.m, kind: P.kind } : st.last;
    }
    if (last) {
      rows.push(gm.bore ? ["Drawn back", fmt(last.amp, 2), "m"] : ["Drawn back", fmt(last.amp, 1), "°"]);
      rows.push(["Impact speed", fmt(last.v, 2), "m/s"], ["Impact energy", fmt(last.E / 1000, 1), "kJ"], ["Momentum", fmt(last.p / 1000, 2), "kN·s"], ["Peak force", fmt(last.Fpk / 1e6, 2), "MN"]);
    } else rows.push(["Impact speed", "—", ""], ["Impact energy", "—", ""]);
    const n = ps.shot ? st.total + st.sim.strikes.filter((q) => q.t <= ps.t).length : st.total;
    rows.push(["Strikes", fmtInt(n), ""], ["Damage", fmtInt(ps.dmg.D * 100), "%"], ["Shed to wall", fmt(st.yf, 2), "m"]);
    return rows;
  },

  corner(M) {
    const ps = this.pose(M);
    return `${M.phase} · ${fmtInt(ps.dmg.D * 100)}% · ${fmt(M.state.yf, 1)} m`;
  },
};

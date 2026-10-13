// Roman scorpio: a three-span euthytone bolt-thrower (Vitruvius X.10, Heron's Belopoeica).
// Authored in metres. Everything above the stand lives in a "gun frame" (X across, Y back along
// the case, Z up, origin on the elevation pin) that elevates and traverses on the universal joint.
//
// TRUTH (metres, kilograms, seconds)
//   Bolt 3 spans = 0.69 m. Vitruvius: hole (skein) diameter = 1/9 bolt = 0.077 m.
//   Skeins: 0.35 m free length between the hole-carriers, 0.19 m off the centreline, sinew rope.
//   Arms: 0.42 m to the string loop, rest 10° behind the transverse line on hair cushions.
//   String: sinew, straight between the tips at rest (half length 0.604 m), EA-stiffness 1.6e5 N/m per half.
//   Skein torque per skein: PH.skeinTorque(θ, k = 440 N·m/rad, hardening 0.6), θ = pre-twist + arm swing.
//   Pre-twist 30–60° (washers turned by iron levers, pegged). Full draw 0.657 m of slider travel
//   swings each arm a further ~39° → draw force ≈ 4.6 kN held by the windlass (Ø 64 mm axle,
//   0.30 m handspikes, 14-tooth ratchets) and stored energy ≈ 1.3 kJ.
//   Release: 2-DOF model (arm angle φ with I = 0.058 kg·m² per arm incl. string share; string centre s
//   with 0.09 kg effective string mass + bolt), elastic string, cushion stop 3.3e4 N·m/rad.
//   The bolt leaves when the string centre starts to decelerate: 0.18 kg bolt ≈ 77 m/s after ≈ 14 ms,
//   efficiency ≈ 41 %; 0.22 kg fire bolt ≈ 73 m/s; 0.32 kg heavy bolt ≈ 66 m/s (54 %).
//   Range with drag (CdA ≈ 5e-4 m²): ≈ 190 m at 12°, ≈ 345 m maximum near 40°.
//   Machine: elevation pin 1.25 m above the floor; case 1.58 m; frame 0.74 m wide.
//
// PARTS (≈ 150 for the machine, ≈ 30 for the rack)
//   Stand: plinth, hexagonal hub, 3 feet with iron shoes and strut straps, 3 struts, column in 3 runs,
//     strut band, top band, bronze turntable.
//   Universal joint: yoke base, 2 fork cheeks, rotating collar with lug plates and pin heads,
//     saddle block, elevation pin heads + washers; prop: sleeve with peg band and peg heads, pegged bar,
//     2 bracket straps with pin heads.
//   Case: stock with front iron cap, 2 dovetail rails; slider with groove; claw block (2 cheeks, rear
//     bridge), 2 claw prongs + tail bridge, trigger lever, 2 claw-pin heads, 2 trigger-pin heads, rope eye.
//   Head: top and bottom hole-carriers with 4 iron bands, 2 middle and 2 outer stanchions, 2 hair cushions;
//     4 bronze washers (flange + body), 4 rope loops over 8 iron cross-bar ends, 4 iron levers with knobs,
//     4 locking pegs; 2 skeins in 3 pieces each.
//   Arms: 2 × (root, ferrule, 2 shafts, band, tip, string loop, iron tip cap); bowstring in 2–3 runs.
//   Windlass: 2 cheeks, drum in 3 pieces with rope coils, 2 ratchet wheels, 2 pawls + pins, 2 naves,
//     8 handspikes, 2 end caps, draw rope with hook.
//   Rack: 2 end boards, base plank, 6 bolts (2 of each kind; the chosen kind lit).
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { add, sub, mul, dot, cross, unit, len, lerp, clamp, rad, deg, ease, smoothstep, fmt, fmtInt, TAU } from "../engine/vec.js";
import * as PH from "../engine/physics.js";
import { framePoint, polyRound, polySaw, extrudeAlong } from "../engine/geo.js";
import { shapeOf } from "../engine/scene.js";

const U = 0.008;
const S = 1 / U;
const w = (x, y, z) => [x * S, y * S, z * S];

// ---------------------------------------------------------------- dimensions (metres)
const ZP = 1.08; // elevation pin above the floor
const Z_BAND = 0.42; // strut band on the column
const Z_COLLAR = 0.56; // the turning collar that carries the prop
const FOOT = 0.72; // tripod foot reach
const ZCB = 0.09; // case bottom (gun frame)
const ZCT = 0.21; // case top
const ZRT = 0.235; // dovetail rail top
const ZST = 0.259; // slider top
const ZA = 0.27; // arm, string and bolt plane
const ZPB0 = 0.015, ZPB1 = 0.09; // bottom hole-carrier
const ZPT0 = 0.44, ZPT1 = 0.515; // top hole-carrier
const YS = -0.36; // skein plane
const XK = 0.19; // skein axis off the centreline
const SKR = 0.0385; // skein radius (hole diameter 0.077 = bolt / 9)
const PLATE_X = 0.37, PLATE_D = 0.07;
const ARM = 0.42; // skein axis to string loop
const A0 = rad(10); // arm at rest, behind the transverse line
const ROOT_H = 0.026; // half height of the arm root inside the skein
const ARM_HALF = 0.022; // half width of the arm where it meets the cushion
const PAD = 0.02; // cushion thickness
const D_C = ARM_HALF + PAD; // stanchion face, ahead of the arm axis
const L0 = XK + ARM * Math.cos(A0); // half string length (straight at rest)
const Y0 = YS + ARM * Math.sin(A0); // string line at rest
const STRING_MAX = YS + 0.73; // string at full draw: the bolt head just inside the frame
const STROKE = STRING_MAX - Y0; // 0.657 m
const STR_R = 0.008; // bowstring radius
const CLAW_BACK = 0.035; // claw pin behind the string it holds
const ZCP = 0.296; // claw pin height
const CASE_Y0 = -0.72, CASE_Y1 = 0.86;
const WY = 0.66, WZ = 0.25, WR = 0.032; // windlass axle
const TEETH = 14;
const BOLT_CLEAR = -2.6; // the bolt is drawn in the machine until its tail is here, then flies free (local Y)
// The case is cut at the frame (just inside the middle stanchions' rear faces), the saddle and the
// windlass cheeks; the slider shares the cuts. The rails run past the stanchions' front faces and
// stop short of the cheeks, so each orders by the side it really shows.
const CASE_CUTS = [CASE_Y0, YS - PLATE_D, YS + 0.03, -0.06, 0.06, 0.56, 0.74, CASE_Y1];
const RAIL_CUTS = [CASE_Y0 + 0.004, YS - PLATE_D + 0.02, -0.2, 0.0, 0.2, 0.54];

// ---------------------------------------------------------------- physics
const SKEIN = { stiffness: 440, hardening: 0.6 };
const I_ARM = 0.058;
const M_STR = 0.09;
const K_STR = 1.6e5;
const C_STR = 8;
const K_STOP = 3.3e4;
const C_STOP = 26;
const C_SK = 0.15;
const TRIG = 0.5; // the trigger lever's travel before the string moves

function geoAt(phi, s) {
  const a = A0 + phi;
  const tx = XK + ARM * Math.cos(a);
  const ty = YS + ARM * Math.sin(a);
  const dy = ty - (Y0 + s);
  const l = Math.hypot(tx, dy);
  return { a, tx, ty, l, ux: tx / l, uy: dy / l };
}
const tension = (g, ldot = 0) => (g.l > L0 ? Math.max(0, K_STR * (g.l - L0) + C_STR * ldot) : 0);
const tauString = (g, T) => T * ARM * (Math.sin(g.a) * g.ux - Math.cos(g.a) * g.uy);
const stopTorque = (phi, wv) => (phi < 0 ? Math.max(0, -K_STOP * phi - C_STOP * wv) : 0);

// Arm angle while the claw holds the string at s: skein, string and cushion in balance.
const armCache = new Map();
function armAt(s, th) {
  const key = `${s.toFixed(5)}|${th.toFixed(4)}`;
  const hit = armCache.get(key);
  if (hit !== undefined) return hit;
  const f = (phi) => {
    const g = geoAt(phi, s);
    return tauString(g, tension(g)) - PH.skeinTorque(th + phi, SKEIN) + stopTorque(phi, 0);
  };
  let lo = -0.3, hi = 1.3;
  for (let i = 0; i < 46; i++) {
    const m = (lo + hi) / 2;
    if (f(m) > 0) lo = m;
    else hi = m;
  }
  const phi = (lo + hi) / 2;
  if (armCache.size > 4000) armCache.clear();
  armCache.set(key, phi);
  return phi;
}
// Free rest: the string straight between the tips, the arms pressed into their cushions.
function restOf(th) {
  const f = (phi) => {
    const a = A0 + phi;
    const tx = XK + ARM * Math.cos(a);
    return K_STR * Math.max(0, tx - L0) * ARM * Math.sin(a) - PH.skeinTorque(th + phi, SKEIN) + stopTorque(phi, 0);
  };
  let lo = -0.3, hi = 0.3;
  for (let i = 0; i < 46; i++) {
    const m = (lo + hi) / 2;
    if (f(m) > 0) lo = m;
    else hi = m;
  }
  const phi = (lo + hi) / 2;
  return { phi, s: YS + ARM * Math.sin(A0 + phi) - Y0 };
}
const S_REF = restOf(rad(45)).s; // windlass zero: slider forward on a resting string

// The release: arm swing φ (both arms alike) and string centre s, with the bolt riding the string
// until the string starts to slow down. Recorded for the scrubbable timeline.
function simulate(th, s0, ammo) {
  const mb = ammo.mass;
  const phi0 = armAt(s0, th);
  const g0 = geoAt(phi0, s0);
  const T0 = tension(g0);
  const stored = 2 * PH.skeinEnergy(th, th + phi0, SKEIN) + K_STR * Math.max(0, g0.l - L0) ** 2;
  let contact = true;
  const f = (tt, y) => {
    const [phi, wv, s, v] = y;
    const g = geoAt(phi, s);
    const ldot = wv * ARM * (-Math.sin(g.a) * g.ux + Math.cos(g.a) * g.uy) - v * g.uy;
    const T = tension(g, ldot);
    const wd = (tauString(g, T) - PH.skeinTorque(th + phi, SKEIN) - C_SK * wv + stopTorque(phi, wv)) / I_ARM;
    const vd = (2 * T * g.uy - (contact ? 0 : 1.5 * v)) / (M_STR + (contact ? mb : 0));
    return [wv, wd, v, vd];
  };
  const rec = PH.timeline();
  const frame0 = { phi: phi0, s: s0, b: s0 };
  rec.push(0, frame0);
  rec.push(TRIG, frame0);
  const dt = 1 / 40000;
  let y = [phi0, 0, s0, 0];
  let t = 0, i = 0, rel = null, impact = null, wImpact = 0;
  const END = 0.9;
  while (t < END) {
    y = PH.rk4(f, t, y, dt);
    t += dt;
    i++;
    if (contact && y[3] < 0 && f(t, y)[3] >= 0) {
      contact = false;
      rel = { t: TRIG + t, v: -y[3], s: y[2], phi: y[0] };
    }
    if (impact === null && y[0] < 0) {
      impact = TRIG + t;
      wImpact = -y[1];
    }
    if (i % (t < 0.06 ? 4 : 40) === 0) rec.push(TRIG + t, { phi: y[0], s: y[2], b: contact ? y[2] : rel.s - rel.v * (TRIG + t - rel.t) });
  }
  if (!rel) return null;
  const clearT = rel.t + Math.max(0, Y0 + rel.s - STR_R - BOLT_CLEAR) / rel.v;
  return { rec, th, s0, phi0, T0, force: -2 * T0 * g0.uy, stored, release: rel, clearT, impact: impact ?? rel.t, wImpact, end: TRIG + END, final: { phi: y[0], s: y[2] }, ke: 0.5 * mb * rel.v * rel.v };
}

// ---------------------------------------------------------------- frames and builders
// A group of parts that is still most of the time: drawn into the scene's static order (solved
// once), switched to dynamic parts while its inputs change, and back to static when they settle.
// Its part ids never change, so static parts are always replaced, never left behind.
const GROUPS = new WeakMap();
function group(B, M, key, deps, fn) {
  if (!B.dynamic || !M.scene) {
    fn();
    return false;
  }
  let m = GROUPS.get(B);
  if (!m) GROUPS.set(B, (m = new Map()));
  const sig = JSON.stringify(deps);
  const g = m.get(key);
  const asStatic = () => {
    B.dynamic = false;
    try {
      fn();
    } finally {
      B.dynamic = true;
    }
  };
  if (!g) {
    asStatic();
    m.set(key, { sig, dyn: false });
    return false;
  }
  if (g.sig === sig) {
    if (g.dyn) {
      asStatic();
      g.dyn = false;
    }
    return false;
  }
  g.sig = sig;
  const wasStatic = !g.dyn;
  g.dyn = true;
  B.keep(key, deps, fn);
  return wasStatic;
}
// The gun frame: local metres → world units, elevated by e about X, traversed by tr about Z.
function frameOf(e, tr) {
  const ce = Math.cos(e), se = Math.sin(e), ct = Math.cos(tr), st = Math.sin(tr);
  const R = (x, y, z) => {
    const y1 = y * ce + z * se;
    const z1 = -y * se + z * ce;
    return [x * ct - y1 * st, x * st + y1 * ct, z1];
  };
  return {
    p: (x, y, z) => {
      const r = R(x, y, z);
      return [r[0] * S, r[1] * S, (r[2] + ZP) * S];
    },
    d: (x, y, z) => R(x, y, z),
  };
}
const WORLD = { p: (x, y, z) => w(x, y, z), d: (x, y, z) => [x, y, z] };
const AXES = { x: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], y: [[0, 1, 0], [1, 0, 0], [0, 0, 1]], z: [[0, 0, 1], [1, 0, 0], [0, 1, 0]] };
// A prism along a frame axis; poly (metres) in the two other axes, in order (x: y,z · y: x,z · z: x,y).
function prism(B, GF, id, axis, from, to, poly, o = {}) {
  const A = AXES[axis];
  const F = { o: GF.p(0, 0, 0), a: GF.d(...A[0]), u: GF.d(...A[1]), v: GF.d(...A[2]) };
  B.prism(id, F, poly.map(([a, b]) => [a * S, b * S]), from * S, to * S, o);
}
const rect = (a0, a1, b0, b1) => [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
const rrect = (a0, a1, b0, b1, r) => polyRound(a1 - a0, b1 - b0, r, 2).map(([a, b]) => [a + (a0 + a1) / 2, b + (b0 + b1) / 2]);
const iso = (B, pts) => k.pathOf(pts.map(B.at));

// ---------------------------------------------------------------- the rack
const RACK_BOX = [0.47, -0.53, 0.28, 0.2]; // x, y, w, d
const RACK_Z = 0.13;
const rackTail = (i) => [0.525 + 0.085 * Math.floor(i / 2), -0.475 + 0.09 * (i % 2), RACK_Z];

export default {
  id: "scorpio",
  name: "Scorpio",
  short: "Scorpio",
  unit: U,
  view: { W: 1000, H: 640, azimuth: 54, elevation: 31, pad: 22, fit: [w(-0.74, -0.86, -0.12), w(0.84, -0.86, -0.12), w(-0.74, 0.7, -0.12), w(0.84, 0.7, -0.12), w(0, -0.42, 1.78), w(0, 0.08, 1.8)] },
  target: { kind: "palisade", distance: 200, maxRange: 420 },
  ammo: [
    { id: "bolt", name: "Bolt", look: "bolt", mass: 0.18, radius: 0.011, cd: 1.3, length: 0.69, shaft: 0.011 },
    { id: "fire", name: "Fire bolt", look: "firebolt", mass: 0.22, radius: 0.013, cd: 1.9, length: 0.69, shaft: 0.011, fire: true },
    { id: "heavy", name: "Heavy bolt", look: "bolt", mass: 0.32, radius: 0.012, cd: 1.1, length: 0.69, shaft: 0.012, heavy: true },
  ],
  controls: [
    { id: "twist", name: "Skein pre-twist", min: 30, max: 60, step: 1, value: 45, unit: "°" },
    { id: "draw", name: "Draw", min: 40, max: 100, step: 5, value: 100, unit: "%" },
    { id: "elev", name: "Elevation", min: -5, max: 40, step: 0.5, value: 12.5, unit: "°", digits: 1 },
    { id: "trav", name: "Traverse", min: -8, max: 8, step: 0.5, value: 0, unit: "°", digits: 1 },
    { id: "distance", name: "Palisade distance", min: 100, max: 380, step: 10, value: 200, unit: "m" },
  ],
  actions: [
    { id: "wind", name: "Wind", key: "w" },
    { id: "loose", name: "Loose", key: " ", primary: true },
  ],
  toggles: [
    { id: "cut", name: "Cutaway" },
    { id: "strobe", name: "Strobe" },
  ],
  focus: [
    { id: "skeins", name: "Skeins" },
    { id: "arms", name: "Arms" },
    { id: "slider", name: "Slider" },
    { id: "windlass", name: "Windlass" },
    { id: "trigger", name: "Trigger" },
    { id: "mount", name: "Mount" },
  ],
  phases: ["rest", "engage", "winding", "loading", "armed", "loose", "flight", "impact"],
  hint: "Space · loose   W · wind",
  holdShot: true,

  build(B, M) {
    const mini = !!B.mini;
    if (!mini) {
      B.plinth({ x: -0.74 * S, y: -0.86 * S, w: 1.58 * S, d: 1.56 * S, r: 10 }, { h: 12, foot: 6, ruler: "y", label: { x: -0.64 * S, y: 0.4 * S, w: 46, d: 22, r: 1.5 } });
      B.halo("stand.halo", [w(-0.68, -0.74, 0), w(0.76, -0.74, 0), w(0.76, 0.5, 0), w(-0.68, 0.5, 0)], 0, { blur: 6 });
    }
    const o = { sys: "mount" };
    // Hexagonal hub with three feet, iron shoes and strut straps.
    B.prism("stand.hub", { o: w(0, 0, 0), a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, G.hullOf(Array.from({ length: 6 }, (_, i) => [0.13 * S * Math.cos((i * TAU) / 6), 0.13 * S * Math.sin((i * TAU) / 6)])), 0, 0.16 * S, { mat: "oak", tone: "mid", ...o });
    for (const [i, ang] of [[0, -90], [1, 30], [2, 150]]) {
      const c = Math.cos(rad(ang)), s = Math.sin(rad(ang));
      const r0 = 0.1126, r1 = FOOT;
      B.beam(`stand.foot${i}`, w(c * r0, s * r0, 0.045), w(c * r1, s * r1, 0.045), { w: 0.09 * S, h: 0.09 * S, up: [0, 0, 1], mat: "oak", tone: "mid", ...o, grain: 2, bands: [{ at: (0.44 - r0) * S, w: 0.06 * S, t: 0.004 * S }, { at: (r1 - r0 - 0.035) * S, w: 0.05 * S, t: 0.004 * S }], nails: [{ s: 0.06 * S, face: "v", x: [-0.4, 0.4] }] });
      // Strut from the strap on the foot to the band on the column.
      const lo = [c * 0.44, s * 0.44, 0.094], hi = [c * 0.068, s * 0.068, Z_BAND + 0.03];
      const dir = unit(sub(hi, lo));
      B.beam(`stand.strut${i}`, w(...add(lo, mul(dir, 0.026))), w(...hi), { w: 0.05 * S, h: 0.05 * S, up: [-s, c, 0], mat: "oak", tone: "mid", ...o, nails: [{ s: 0.05 * S, face: "v", x: 0 }] });
    }
    // Column in runs between its bands; the collar between 0.70 and 0.76 turns with the yoke.
    B.cyl("stand.col0", w(0, 0, 0.16), w(0, 0, Z_BAND), 0.062 * S, { mat: "oak", tone: "mid", ...o, ribs: { count: 10, tone: "faint" } });
    B.cyl("stand.band0", w(0, 0, Z_BAND), w(0, 0, Z_BAND + 0.06), 0.07 * S, { mat: "iron", tone: "hi", ...o, seams: [0.03 * S] });
    B.cyl("stand.col1", w(0, 0, Z_BAND + 0.06), w(0, 0, Z_COLLAR), 0.062 * S, { mat: "oak", tone: "mid", ...o, ribs: { count: 10, tone: "faint" } });
    B.cyl("stand.col2", w(0, 0, Z_COLLAR + 0.06), w(0, 0, ZP - 0.2), 0.062 * S, { mat: "oak", tone: "mid", ...o, ribs: { count: 10, tone: "faint" } });
    B.cyl("stand.band1", w(0, 0, ZP - 0.2), w(0, 0, ZP - 0.16), 0.07 * S, { mat: "iron", tone: "hi", ...o });
    B.cyl("stand.turntable", w(0, 0, ZP - 0.16), w(0, 0, ZP - 0.135), 0.085 * S, { mat: "bronze", tone: "hi", ...o, bolts: [{ r: 0.074 * S, count: 8 }] });
  },

  init(M) {
    const th = rad(M.ctrl.twist);
    const r = restOf(th);
    return { mode: "rest", engaged: true, slider: r.s, from: r.s, twist: M.ctrl.twist, elev: M.ctrl.elev, trav: M.ctrl.trav, eng: 0, wind: 0, load: 0, loaded: false, auto: false, sim: null, flight: null, fxImpact: false, shotAmmo: null };
  },

  act(M, id) {
    const st = M.state;
    const start = () => {
      if (st.mode !== "rest") return;
      if (st.engaged) {
        st.mode = "winding";
        st.from = st.slider;
        st.wind = 0;
        M.setPhase("winding");
      } else {
        st.mode = "engage";
        st.from = st.slider;
        st.eng = 0;
        M.setPhase("engage");
      }
    };
    if (id === "wind") start();
    if (id === "loose") {
      if (st.mode === "armed") return this.fire(M);
      start();
      if (st.mode !== "shot") st.auto = true;
    }
  },

  onControl(M, id) {
    if (id === "distance") {
      M.def.target.distance = M.ctrl.distance;
      M.range.mount(M.def, M);
    }
  },

  fire(M) {
    const st = M.state;
    st.twist = M.ctrl.twist;
    st.elev = M.ctrl.elev;
    st.trav = M.ctrl.trav;
    const ammo = M.ammo;
    const sim = simulate(rad(st.twist), st.slider, ammo);
    if (!sim) return;
    sim.elev = st.elev;
    sim.trav = st.trav;
    st.sim = sim;
    st.shotAmmo = ammo;
    st.mode = "shot";
    st.auto = false;
    st.fxImpact = false;
    st.sfxT = 0;
    const GF = frameOf(rad(st.elev), rad(st.trav));
    const v = mul(GF.d(0, -1, 0), sim.release.v);
    // Handed to free flight once the bolt's tail has left the frame (its point at 0.8 of its length).
    const p = GF.p(0, BOLT_CLEAR - 0.8 * ammo.length, ZA);
    const flight = M.launch({ p, v, t0: sim.clearT, spin: 0 });
    st.flight = flight;
    const T = Math.max(sim.end + 0.3, sim.clearT + flight.impact.t + 2.4);
    M.startShot(T, [[0.12, "trip"], [sim.release.t, "loose"], [sim.clearT + flight.impact.t, "impact"]]);
    M.setPhase("loose");
  },

  endShot(M) {
    const st = M.state;
    st.mode = "rest";
    st.engaged = false;
    st.loaded = false;
    M.setPhase("rest");
  },

  tour(M) {
    if (M.state.mode === "rest") this.act(M, "loose");
  },

  update(M, dt) {
    const st = M.state;
    const sfx = (name, o) => M.sfx?.(name, o);
    let moving = false;
    if (st.mode !== "shot") {
      for (const [key, rate, eps] of [["twist", 3, 0.02], ["elev", 4, 0.01], ["trav", 4, 0.01]]) {
        const target = M.ctrl[key];
        const d = target - st[key];
        if (Math.abs(d) > eps && !M.calm) {
          st[key] += d * (1 - Math.exp(-dt * rate));
          moving = true;
        } else st[key] = target;
      }
    }
    // One click per ratchet tooth while the windlass turns (with the pawls down).
    const clicks = Math.floor((Math.max(0, st.slider - S_REF) / (TAU * WR)) * TEETH);
    if (clicks !== st.clicks) {
      if (st.mode === "winding" && clicks > (st.clicks ?? 0) && dt > 0) sfx("click", { pitch: 1.25, gap: 0.012 });
      st.clicks = clicks;
    }
    if (st.mode === "engage") {
      const e0 = st.eng;
      st.eng = Math.min(1, st.eng + dt / (0.9 + 0.9 * Math.min(1, (st.from - S_REF) / STROKE)));
      if (e0 === 0 && st.eng > 0) sfx("creak", { pitch: 1.3 });
      if (e0 < 0.9 && st.eng >= 0.9) sfx("clank", { pitch: 1.4 });
      const r = restOf(rad(st.twist));
      st.slider = st.from + (r.s - st.from) * ease(clamp(st.eng / 0.72, 0, 1));
      if (st.eng >= 1) {
        st.engaged = true;
        st.mode = "winding";
        st.from = st.slider;
        st.wind = 0;
        M.setPhase("winding");
      }
      return true;
    }
    if (st.mode === "winding") {
      const target = S_REF + (M.ctrl.draw / 100) * STROKE;
      const span = Math.max(0.05, Math.abs(target - st.from));
      st.wind = Math.min(1, st.wind + dt / (0.6 + 4.2 * (span / STROKE)));
      st.slider = st.from + (target - st.from) * ease(st.wind);
      if (st.wind >= 1) {
        st.slider = target;
        st.mode = "loading";
        st.load = 0;
        st.loaded = true;
        M.setPhase("loading");
      }
      return true;
    }
    if (st.mode === "loading") {
      st.load = Math.min(1, st.load + dt / 1.2);
      if (st.load >= 1) {
        sfx("tick");
        st.mode = "armed";
        M.setPhase("armed");
        if (st.auto) this.fire(M);
      }
      return true;
    }
    if (st.mode === "armed") {
      const target = S_REF + (M.ctrl.draw / 100) * STROKE;
      const d = target - st.slider;
      if (Math.abs(d) > 1e-4 && !M.calm) {
        st.slider += d * (1 - Math.exp(-dt * 2.5));
        moving = true;
      } else st.slider = target;
      return moving || !!M.ammo.fire;
    }
    if (st.mode === "shot" && M.shot && st.sim) {
      const t = M.shot.t;
      const sim = st.sim;
      const hit = sim.clearT + st.flight.impact.t;
      M.setPhase(t < sim.release.t ? "loose" : t < hit ? "flight" : "impact");
      // Sounds for the events the playing record passes: trigger, release, arms on the cushions.
      const t0 = st.sfxT ?? 0;
      if (M.shot.playing && t > t0) {
        const past = (at) => t0 < at && t >= at;
        if (past(TRIG - 0.03)) sfx("clank", { pitch: 1.1 });
        if (past(TRIG)) sfx("twang", { pitch: 0.75 + 0.3 * (sim.release.v / 80) });
        if (past(sim.impact)) sfx("thud", { pitch: 1.6, size: 0.4, gain: 0.5 });
      }
      st.sfxT = t;
      if (t < sim.impact) st.fxImpact = false;
      else if (!st.fxImpact) {
        st.fxImpact = true;
        if (!M.calm) {
          const GF = frameOf(rad(sim.elev), rad(sim.trav));
          for (const sg of [1, -1]) {
            const p = GF.p(sg * (XK + 0.11), YS - 0.02, ZA);
            M.fx.emit("dust", p, { n: 7, v: [0, 0, 0.15 * S], spread: 0.25 * S, size: 0.03 * S, grow: 0.12 * S, life: 0.9, drag: 2.4, buoy: 0.05 * S, alpha: 0.7 });
            M.fx.emit("splinter", p, { n: 2, v: [sg * 0.4 * S, -0.3 * S, 0.5 * S], spread: 0.4 * S, size: 0.008 * S, life: 0.7, grav: 1, drag: 0.3 });
          }
        }
      }
      return !M.shot.finished;
    }
    return moving;
  },

  // The pose the machine is drawn in this frame.
  pose(M) {
    const st = M.state;
    const shot = st.mode === "shot" && M.shot && st.sim;
    const elev = shot ? st.sim.elev : st.elev;
    const trav = shot ? st.sim.trav : st.trav;
    const twist = shot ? deg(st.sim.th) : st.twist;
    const th = rad(twist);
    const out = { elev, trav, twist, sClaw: st.slider, held: false, claw: 0, trig: 0, pawlUp: 0, bolt: null, ammo: shot ? st.shotAmmo : M.ammo };
    if (shot) {
      const t = M.shot.t;
      const f = st.sim.rec.at(t);
      out.sClaw = st.sim.s0;
      out.phi = f.phi;
      out.sStr = f.s;
      out.held = t < TRIG;
      out.claw = smoothstep(TRIG - 0.014, TRIG + 0.004, t);
      out.trig = smoothstep(0.12, TRIG - 0.01, t);
      if (t < st.sim.clearT) out.bolt = { s: f.b };
      out.t = t;
    } else if (st.engaged) {
      out.sStr = st.slider;
      out.phi = armAt(st.slider, th);
      out.held = true;
      if (st.mode === "loading") out.bolt = { s: st.slider, load: st.load };
      else if (st.mode === "armed") out.bolt = { s: st.slider };
    } else {
      const r = restOf(th);
      out.phi = r.phi;
      out.sStr = r.s;
      out.claw = 1;
      out.trig = 1;
      if (st.mode === "engage") {
        const e = st.eng;
        out.pawlUp = smoothstep(0, 0.12, e) * (1 - smoothstep(0.7, 0.85, e));
        out.claw = 1 - smoothstep(0.76, 0.93, e);
        out.trig = 1 - smoothstep(0.86, 1, e);
      }
    }
    out.w = -(out.sClaw - S_REF) / WR;
    return out;
  },

  draw(B, M) {
    const st = M.state;
    const mini = !!B.mini;
    const pose = this.pose(M);
    const GF = frameOf(rad(pose.elev), rad(pose.trav));
    const key = [pose.elev.toFixed(3), pose.trav.toFixed(3)];
    // Groups that rest most of the time join the static order; while they move they are dynamic.
    let reseal = false;
    const still = (k, deps, fn) => (reseal = group(B, M, k, deps, fn) || reseal);
    still("yoke", key, () => drawMount(B, pose, mini));
    still("gun", key, () => drawGun(B, GF, mini));
    const phiA = Math.round(pose.phi / 0.0012) * 0.0012;
    B.keep("arms", [...key, phiA.toFixed(4)], () => {
      for (const sg of [1, -1]) drawArm(B, GF, sg, phiA, mini);
    });
    if (mini) {
      for (const sg of [1, -1]) B.cyl(`skein${sg}`, GF.p(sg * XK, YS, ZPB1), GF.p(sg * XK, YS, ZPT0), SKR * S, { mat: "sinew" });
      return;
    }
    still("washers", [...key, pose.twist.toFixed(2)], () => {
      for (const sg of [1, -1]) for (const top of [true, false]) drawWasher(B, GF, sg, top, rad(pose.twist));
    });
    const phiQ = Math.round(pose.phi / 0.003) * 0.003;
    B.keep("skeins", [...key, pose.twist.toFixed(2), phiQ.toFixed(4)], () => {
      for (const sg of [1, -1]) drawSkein(B, GF, sg, rad(pose.twist), phiQ);
    });
    B.keep("string", [...key, pose.phi.toFixed(5), pose.sStr.toFixed(5), pose.claw < 0.5], () => drawString(B, GF, { ...pose, phi: phiA }));
    still("slider", [...key, pose.sClaw.toFixed(5), pose.claw.toFixed(3), pose.trig.toFixed(3)], () => drawSlider(B, GF, pose));
    still("windlass", [...key, pose.w.toFixed(4), pose.pawlUp.toFixed(3), pose.sClaw.toFixed(4)], () => drawWindlass(B, GF, pose));
    still("rack", [M.ammo.id, st.loaded], () => drawRack(B, M, st.loaded));
    // The bolt: from the rack into the groove, on the string, and through the frame.
    const ammo = pose.ammo;
    if (pose.bolt) {
      let tail, dir;
      const groove = GF.p(0, Y0 + pose.bolt.s - STR_R, ZA);
      const along = GF.d(0, -1, 0);
      if (pose.bolt.load !== undefined && pose.bolt.load < 1) {
        // Lifted out of the box, carried high over the arms and string, lowered flat into the V of
        // the string and slid forward so its head enters under the top hole-carrier (a cubic path).
        const u = ease(pose.bolt.load);
        const P0 = w(...rackTail(2 * M.ammoIndex, ammo));
        const P1 = add(P0, [0, 0, 1.55 * S]);
        const P2 = GF.p(0, Y0 + pose.bolt.s - STR_R + 0.12, ZA + 0.32);
        const P3 = groove;
        const v = 1 - u;
        tail = add(add(mul(P0, v * v * v), mul(P1, 3 * v * v * u)), add(mul(P2, 3 * v * u * u), mul(P3, u * u * u)));
        dir = unit(lerp([0, 0, 1], along, smoothstep(0.08, 0.62, u)));
      } else {
        tail = groove;
        dir = along;
      }
      drawBolt(B, "bolt", tail, dir, ammo, {});
      if (ammo.fire && !M.calm && Math.random() < 0.75) {
        const tow = add(tail, mul(dir, 0.76 * ammo.length * S));
        M.fx.emit("fire", add(tow, [0, 0, 0.03 * S]), { n: 1, v: [0, 0, 0.5 * S], spread: 0.08 * S, size: 0.06 * S, grow: 0.03 * S, life: 0.35, heat: 1, buoy: 0.9 * S, drag: 2 });
        if (Math.random() < 0.3) M.fx.emit("smoke", add(tow, [0, 0, 0.09 * S]), { n: 1, v: [0, 0, 0.3 * S], spread: 0.05 * S, size: 0.05 * S, grow: 0.3 * S, life: 1.6, alpha: 0.5, buoy: 0.25 * S, drag: 1.2 });
      }
    }
    if (M.toggles.strobe && st.sim && M.shot && st.mode === "shot") drawStrobe(B, GF, st.sim, M.shot.t);
    if (reseal) M.scene.seal();
  },

  readouts(M) {
    const st = M.state;
    const pose = this.pose(M);
    const th = rad(pose.twist);
    const g = geoAt(pose.phi, pose.sStr);
    const T = pose.held ? tension(g) : 0;
    const force = -2 * T * g.uy;
    const energy = 2 * PH.skeinEnergy(th, th + Math.max(0, pose.phi), SKEIN) + (pose.held ? K_STR * Math.max(0, g.l - L0) ** 2 : 0);
    const turns = Math.max(0, -pose.w) / TAU;
    const rows = [
      ["Pre-twist", fmt(pose.twist, 0), "°"],
      ["Skein twist", fmt(pose.twist + deg(pose.phi), 1), "°"],
      ["Arm swing", fmt(deg(pose.phi), 1), "°"],
      ["Slider draw", fmt(Math.max(0, pose.sClaw - S_REF) * 100, 1), "cm"],
      ["Draw force", fmt(force / 1000, 2), "kN"],
      ["Skein torque", fmtInt(PH.skeinTorque(th + pose.phi, SKEIN)), "N·m"],
      ["Stored energy", fmtInt(energy), "J"],
      ["Windlass", `${fmt(turns, 2)} · ${fmtInt(Math.floor(turns * TEETH))}`, "turns · clicks"],
    ];
    if (st.sim) {
      rows.push(["Stroke", fmt((st.sim.release.t - TRIG) * 1000, 1), "ms"], ["Efficiency", fmt((st.sim.ke / st.sim.stored) * 100, 0), "%"]);
    }
    return rows;
  },
};

// ---------------------------------------------------------------- stand and universal joint
function drawMount(B, pose, mini) {
  const Y = frameOf(0, rad(pose.trav));
  const GF = frameOf(rad(pose.elev), rad(pose.trav));
  const o = { sys: "mount" };
  // Collar on the column, turning with the yoke, with the prop's lug plates.
  B.cyl("mount.collar", Y.p(0, 0, Z_COLLAR - ZP), Y.p(0, 0, Z_COLLAR + 0.06 - ZP), 0.08 * S, { mat: "iron", tone: "hi", ...o, F: { o: Y.p(0, 0, Z_COLLAR - ZP), a: [0, 0, 1], u: Y.d(1, 0, 0), v: Y.d(0, 1, 0) }, bolts: [{ r: 0.071 * S, count: 6, phase: 0.5 }] });
  for (const sg of [1, -1]) {
    prism(B, Y, `mount.lug${sg}`, "x", sg > 0 ? 0.026 : -0.034, sg > 0 ? 0.034 : -0.026, rrect(0.072, 0.135, Z_COLLAR + 0.01 - ZP, Z_COLLAR + 0.05 - ZP, 0.012), { mat: "iron", tone: "hi", ...o });
    B.cyl(`mount.lugpin${sg}`, Y.p(sg * 0.034, 0.112, Z_COLLAR + 0.03 - ZP), Y.p(sg * 0.041, 0.112, Z_COLLAR + 0.03 - ZP), 0.008 * S, { mat: "iron", tone: "hi", ...o });
  }
  // Yoke base and fork cheeks on the turntable.
  prism(B, Y, "mount.yoke", "x", -0.11, 0.11, rect(-0.11, 0.11, -0.135, -0.09), { mat: "oak", tone: "mid", ...o, over: mini ? "" : B.D([[-0.08, -0.08], [0.08, -0.08], [-0.08, 0.08], [0.08, 0.08]].map(([x, y]) => B.at(Y.p(x, y, -0.09))), { size: 0.5 }) });
  for (const sg of [1, -1]) {
    prism(B, Y, `mount.fork${sg}`, "x", sg > 0 ? 0.065 : -0.1, sg > 0 ? 0.1 : -0.065, rrect(-0.045, 0.045, -0.09, 0.045, 0.02), { mat: "oak", tone: "mid", ...o, cut: sg > 0 ? true : undefined });
    // Pin: washer and head outside each cheek (they turn with the case).
    B.cyl(`mount.pinwasher${sg}`, GF.p(sg * 0.1, 0, 0), GF.p(sg * 0.104, 0, 0), 0.027 * S, { mat: "iron", tone: "hi", ...o, cut: sg > 0 ? true : undefined });
    B.cyl(`mount.pinhead${sg}`, GF.p(sg * 0.104, 0, 0), GF.p(sg * 0.12, 0, 0), 0.016 * S, { mat: "iron", tone: "hi", ...o, cut: sg > 0 ? true : undefined, faceRing: [{ r: 0.007 * S }] });
  }
  if (mini) return;
  // The elevation prop: a sleeve hinged on the collar lug and a pegged bar hinged under the case.
  const H0 = Y.p(0, 0.112, Z_COLLAR + 0.03 - ZP);
  const H1 = GF.p(0, 0.5, ZCB - 0.035);
  const dir = unit(sub(H1, H0));
  const L = len(sub(H1, H0));
  const SL = Math.min(0.32 * S, L - 0.02 * S);
  const side = Y.d(1, 0, 0);
  const up = cross(dir, side);
  // Sleeve with an iron band at its mouth; the band's dots are the ends of the locking peg.
  B.beam("mount.sleeve", H0, add(H0, mul(dir, SL)), { w: 0.05 * S, h: 0.05 * S, up, mat: "oak", tone: "hi", ...o, grain: 1, bands: [{ at: SL - 0.016 * S, w: 0.032 * S, t: 0.004 * S }] });
  const barFrom = add(H0, mul(dir, SL));
  const holes = [];
  for (let s = 0.03 * S; s < L - SL - 0.025 * S; s += 0.04 * S) holes.push(B.at(add(add(barFrom, mul(dir, s)), mul(side, 0.017 * S))));
  B.beam("mount.bar", barFrom, H1, { w: 0.034 * S, h: 0.034 * S, up, mat: "oak", tone: "hi", ...o, over: holes.length ? B.D(holes, { size: 0.7, tone: "lo" }) : "" });
}

// ---------------------------------------------------------------- the case, the head frame, the cheeks
function drawGun(B, GF, mini) {
  const up = GF.d(0, 0, 1);
  // Case (stock) with its front cap and the dovetail rails the slider runs in.
  // The case runs in pieces between the frame, the saddle and the cheeks, so each orders locally.
  const cuts = CASE_CUTS;
  const nails = [-0.62, -0.18, 0.12, 0.33, 0.5, 0.8];
  for (let i = 0; i < cuts.length - 1; i++) {
    const [y0, y1] = [cuts[i], cuts[i + 1]];
    B.beam(`case.${i}`, GF.p(0, y0, (ZCB + ZCT) / 2), GF.p(0, y1, (ZCB + ZCT) / 2), { w: 0.14 * S, h: (ZCT - ZCB) * S, up, mat: "oak", tone: "mid", sys: "slider", grain: mini ? 0 : 2, nails: mini ? [] : nails.filter((y) => y > y0 && y < y1).map((y) => ({ s: (y - y0) * S, face: "-u", x: [-0.5, 0.5] })) });
  }
  prism(B, GF, "case.cap", "y", CASE_Y0 - 0.006, CASE_Y0, rect(-0.07, 0.07, ZCB, ZCT), { mat: "iron", tone: "hi", sys: "slider" });
  for (const sg of [1, -1]) {
    const poly = [[0.055, ZCT], [0.07, ZCT], [0.07, ZRT], [0.045, ZRT]].map(([x, z]) => [sg * x, z]);
    const rc = RAIL_CUTS;
    for (let i = 0; i < rc.length - 1; i++) {
      const pegs = [-0.6, -0.12, 0.2, 0.45].filter((y) => y > rc[i] && y < rc[i + 1]);
      prism(B, GF, `case.rail${sg}.${i}`, "y", rc[i], rc[i + 1], poly, { mat: "oak", tone: "hi", sys: "slider", cut: sg > 0 ? true : undefined, over: mini || !pegs.length ? "" : B.D(pegs.map((y) => B.at(GF.p(sg * 0.062, y, ZRT))), { size: 0.45 }) });
    }
  }
  // Universal-joint saddle block under the case and the prop's bracket straps.
  prism(B, GF, "case.saddle", "x", -0.065, 0.065, rect(-0.06, 0.06, -0.045, ZCB), { mat: "oak", tone: "mid", sys: "mount" });
  for (const sg of [1, -1]) {
    prism(B, GF, `case.bracket${sg}`, "x", sg > 0 ? 0.017 : -0.026, sg > 0 ? 0.026 : -0.017, rrect(0.478, 0.522, ZCB - 0.055, ZCB, 0.008), { mat: "iron", tone: "hi", sys: "mount" });
    if (!mini) B.cyl(`case.bracketpin${sg}`, GF.p(sg * 0.026, 0.5, ZCB - 0.035), GF.p(sg * 0.032, 0.5, ZCB - 0.035), 0.007 * S, { mat: "iron", tone: "hi", sys: "mount" });
  }
  // Head: two hole-carriers, middle and outer stanchions.
  for (const [id, z0, z1] of [["head.top", ZPT0, ZPT1], ["head.bot", ZPB0, ZPB1]]) {
    const top = id === "head.top";
    // Each hole-carrier in three pieces (the joints fall on the middle stanchions).
    const zc = (z0 + z1) / 2;
    const pegs = [-0.305, -0.095, 0.095, 0.305];
    for (const [i, x0, x1] of [[0, -PLATE_X, -0.12], [1, -0.12, 0.12], [2, 0.12, PLATE_X]]) {
      const bands = i === 0 ? [{ at: 0.026 * S, w: 0.024 * S, t: 0.004 * S }] : i === 2 ? [{ at: (x1 - x0 - 0.026) * S, w: 0.024 * S, t: 0.004 * S }] : [];
      const nails = mini || !top ? [] : pegs.filter((x) => x > x0 && x < x1).map((x) => ({ s: (x - x0) * S, face: "v", x: [-0.75, 0.15] })).concat(pegs.filter((x) => Math.abs(x) < 0.2 && x > x0 && x < x1).map((x) => ({ s: (x - x0) * S, face: "u", x: [-0.4, 0.4] })));
      B.beam(`${id}${i}`, GF.p(x0, YS, zc), GF.p(x1, YS, zc), { w: 2 * PLATE_D * S, h: (z1 - z0) * S, up, mat: "oak", tone: "hi", grain: mini ? 0 : 2, bands, nails });
    }
  }
  for (const sg of [1, -1]) {
    prism(B, GF, `head.mid${sg}`, "x", sg > 0 ? 0.07 : -0.12, sg > 0 ? 0.12 : -0.07, rect(YS - PLATE_D, YS + 0.045, ZPB1, ZPT0), { mat: "oak", tone: "hi", grain: 0 });
    prism(B, GF, `head.out${sg}`, "z", ZPB1, ZPT0, stanchion(sg), { mat: "oak", tone: "hi", cut: sg > 0 ? true : undefined });
  }
  // Windlass cheeks on the case sides.
  for (const sg of [1, -1]) {
    prism(B, GF, `wind.cheek${sg}`, "x", sg > 0 ? 0.07 : -0.125, sg > 0 ? 0.125 : -0.07, rrect(0.56, 0.74, ZCB, 0.37, 0.022), { mat: "oak", tone: "hi", sys: "windlass", over: mini || sg < 0 ? "" : B.D([[0.585, ZCB + 0.025], [0.715, ZCB + 0.025], [0.715, 0.17]].map(([y, z]) => B.at(GF.p(0.125, y, z))), { size: 0.5, tone: "hi" }) });
  }
}

// Outer stanchion's section (top view, gun frame): its back face is cut parallel to the arm at rest.
const yOnFace = (x) => (x * Math.sin(A0) - D_C) / Math.cos(A0);
function stanchion(sg) {
  return [[0.085, -PLATE_D], [0.145, -PLATE_D], [0.145, yOnFace(0.145)], [0.085, yOnFace(0.085)]].map(([x, y]) => [sg * (XK + x), YS + y]);
}
// The hair cushion between the stanchion and the arm: compressed when the arm drives into it.
function cushion(sg, phi) {
  const n0 = [Math.sin(A0), -Math.cos(A0)];
  const a = A0 + phi;
  const nP = [Math.sin(a), -Math.cos(a)];
  const outer = [[0.087, yOnFace(0.087)], [0.143, yOnFace(0.143)]];
  const inner = outer.map(([x, y]) => {
    const t = clamp((x * nP[0] + y * nP[1] - ARM_HALF) / (n0[0] * nP[0] + n0[1] * nP[1]), 0.004, PAD);
    return [x - n0[0] * t, y - n0[1] * t];
  });
  return [outer[0], outer[1], inner[1], inner[0]].map(([x, y]) => [sg * (XK + x), YS + y]);
}

// ---------------------------------------------------------------- arms, skeins, washers, string
const ARM_SEG = [
  [0.039, 0.068, 0.03, 0.048, "oak"],
  [0.068, 0.084, 0.046, 0.056, "iron"],
  [0.084, 0.2, 0.044, 0.052, "oak"],
  [0.2, 0.214, 0.049, 0.057, "iron"],
  [0.214, 0.4, 0.038, 0.045, "oak"],
  [0.4, 0.414, 0.045, 0.05, "sinew"],
  [0.414, 0.44, 0.039, 0.045, "iron"],
];
const armTip = (sg, phi, s = ARM) => [sg * (XK + s * Math.cos(A0 + phi)), YS + s * Math.sin(A0 + phi), ZA];

function drawArm(B, GF, sg, phi, mini) {
  const a = A0 + phi;
  const d = [sg * Math.cos(a), Math.sin(a), 0];
  const at = (s) => GF.p(sg * XK + d[0] * s, YS + d[1] * s, ZA);
  const up = GF.d(0, 0, 1);
  ARM_SEG.forEach(([s0, s1, wd, ht, mat], i) => {
    if (mini && mat !== "oak") return;
    const iron = mat === "iron";
    B.beam(`arm${sg}.${i}`, at(s0), at(s1), { w: wd * S, h: ht * S, up, mat, tone: "hi", sys: "arms", crease: iron ? "lo" : undefined, grain: !mini && mat === "oak" && s1 - s0 > 0.15 ? 1 : 0 });
  });
  if (mini) return;
  prism(B, GF, `arm${sg}.cushion`, "z", ZA - 0.03, ZA + 0.03, cushion(sg, phi), { mat: "hide", tone: "hi", sys: "arms", cut: sg > 0 ? true : undefined });
}

// Strands of a twisted skein: helices from angle a0 at z0 to a1 at z1, fading round the limbs.
function helix(B, GF, cx, cy, z0, z1, r, a0, a1, count = 14) {
  const list = [];
  const V = B.V;
  const segs = 6;
  for (let i = 0; i < count; i++) {
    const base = ((i + 0.5) / count) * TAU;
    let prev = null;
    let prevF = 0;
    for (let j = 0; j <= segs; j++) {
      const t = j / segs;
      const ang = base + a0 + (a1 - a0) * t;
      const z = z0 + (z1 - z0) * t;
      const f = dot(GF.d(Math.cos(ang), Math.sin(ang), 0), V);
      const pt = B.at(GF.p(cx + r * Math.cos(ang), cy + r * Math.sin(ang), z));
      if (prev) {
        const alpha = G.fadeOf((f + prevF) / 2, [0.08, 0.5]);
        if (alpha > 0.02) list.push({ d: k.pathOf([prev, pt]), alpha });
      }
      prev = pt;
      prevF = f;
    }
  }
  return k.fadedSvg(list, { tone: "lo" });
}

function drawSkein(B, GF, sg, th, phi) {
  const cx = sg * XK, cy = YS;
  const armRot = sg * phi;
  const wash = -sg * th;
  const F = (z) => ({ o: GF.p(cx, cy, z), a: GF.d(0, 0, 1), u: GF.d(1, 0, 0), v: GF.d(0, 1, 0) });
  const zl1 = ZA - ROOT_H, zu0 = ZA + ROOT_H;
  const o = { mat: "sinew", tone: "hi", sys: "skeins", steps: 24 };
  B.cyl(`skein${sg}.lo`, GF.p(cx, cy, ZPB1), GF.p(cx, cy, zl1), SKR * S, { ...o, F: F(ZPB1), inner: helix(B, GF, cx, cy, ZPB1, zl1, SKR, wash, armRot) });
  B.cyl(`skein${sg}.mid`, GF.p(cx, cy, zl1), GF.p(cx, cy, zu0), (SKR + 0.0025) * S, { ...o, F: F(zl1), ribs: { count: 16, phase: armRot + TAU / 32 } });
  B.cyl(`skein${sg}.hi`, GF.p(cx, cy, zu0), GF.p(cx, cy, ZPT0), SKR * S, { ...o, F: F(zu0), inner: helix(B, GF, cx, cy, zu0, ZPT0, SKR, armRot, wash) });
}

// A bronze washer (modiolus) on a hole-carrier: flange, body, the skein's loops over the iron
// cross-bar, the lever that turned it and the peg that locks it.
function drawWasher(B, GF, sg, top, th) {
  const cx = sg * XK, cy = YS;
  const W = sg > 0 ? -th : Math.PI + th;
  const dir = [Math.cos(W), Math.sin(W)];
  const bar = [-dir[1], dir[0]];
  const sz = top ? 1 : -1;
  const z0 = top ? ZPT1 : ZPB0;
  const id = `washer${sg}${top ? "t" : "b"}`;
  const o = { sys: "skeins", tone: "hi" };
  const F = (z) => ({ o: GF.p(cx, cy, z), a: GF.d(0, 0, sz), u: GF.d(dir[0], dir[1], 0), v: GF.d(sz * bar[0], sz * bar[1], 0) });
  const zf = z0 + sz * 0.006, zb = zf + sz * 0.03;
  B.cyl(`${id}.flange`, GF.p(cx, cy, z0), GF.p(cx, cy, zf), 0.064 * S, { ...o, mat: "bronze", F: F(z0), bolts: top ? [{ s: 0.006 * S, r: 0.058 * S, count: 12, phase: 0.26 }] : undefined });
  B.cyl(`${id}.body`, GF.p(cx, cy, zf), GF.p(cx, cy, zb), 0.05 * S, { ...o, mat: "bronze", F: F(zf), faceRing: top ? [{ s: 0.03 * S, r: 0.041 * S }] : undefined });
  // Rope loops over the cross-bar, its iron ends resting in notches on the washer.
  const hz = zb + sz * 0.014;
  const hump = (s) => GF.p(cx + bar[0] * s, cy + bar[1] * s, hz);
  const HF = { o: hump(-0.032), a: GF.d(bar[0], bar[1], 0), u: GF.d(0, 0, 1), v: GF.d(dir[0], dir[1], 0) };
  B.cyl(`${id}.loops`, hump(-0.032), hump(0.032), 0.014 * S, { ...o, mat: "sinew", F: HF, seams: [0.009, 0.018, 0.027, 0.037, 0.046, 0.055].map((s) => s * S), seamTone: "lo" });
  const bz = zb + sz * 0.0065;
  for (const e of [1, -1]) B.beam(`${id}.bar${e}`, GF.p(cx + bar[0] * e * 0.032, cy + bar[1] * e * 0.032, bz), GF.p(cx + bar[0] * e * 0.056, cy + bar[1] * e * 0.056, bz), { w: 0.012 * S, h: 0.012 * S, up: GF.d(0, 0, 1), mat: "iron", ...o });
  // Lever bar in its socket on the washer's side, with a knob.
  const lz = (zf + zb) / 2;
  const tip = [cx + dir[0] * 0.19, cy + dir[1] * 0.19];
  B.beam(`${id}.lever`, GF.p(cx + dir[0] * 0.05, cy + dir[1] * 0.05, lz), GF.p(...tip, lz), { w: 0.016 * S, h: 0.012 * S, up: GF.d(0, 0, 1), mat: "iron", ...o, crease: "lo" });
  B.ball(`${id}.knob`, GF.p(tip[0] + dir[0] * 0.01, tip[1] + dir[1] * 0.01, lz), 0.011 * S, { mat: "iron", ...o });
  const pa = W + 2.3 * sg;
  const px = cx + 0.0575 * Math.cos(pa), py = cy + 0.0575 * Math.sin(pa);
  B.cyl(`${id}.peg`, GF.p(px, py, zf), GF.p(px, py, zf + sz * 0.026), 0.0055 * S, { mat: "iron", ...o, faceRing: top ? [{ r: 0.003 * S }] : undefined });
}

// A cord drawn as a stroked tube with its lay (cheap enough to move every frame), cut into short
// pieces so each orders against its neighbours. a, b in world units, r the radius in world units.
function cordTube(B, id, a, b, r, o = {}) {
  const L = len(sub(b, a));
  const n = o.pieces || Math.max(1, Math.ceil(L / (0.11 * S)));
  const W = 2 * r * B.KS;
  const pitch = Math.max(1.6, W * 1.4);
  for (let i = 0; i < n; i++) {
    const p0 = lerp(a, b, i / n), p1 = lerp(a, b, (i + 1) / n);
    const s0 = B.at(p0), s1 = B.at(p1);
    const dx = s1[0] - s0[0], dy = s1[1] - s0[1];
    const l = Math.hypot(dx, dy) || 1;
    const ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
    const ticks = [];
    for (let t = pitch / 2; t < l; t += pitch) {
      const cx = s0[0] + ux * t, cy = s0[1] + uy * t;
      ticks.push(k.pathOf([[cx + nx * W * 0.36 - ux * W * 0.22, cy + ny * W * 0.36 - uy * W * 0.22], [cx - nx * W * 0.36 + ux * W * 0.22, cy - ny * W * 0.36 + uy * W * 0.22]]));
    }
    const d = k.pathOf([s0, s1]);
    const svg = `<path class="iso-line cord" style="stroke:var(--anatomy-hi);stroke-width:${(W + 1.1).toFixed(2)}px;stroke-linecap:butt" d="${d}"/><path class="iso-line cord" style="stroke:var(--anatomy-top);stroke-width:${Math.max(0.4, W - 0.6).toFixed(2)}px;stroke-linecap:butt" d="${d}"/>` + (ticks.length ? `<path class="iso-line cord" style="stroke:var(--anatomy-lo);stroke-width:0.4px;stroke-linecap:butt" d="${ticks.join("")}"/>` : "");
    B.raw(`${id}~${i}`, svg, shapeOf([p0, p1], { r: o.pr ?? r, edges: [unit(sub(b, a))] }), { mat: "rope", ...o });
  }
}
// A small turned part (bolt heads, tow) with few facets, for parts that move every frame.
function lathePart(B, id, F, profile, o = {}) {
  const paths = G.solidOf(profile, F, B.P, { smooth: false, steps: 14 });
  const pts = [];
  for (const [s, r] of profile) for (let i = 0; i < 8; i++) pts.push(G.pointOf(F, s, Math.max(r, 0.01) / Math.cos(Math.PI / 8), (i * TAU) / 8));
  B.solid(id, paths, shapeOf(pts, { axes: [F.a], edges: [F.a, F.u, F.v] }), o);
}

// The bowstring: from loop to loop through the claw (split round the claw's prongs while it holds).
function drawString(B, GF, pose) {
  const C = [0, Y0 + pose.sStr, ZA];
  const ends = [1, -1].map((sg) => {
    const loop = armTip(sg, pose.phi, 0.407);
    const toward = unit(sub(C, loop));
    return add(loop, mul(toward, 0.024));
  });
  const o = { sys: "arms", mat: "sinew" };
  const holding = pose.claw < 0.5 && Math.abs(pose.sStr - (pose.sClaw ?? pose.sStr)) < 0.02;
  if (holding) {
    ends.forEach((e, i) => {
      const sg = i === 0 ? 1 : -1;
      const toward = unit(sub(C, e));
      const stop = add(C, mul(toward, -0.0245 / Math.max(0.2, Math.abs(toward[0]))));
      cordTube(B, `string${sg}`, GF.p(...e), GF.p(...stop), STR_R * S, { ...o, pr: 0.004 * S });
    });
    cordTube(B, "string.mid", GF.p(-0.0105, C[1], ZA), GF.p(0.0105, C[1], ZA), STR_R * S, { ...o, pr: 0.003 * S });
  } else {
    ends.forEach((e, i) => cordTube(B, `string${i === 0 ? 1 : -1}`, GF.p(...e), GF.p(...C), STR_R * S, o));
  }
}

// ---------------------------------------------------------------- slider, claw and trigger
// A flat iron plate of any outline (metres) in F's (u, v) plane, with a tight proxy for the painter.
function plate(B, id, F, poly, t, o) {
  const P2 = poly.map(([a, b]) => [a * S, b * S]);
  const paths = extrudeAlong(F, P2, 0, t * S, B.P, { convex: false });
  const pts = [];
  for (const [a, b] of G.hullOf(P2)) for (const s of [0, t * S]) pts.push(framePoint(F, s, a, b));
  B.solid(id, paths, shapeOf(pts, { axes: [F.a, F.u, F.v], edges: [F.a, F.u, F.v] }), o);
}
const CLAW = [[0.055, 0.002], [0.03, 0.012], [0, 0.014], [-0.03, 0.011], [-0.048, 0.004], [-0.056, -0.01], [-0.054, -0.032], [-0.047, -0.037], [-0.044, -0.026], [-0.041, -0.017], [-0.035, -0.0145], [-0.028, -0.017], [-0.024, -0.024], [-0.018, -0.013], [0, -0.012], [0.055, -0.012]];
const LEVER = [[-0.005, 0.018], [0.004, 0.018], [0.006, 0.004], [0.118, 0.011], [0.13, 0.004], [0.13, -0.01], [0.12, -0.016], [0.006, -0.006], [-0.006, -0.006]];
const LEVER_AT = [0.051, -0.03]; // trigger pin, relative to the claw pin (back, up)

function drawSlider(B, GF, pose) {
  const yS = Y0 + pose.sClaw;
  const yp = yS + CLAW_BACK;
  const yf = yp - 0.44, yb = yp + 0.12;
  const o = { sys: "slider" };
  const tongue = [[-0.055, ZCT], [0.055, ZCT], [0.045, ZRT], [-0.045, ZRT]];
  const body = rect(-0.06, 0.06, ZRT, ZST);
  // The slider (dovetail tongue and body) cut where the case is cut, so each piece rides one
  // case piece; a bolt groove along the top up to the claw block.
  const yc = yp - 0.022;
  const sc = [yf, ...CASE_CUTS.filter((y) => y > yf + 0.02 && y < yc - 0.02), yc];
  // Under the claw block the body is slotted for the trigger lever to swing down into.
  prism(B, GF, "slider.tb", "y", yc, yb, tongue, { mat: "oak", tone: "mid", ...o });
  prism(B, GF, "slider.bl", "y", yc, yb, rect(-0.06, -0.0145, ZRT, ZST), { mat: "oak", tone: "hi", ...o });
  prism(B, GF, "slider.br", "y", yc, yb, rect(0.0145, 0.06, ZRT, ZST), { mat: "oak", tone: "hi", ...o });
  for (let i = sc.length - 1; i < 5; i++) {
    // Unused pieces stay in the scene, hidden, so the group keeps the same parts.
    prism(B, GF, `slider.t${i}`, "y", yb, yb + 0.001, tongue, { hidden: true });
    prism(B, GF, `slider.${i}`, "y", yb, yb + 0.001, body, { hidden: true });
  }
  for (let i = 0; i < sc.length - 1; i++) {
    const g1 = Math.min(sc[i + 1], yc);
    const groove = g1 > sc[i] ? B.L([-0.007, 0.007].map((x) => iso(B, [GF.p(x, sc[i], ZST), GF.p(x, g1, ZST)])).join(""), { tone: "lo" }) : "";
    prism(B, GF, `slider.t${i}`, "y", sc[i], sc[i + 1], tongue, { mat: "oak", tone: "mid", ...o });
    prism(B, GF, `slider.${i}`, "y", sc[i], sc[i + 1], body, { mat: "oak", tone: "hi", ...o, inner: groove, over: B.D([B.at(GF.p(0.06, (sc[i] + sc[i + 1]) / 2, ZST - 0.012))], { size: 0.45 }) });
  }
  // Claw block: two cheeks (the near one carries the pin heads) and a rear bridge with the rope eye.
  const pinF = (y, z) => G.frameAlong(GF.p(0.045, y, z), GF.d(1, 0, 0));
  const pins = B.L(G.circleOf(pinF(yp, ZCP), 0, 0.0065 * S, B.P, 16) + G.circleOf(pinF(yp + LEVER_AT[0], ZCP + LEVER_AT[1]), 0, 0.005 * S, B.P, 16), { tone: "lo" }) + B.D([B.at(GF.p(0.045, yp, ZCP)), B.at(GF.p(0.045, yp + LEVER_AT[0], ZCP + LEVER_AT[1]))], { size: 0.55, tone: "hi" });
  for (const sg of [1, -1]) {
    prism(B, GF, `slider.cheek${sg}`, "x", sg > 0 ? 0.0225 : -0.045, sg > 0 ? 0.045 : -0.0225, rrect(yc, yb, ZST, ZST + 0.055, 0.01), { mat: "oak", tone: "hi", ...o, cut: sg > 0 ? true : undefined, over: sg > 0 ? pins : "" });
  }
  prism(B, GF, "slider.bridge", "x", -0.0225, 0.0225, rect(yb - 0.02, yb, ZST + 0.03, ZST + 0.055), { mat: "oak", tone: "hi", ...o });
  B.ring("slider.eye", GF.p(-0.003, yb + 0.011, 0.3), GF.p(0.003, yb + 0.011, 0.3), 0.006 * S, 0.011 * S, { mat: "iron", tone: "hi", ...o });
  // Claw: two prongs and the tail bridge the trigger's catch holds down. Opens front-up.
  const c = -rad(26) * pose.claw;
  const CF = (x) => ({ o: GF.p(x, yp, ZCP), a: GF.d(1, 0, 0), u: GF.d(0, Math.cos(c), Math.sin(c)), v: GF.d(0, -Math.sin(c), Math.cos(c)) });
  const t = { sys: "trigger", tone: "hi", crease: "lo" };
  plate(B, "claw.r", CF(0.0135), CLAW, 0.0085, { mat: "iron", ...t });
  plate(B, "claw.l", CF(-0.022), CLAW, 0.0085, { mat: "iron", ...t });
  B.prism("claw.tail", CF(-0.0135), rect(0.02, 0.055, -0.012, 0.002).map(([a, b]) => [a * S, b * S]), 0, 0.027 * S, { mat: "iron", ...t });
  // Trigger lever on its pin, catch under the claw's tail; tripped, the catch slides back.
  const q = -rad(20) * pose.trig;
  const LF = { o: GF.p(-0.006, yp + LEVER_AT[0], ZCP + LEVER_AT[1]), a: GF.d(1, 0, 0), u: GF.d(0, Math.cos(q), Math.sin(q)), v: GF.d(0, -Math.sin(q), Math.cos(q)) };
  plate(B, "trigger.lever", LF, LEVER, 0.012, { mat: "iron", ...t });
}

// ---------------------------------------------------------------- windlass
function drawWindlass(B, GF, pose) {
  const wv = pose.w;
  const o = { sys: "windlass", tone: "hi" };
  const RF = (x) => ({ o: GF.p(x, WY, WZ), a: GF.d(1, 0, 0), u: GF.d(0, Math.cos(wv), Math.sin(wv)), v: GF.d(0, -Math.sin(wv), Math.cos(wv)) });
  // Drum with the wound rope.
  const turns = Math.max(0, pose.sClaw - S_REF) / (TAU * WR);
  const half = clamp(0.008 + turns * 0.0062, 0.012, 0.045);
  B.cyl("wind.drumL", GF.p(-0.07, WY, WZ), GF.p(-half, WY, WZ), WR * S, { mat: "oak", ...o, F: RF(-0.07), ribs: { count: 12, phase: 0, tone: "faint" } });
  B.cyl("wind.coil", GF.p(-half, WY, WZ), GF.p(half, WY, WZ), (WR + 0.0062) * S, { mat: "rope", ...o, F: RF(-half), ribs: { count: 26, twist: 0.5, phase: 0 } });
  B.cyl("wind.drumR", GF.p(half, WY, WZ), GF.p(0.07, WY, WZ), WR * S, { mat: "oak", ...o, F: RF(half), ribs: { count: 12, phase: 0, tone: "faint" } });
  // Ratchet wheels, pawls riding the teeth (lifted to pay out while engaging), naves and handspikes.
  const period = TAU / TEETH;
  const psi = rad(100);
  const frac = ((((psi - wv) / period) % 1) + 1) % 1;
  const rr = 0.062 + 0.01 * Math.min(1, frac / 0.75);
  for (const sg of [1, -1]) {
    const x0 = sg > 0 ? 0.125 : -0.142;
    B.toothed(`wind.ratchet${sg}`, RF(x0), polySaw(0.062 * S, 0.072 * S, TEETH, 0), 0, 0.017 * S, { mat: "iron", ...o, crease: "lo" });
    const pivot = [0.585, 0.35];
    let tip = [WY + rr * Math.cos(psi) + 0.002, WZ + rr * Math.sin(psi)];
    tip = [tip[0], tip[1] + pose.pawlUp * 0.03];
    const xm = sg * 0.1335;
    B.beam(`wind.pawl${sg}`, GF.p(xm, pivot[0], pivot[1]), GF.p(xm, tip[0], tip[1]), { w: 0.013 * S, h: 0.012 * S, up: GF.d(0, 0, 1), mat: "iron", ...o, crease: "lo" });
    B.cyl(`wind.pawlpin${sg}`, GF.p(sg * 0.125, pivot[0], pivot[1]), GF.p(sg * 0.148, pivot[0], pivot[1]), 0.006 * S, { mat: "iron", ...o, faceRing: [{ r: 0.003 * S }] });
    const n0 = sg > 0 ? 0.142 : -0.195, n1 = sg > 0 ? 0.195 : -0.142;
    B.prism(`wind.nave${sg}`, RF(n0), rect(-0.0375, 0.0375, -0.0375, 0.0375).map(([a, b]) => [a * S, b * S]), 0, (n1 - n0) * S, { mat: "oak", ...o, over: B.D([[0.026, 0.026], [-0.026, 0.026], [0.026, -0.026], [-0.026, -0.026]].map(([u, v]) => B.at(framePoint(RF(sg > 0 ? n1 : n0), 0, u * S, v * S))), { size: 0.5 }) });
    B.cyl(`wind.cap${sg}`, GF.p(sg * 0.195, WY, WZ), GF.p(sg * 0.203, WY, WZ), 0.02 * S, { mat: "iron", ...o, faceRing: [{ r: 0.009 * S }] });
    const xs = sg * 0.1685;
    for (let i = 0; i < 4; i++) {
      const a = wv + (i * Math.PI) / 2;
      const c = Math.cos(a), s = Math.sin(a);
      const r0 = 0.0375;
      B.cyl(`wind.spike${sg}.${i}`, GF.p(xs, WY + c * r0, WZ + s * r0), GF.p(xs, WY + c * 0.3, WZ + s * 0.3), 0.013 * S, { mat: "oak", ...o, faceRing: [{ r: 0.007 * S }] });
    }
  }
  // Draw rope from the drum to the slider's eye.
  const yb = Y0 + pose.sClaw + CLAW_BACK + 0.12;
  const hook = [0, yb + 0.03, 0.3];
  const top = [0, WY, WZ + WR + 0.006];
  B.ball("wind.hook", GF.p(...hook), 0.008 * S, { mat: "iron", ...o });
  cordTube(B, "wind.rope", GF.p(0, hook[1] + 0.008, hook[2]), GF.p(...top), 0.006 * S, { sys: "windlass", mat: "rope", pieces: 7 });
}

// ---------------------------------------------------------------- bolts and rack
function drawBolt(B, id, tail, d, ammo, o = {}) {
  const L = ammo.length * S;
  const r = ammo.shaft * S;
  const at = (s) => add(tail, mul(d, s));
  const vis = { lit: o.lit, sys: o.sys, layer: o.layer, hidden: o.hidden, tone: "hi" };
  const headLen = L * 0.13;
  const shaftEnd = L - headLen;
  const nock = 0.028 * S;
  B.cyl(`${id}.nock`, tail, at(nock), r * 1.14, { mat: "sinew", ...vis });
  // The shaft in short pieces so each orders locally against the slider, frame and claw.
  const shaft = (sid, a, b) => {
    const n = Math.max(1, Math.ceil((b - a) / (0.3 * S)));
    for (let i = 0; i < n; i++) B.cyl(`${sid}${i}`, at(a + ((b - a) * i) / n), at(a + ((b - a) * (i + 1)) / n), r, { mat: "oak", ...vis });
  };
  if (ammo.fire) {
    const s0 = shaftEnd - L * 0.2, s1 = s0 + L * 0.19;
    shaft(`${id}.shaft`, nock, s0);
    const TF = G.frameAlong(at(s0), d);
    lathePart(B, `${id}.tow`, TF, [[0, r * 1.1], [L * 0.03, r * 2.3, 1], [L * 0.1, r * 2.6, 1], [L * 0.17, r * 2.1, 1], [L * 0.19, r * 1.1]], { mat: "rope", ...vis, inner: B.L(k.fadedSvg(G.ribsOf(TF, L * 0.02, L * 0.17, r * 2.45, 10, B.P, { twist: 1.2, fade: [0.1, 0.55] }), { tone: "lo" })) });
    shaft(`${id}.fore`, s1, shaftEnd);
  } else shaft(`${id}.shaft`, nock, shaftEnd);
  const hl = headLen;
  const head = ammo.heavy ? [[0, r * 1.06], [hl * 0.12, r * 1.55, 1], [hl * 0.42, r * 1.6, 1], [hl * 0.52, r * 1.1], [hl * 0.58, r * 1.55], [hl, 0.01]] : [[0, r * 1.05], [hl * 0.3, r * 1.05], [hl * 0.4, r * 1.6], [hl, 0.01]];
  lathePart(B, `${id}.head`, G.frameAlong(at(shaftEnd), d), head, { mat: ammo.heavy ? "lead" : "iron", ...vis });
  // Three leather vanes set forward of the claw, one standing up.
  const F = G.frameAlong(tail, d);
  const roll = Math.atan2(dot([0, 0, 1], F.v), dot([0, 0, 1], F.u));
  const vH = r * 2.0;
  for (let i = 0; i < 3; i++) {
    const a = roll + (i / 3) * TAU;
    const radial = G.radialOf(F, a);
    const side = cross(d, radial);
    const VF = { o: at(0.075 * S), a: d, u: side, v: radial };
    const poly = [[-0.12, r * 0.6], [0.12, r * 0.6], [0.12, vH], [-0.12, vH * 0.72]];
    const vl = 0.12 * S;
    const pts = [];
    for (const [x, y] of poly) for (const s of [0, vl]) pts.push(framePoint(VF, s, x, y));
    B.solid(`${id}.vane${i}`, G.prismOf(VF, poly, 0, vl, B.P), shapeOf(pts, { axes: [d, side, radial], edges: [d, side, radial] }), { mat: "hide", tone: "hi", crease: "none", lit: o.lit, sys: o.sys, layer: o.layer, hidden: o.hidden });
  }
}

// A bolt box: the bolts stand head-up in bored holes, one column per kind.
function drawRack(B, M, loaded) {
  const plan = { x: RACK_BOX[0] * S, y: RACK_BOX[1] * S, w: RACK_BOX[2] * S, d: RACK_BOX[3] * S, r: 1.2 };
  const holes = [];
  for (let i = 0; i < 6; i++) holes.push(G.circleOf(G.frameAlong(w(...rackTail(i, M.def.ammo[0])), [0, 0, 1]), 0, 0.017 * S, B.P, 18));
  B.slab("rack.box", plan, 0, RACK_Z * S, { mat: "oak", tone: "mid", steps: 3, bevel: 0.5, groove: 0.8, seams: [0.025 * S, RACK_Z * S - 0.025 * S], inner: B.L(holes.join(""), { tone: "lo" }), over: B.D([[0.012, 0.012], [RACK_BOX[2] - 0.012, 0.012], [0.012, RACK_BOX[3] - 0.012], [RACK_BOX[2] - 0.012, RACK_BOX[3] - 0.012]].map(([x, y]) => B.at(w(RACK_BOX[0] + x, RACK_BOX[1] + y, RACK_Z))), { size: 0.5 }) });
  M.def.ammo.forEach((a, j) => {
    for (let n = 0; n < 2; n++) {
      const i = 2 * j + n;
      drawBolt(B, `rack.b${i}`, w(...rackTail(i, a)), [0, 0, 1], a, { lit: j === M.ammoIndex, hidden: loaded && i === 2 * M.ammoIndex });
    }
  });
}

// ---------------------------------------------------------------- strobe
function drawStrobe(B, GF, sim, now) {
  const lines = [];
  const pts = [];
  const t1 = Math.min(now, sim.impact + 0.006);
  for (let t = TRIG; t <= t1; t += 0.0016) {
    const f = sim.rec.at(t);
    const C = GF.p(0, Y0 + f.s, ZA);
    const tips = [1, -1].map((sg) => GF.p(...armTip(sg, f.phi)));
    for (const [i, sg] of [[0, 1], [1, -1]]) lines.push(k.pathOf([B.at(GF.p(sg * XK, YS, ZA)), B.at(tips[i])]));
    lines.push(k.pathOf([B.at(tips[0]), B.at(C), B.at(tips[1])]));
    pts.push(B.at(GF.p(0, Y0 + f.b - STR_R, ZA)));
  }
  const path = [];
  for (let t = TRIG; t <= Math.min(now, sim.clearT); t += 0.0004) path.push(B.at(GF.p(0, Y0 + sim.rec.at(t).b - STR_R, ZA + 0.012)));
  const svg = B.L(lines.join(""), { tone: "lo" }) + (path.length > 1 ? `<path class="iso-line" data-tone="lit" style="stroke:var(--accent);stroke-width:1.2px" d="${k.pathOf(path)}"/>` : "") + B.D(pts, { size: 1.4, tone: "mid" });
  B.marks("strobe", svg, [GF.p(0, YS, ZA + 0.3)], { r: 80, layer: 6 });
}

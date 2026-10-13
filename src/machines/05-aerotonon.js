// Aerotonon: Ctesibius' air-spring bolt-thrower (Philo of Byzantium, Belopoeica 77–78).
// Authored in metres in a frame fixed to the stock (x across, s forward along the stock,
// h up from the stock's underside); S converts to world units, `stockFrame(el)` places
// the stock on its universal joint at the trunnion.
//
// Truth (SI):
//  • Each arm turns on a vertical iron pin in the head. A crank keyed to the arm's hub
//    (r 0.30 m, 44° ahead of the arm) drives a 0.24 m link to a crosshead; the crosshead
//    pushes a bronze piston rod through a gland into a closed, forged bronze cylinder.
//    Drawing the arms 56° (16° → 72°) pushes each piston 0.28 m deeper into its cylinder:
//    gas column 0.319 m → 0.04 m dead length, compression ratio 8 : 1 at full draw.
//  • Adiabatic: p·V^1.4 = const from the charge pressure p0 (1.0–1.3 bar, a pre-load that
//    presses the arms on their stops). T = T0·(V0/V)^0.4. Full draw at p0 1.2 bar: 22 bar,
//    ≈ 390 °C (ideal, no wall loss); the default 90 % draw: 11 bar, ≈ 270 °C. Stored energy ∫(p − p_atm) dV over both cylinders.
//  • Arm torque = (p − p_atm)·A·dx/da, x the piston travel. Windlass pull on the slider =
//    2·torque / (ds_nock/da). A drawn engine leaks past the ground pistons: dp/dt =
//    −(p − p_atm)/150 s.
//  • Release: 2-DOF model (arm angle a, nock position s) with an elastic sinew string
//    (k 1 MN/m, 0.06 kg), arms 0.13 kg·m² each, piston + rod + crosshead 1.6 kg each,
//    seal friction 5 % of the gas load + 40 N, leather stops (40 kN·m/rad). The bolt leaves
//    the string at the string's rest line. Efficiency emerges at 0.38–0.54 (bolt 0.18–0.3 kg);
//    default 110 mm bore, 90 % draw: 1.13 kJ stored, bolt 72 m/s, 150 m at 9°, ≈ 300 m at 25°.
//    Over-driven (120 mm, 1.3 bar, full draw, 24 bar) reaches ≈ 100 m/s.
//
// Parts (≈ 150 incl. rack): plinth; stand — 4 legs, 4 feet, column, 2 column bands, 4 struts,
// collar, swivel plate, yoke base, 2 yoke cheeks, trunnion pin stubs + washers; stock with
// iron bands, 2 toothed racks, trunnion block, front cap; head — bottom and top cross-beams,
// 2 inner stanchions, 2 stop posts with leather pads, 2 pin heads + tails, 2 hub washers;
// per arm — hub crank boss, crank bar, crank pin, spacer, arm collar, upper boss, arm in two
// timbers with an iron band, tip cap, string pin; per cylinder — gland boss, seal ring,
// front flange (bolted), barrel in 3 sections with 2 hoops, rear flange (bolted), domed
// rear cap, charging plug, 2 vent holes, 2 saddles, link with 2 eyes, crosshead with pin,
// piston rod, (cutaway: half shell, piston with rings, inner rod, air column);
// cradles 2 + spacers 2 + outrigger braces 2; slider (body, 2 claw cheeks, floor block,
// 2 claw fingers, claw pin, tail lug, trigger lever + pin, 2 pawls + pins, rear eye);
// windlass — 2 cheeks, drum, rope coil, axle, ratchet wheel, pawl + pin, 2 capstan heads,
// 8 handspikes, haul rope; bowstring; bolt; ammo rack — 2 trestles (4 legs, 2 bars),
// 3 bolts of each kind in place.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { add, sub, mul, dot, cross, unit, len, lerp, clamp, rad, deg, ease, smoothstep, fmt, fmtInt, TAU } from "../engine/vec.js";
import * as PH from "../engine/physics.js";
import * as looks from "../engine/looks.js";
import { frameFrom, polyRect, polyCircle, polySaw, createBuilder } from "../engine/geo.js";
import { shapeOf } from "../engine/scene.js";

const U = 0.009;
const S = 1 / U;

// ---------- geometry of the mechanism (metres, stock frame) ----------
const XP = 0.36; // arm pin, across
const LA = 0.42; // arm length to the string pin
const DT = 0.04; // string pin sits this far behind the arm's centreline
const A0 = rad(16); // arm on its stop
const A1 = rad(72); // arm at full draw
const AM = (A0 + A1) / 2;
const RC = 0.3; // crank radius
const XC = 0.645; // cylinder axis, across
const HC = 0.07; // cylinder axis height
const LK = 0.24; // link length
const HA = 0.19; // arm mid-plane height
const S_GLAND = -0.45; // gland face
const S_FRONT = -0.52; // inner face of the front cap
const S_BACK = -0.96; // inner face of the rear cap
const E_DEAD = 0.04; // dead length at full draw
const HB = 0.188; // bolt axis height on the slider (the string plane)
const SL_LEN = 1.05; // slider length behind the claw throat
const DRUM = { s: -1.45, h: 0.19, r: 0.05 };
const S_T = -1.0; // trunnion along the stock
const H_T = -0.1; // trunnion below the stock's underside
const ZT = 1.08; // trunnion height above the plinth
const PA = 101325;
const GAM = 1.4;
const T0 = 288;
const TRIG = 0.34; // trigger pull before the string goes
const LEAK_TAU = 150;

// Physical constants of the release model.
const PHYS = { I: 0.13, mp: 1.6, mstr: 0.06, ks: 1e6, cs: 250, mu: 0.05, F0: 40, kStop: 4e4, cStop: 300 };

const pinOf = (a) => [XP + RC * Math.cos(a - AM), -RC * Math.sin(a - AM)];
const crossOf = (a) => {
  const [x, s] = pinOf(a);
  return s - Math.sqrt(LK * LK - (x - XC) ** 2);
};
const LR = crossOf(A1) - (S_BACK + E_DEAD); // crosshead pin → piston's gas face
const gasLen = (a) => crossOf(a) - LR - S_BACK;
const LG0 = gasLen(A0);
const armU = (a, sg = 1) => [sg * Math.cos(a), -Math.sin(a)];
const backN = (a, sg = 1) => [-sg * Math.sin(a), -Math.cos(a)];
const tipOf = (a) => {
  const u = armU(a), n = backN(a);
  return [XP + LA * u[0] + DT * n[0], LA * u[1] + DT * n[1]];
};
const LS0 = tipOf(A0)[0];
const S_N0 = tipOf(A0)[1]; // the string's rest line
const nockOf = (a) => {
  const [x, s] = tipOf(a);
  return s - Math.sqrt(Math.max(0, LS0 * LS0 - x * x));
};
const dfn = (f, a, h = 1e-6) => (f(a + h) - f(a - h)) / (2 * h);
const areaOf = (bore) => (Math.PI * bore * bore) / 4;
const pAt = (p0, a) => p0 * (LG0 / gasLen(a)) ** GAM;
const angleOf = (f, ctrl) => A0 + clamp(f, 0, 1) * (ctrl.draw / 100) * (A1 - A0);
// Work stored in both cylinders compressing from a0 to a (J).
function storedEnergy(p0, A, a) {
  let e = 0;
  const n = 160;
  for (let i = 0; i < n; i++) {
    const x = A0 + ((a - A0) * (i + 0.5)) / n;
    e += 2 * (pAt(p0, x) - PA) * A * -dfn(gasLen, x) * ((a - A0) / n);
  }
  return e;
}

// The release, from trigger to settled arms. Returns a recorded timeline.
function simulate(ctrl, ammo, pStart, aD) {
  const A = areaOf(ctrl.bore / 1000);
  const LgD = gasLen(aD);
  const pOf = (a) => pStart * (LgD / gasLen(a)) ** GAM;
  const { I, mp, mstr, ks, cs, mu, F0, kStop, cStop } = PHYS;
  const mb = ammo.mass;
  const Mof = (a) => 2 * I + 2 * mp * dfn(crossOf, a, 1e-5) ** 2;
  const strLen = (a, sb) => {
    const [x, s] = tipOf(a);
    return Math.hypot(x, s - sb);
  };
  let onString = true;
  const forces = (a, ad, sb, sbd) => {
    const p = pOf(a);
    const xc = -dfn(gasLen, a, 1e-5);
    let Q = -2 * (p - PA) * A * xc;
    Q -= 2 * (mu * Math.max(0, p - PA) * A + F0) * Math.abs(xc) * Math.tanh(ad * 40);
    const l = strLen(a, sb);
    const delta = 2 * (l - LS0);
    const dla = (strLen(a + 1e-6, sb) - strLen(a - 1e-6, sb)) / 2e-6;
    const dls = (strLen(a, sb + 1e-6) - strLen(a, sb - 1e-6)) / 2e-6;
    const rate = 2 * (dla * ad + dls * sbd);
    const T = delta > 0 ? Math.max(0, ks * delta + cs * rate) : 0;
    Q -= 2 * T * dla;
    if (a < A0) Q += -kStop * (a - A0) - cStop * ad;
    const M = Mof(a);
    const Mp = (Mof(a + 1e-4) - Mof(a - 1e-4)) / 2e-4;
    return { add: (Q - 0.5 * Mp * ad * ad) / M, sdd: (-2 * T * dls) / (onString ? mb + mstr : mstr), T, p };
  };
  // Static start: the drawn string stretches until it holds the gas torque.
  let a = aD, ad = 0, sb = nockOf(aD), sbd = 0;
  {
    let lo = sb - 0.12, hi = sb;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      if (forces(aD, 0, mid, 0).add < 0) hi = mid;
      else lo = mid;
    }
    sb = (lo + hi) / 2;
  }
  const rec = PH.timeline();
  const frame = (released, bs, p) => ({ a, sb, bs, rel: released ? 1 : 0, p });
  rec.push(0, frame(false, sb, pStart));
  rec.push(TRIG, frame(false, sb, pStart));
  let t = 0, i = 0, release = null, bs = sb, bv = 0;
  const step = (dt) => {
    const f = (y) => {
      const r = forces(y[0], y[1], y[2], y[3]);
      return [y[1], r.add, y[3], r.sdd];
    };
    const y = [a, ad, sb, sbd];
    const k1 = f(y);
    const k2 = f(y.map((v, j) => v + (dt / 2) * k1[j]));
    const k3 = f(y.map((v, j) => v + (dt / 2) * k2[j]));
    const k4 = f(y.map((v, j) => v + dt * k3[j]));
    [a, ad, sb, sbd] = y.map((v, j) => v + (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    t += dt;
  };
  let peak = pStart;
  while (t < 0.25) {
    step(2e-5);
    if (onString && sb >= S_N0 - 0.001) {
      onString = false;
      release = { t: TRIG + t, v: sbd, s: sb };
      bs = sb;
      bv = sbd;
    }
    if (!onString) bs += bv * 2e-5;
    if (i++ % 10 === 0) rec.push(TRIG + t, frame(!onString, onString ? sb : bs, pOf(a)));
    if (!onString && t > release.t - TRIG + 0.02) break;
  }
  if (!release) {
    release = { t: TRIG + t, v: Math.max(1, sbd), s: sb };
    onString = false;
    bs = sb;
    bv = release.v;
  }
  // Arms ring down on the leather stops; the empty string follows them.
  const end = t + 0.9;
  const arm = (y) => {
    const r = forces(y[0], y[1], nockOf(y[0]) + 0.05, 0);
    return [y[1], r.add];
  };
  while (t < end) {
    const h = 2e-4;
    const y = [a, ad];
    const k1 = arm(y);
    const k2 = arm(y.map((v, j) => v + (h / 2) * k1[j]));
    const k3 = arm(y.map((v, j) => v + (h / 2) * k2[j]));
    const k4 = arm(y.map((v, j) => v + h * k3[j]));
    [a, ad] = y.map((v, j) => v + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    t += h;
    sb = nockOf(a) + (sb - nockOf(a)) * Math.exp(-h / 0.025); // the empty string rings down onto its line
    bs += bv * h;
    if (i++ % 20 === 0) rec.push(TRIG + t, frame(true, bs, pOf(a)));
  }
  rec.push(TRIG + t + 0.01, { a: A0, sb: S_N0, bs, rel: 1, p: pOf(A0) });
  const ein = storedEnergy(pStart * (LG0 / LgD) ** -GAM, A, aD);
  return { rec, release, end: TRIG + t, ein, ke: 0.5 * mb * release.v * release.v, peak, aD, pStart, A };
}
export { simulate, nockOf, gasLen, crossOf, pAt, storedEnergy, LG0, S_N0 };

// ---------- placing the stock ----------
// The stock frame at elevation el: D along the stock (forward, −y at 0°), N its normal.
function stockFrame(el) {
  const c = Math.cos(el), sn = Math.sin(el);
  const D = [0, -c, sn];
  const N = [0, sn, c];
  const X = [1, 0, 0];
  const p = (x, s, h) => {
    const a = s - S_T, b = h - H_T;
    return [x * S, (a * D[1] + b * N[1]) * S, (ZT + a * D[2] + b * N[2]) * S];
  };
  const dir = (dx, ds, dh) => unit([dx, ds * D[1] + dh * N[1], ds * D[2] + dh * N[2]]);
  const metres = (x, s, h) => mul(p(x, s, h), U);
  return { el, D, N, X, p, dir, metres };
}
// A box in the stock frame: x, s, h ranges in metres; rounded corners r (metres).
function box(B, id, SF, [x0, x1], [s0, s1], [h0, h1], o = {}) {
  const F = { o: SF.p((x0 + x1) / 2, s0, (h0 + h1) / 2), a: SF.D, u: SF.X, v: SF.N };
  const w = (x1 - x0) * S, h = (h1 - h0) * S;
  const poly = o.r ? roundRect(w, h, o.r * S) : polyRect(w, h);
  B.prism(id, F, poly, 0, (s1 - s0) * S, o);
}
function roundRect(w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  const out = [];
  for (const [cx, cy, a0] of [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI], [w / 2 - r, -h / 2 + r, 1.5 * Math.PI]])
    for (let i = 0; i <= 2; i++) out.push([cx + r * Math.cos(a0 + (i / 2) * (Math.PI / 2)), cy + r * Math.sin(a0 + (i / 2) * (Math.PI / 2))]);
  return out;
}
// A round bar between two stock-frame points (metres).
const rod = (B, id, SF, a, b, r, o = {}) => B.cyl(id, SF.p(...a), SF.p(...b), r * S, o);
// A squared bar between two stock-frame points; up is a stock-frame direction.
const bar = (B, id, SF, a, b, w, h, up, o = {}) => B.beam(id, SF.p(...a), SF.p(...b), { w: w * S, h: h * S, up: SF.dir(...up), ...o });
const radOf = (ctrl) => ctrl.bore / 2000 + 0.022; // barrel outer radius
const wW = (x, y, z) => [x * S, y * S, z * S];

// The ready rack on the floor: three bolts of each kind lie on two trestles.
const RACK = { x: [0.9, 1.0, 1.1], y0: -0.55, z: 0.29 };

export default {
  id: "aerotonon",
  name: "Aerotonon",
  short: "Aerotonon",
  unit: U,
  view: { W: 1000, H: 640, azimuth: 50, elevation: 30, pad: 24, fit: [wW(-0.85, -1.75, -0.04), wW(1.25, -1.75, -0.04), wW(-0.85, 1.0, -0.04), wW(1.25, 1.0, -0.04), wW(0, -0.9, 2.0), wW(0, -0.5, 1.95), wW(-0.8, -0.95, 1.75)] },
  target: { kind: "palisade", distance: 150, maxRange: 340 },
  ammo: [
    { id: "bolt", name: "Bolt", look: "bolt", mass: 0.18, radius: 0.012, cd: 0.6, length: 0.75, shaft: 0.011 },
    { id: "fire", name: "Fire bolt", look: "firebolt", mass: 0.22, radius: 0.02, cd: 0.75, length: 0.75, shaft: 0.011, fire: true },
    { id: "lead", name: "Lead-weighted", look: "bolt", mass: 0.3, radius: 0.013, cd: 0.55, length: 0.75, shaft: 0.012, heavy: true },
  ],
  controls: [
    { id: "draw", name: "Draw stroke", min: 40, max: 100, step: 1, value: 90, unit: "%" },
    { id: "bore", name: "Piston bore", min: 80, max: 120, step: 1, value: 110, unit: "mm" },
    { id: "charge", name: "Air charge", min: 1.0, max: 1.3, step: 0.05, value: 1.2, unit: "bar", digits: 2 },
    { id: "elev", name: "Elevation", min: 0, max: 25, step: 0.5, value: 9.5, unit: "°", digits: 1 },
    { id: "distance", name: "Palisade", min: 80, max: 320, step: 10, value: 150, unit: "m" },
  ],
  actions: [
    { id: "wind", name: "Draw", key: "w" },
    { id: "loose", name: "Loose", key: " ", primary: true },
  ],
  toggles: [
    { id: "cut", name: "Cutaway" },
    { id: "strobe", name: "Strobe" },
  ],
  focus: [
    { id: "cyl", name: "Cylinders" },
    { id: "piston", name: "Pistons" },
    { id: "arm", name: "Arms" },
    { id: "slider", name: "Slider" },
    { id: "winch", name: "Windlass" },
    { id: "trigger", name: "Trigger" },
  ],
  phases: ["rest", "engage", "drawing", "loading", "armed", "loose", "flight", "impact"],
  hint: "Space · loose   W · draw",

  build(B, M) {
    const mini = !!B.mini;
    const SF = stockFrame(rad(M.ctrl.elev));
    if (!mini) {
      B.plinth({ x: -0.85 * S, y: -1.75 * S, w: 2.1 * S, d: 2.75 * S, r: 10 }, { h: 12, foot: 6, ruler: "y", label: { x: -0.78 * S, y: 0.68 * S, w: 40, d: 18, r: 1.5 } });
      B.halo("stand.halo", [wW(-0.7, -0.7, 0), wW(0.7, -0.7, 0), wW(0.7, 0.7, 0), wW(-0.7, 0.7, 0)], 0, { blur: 5 });
      buildRack(B);
    }
    buildStand(B, mini);
    buildStock(B, M, SF, mini);
  },

  init(M) {
    return { mode: "rest", engaged: true, sl: S_N0, slFrom: S_N0, e: 0, f: 0, load: 0, leak: 0, auto: false, sim: null, flight: null, fxT: 0, needBuild: false, builtAt: 0 };
  },

  act(M, id) {
    const st = M.state;
    if (st.mode === "armed" && id === "loose") return this.fire(M);
    if (st.mode === "rest") {
      if (st.engaged) st.mode = "drawing";
      else {
        st.mode = "engage";
        st.e = 0;
        st.slFrom = st.sl;
      }
      st.f = 0;
      st.leak = 0;
      M.setPhase(st.mode);
    }
    if (id === "loose" && st.mode !== "shot") st.auto = true;
  },

  rebuild(M) {
    const B = M.B;
    const was = B.dynamic;
    B.dynamic = false;
    M.scene.clear();
    B.forget();
    this.build(B, M);
    M.scene.seal();
    B.dynamic = was;
    M.fx.setOccluders(this.occluders(M));
    M.state.needBuild = false;
    M.state.builtAt = M.time;
    M.dirty = true;
  },

  onControl(M, id) {
    if (id === "distance") {
      M.def.target.distance = M.ctrl.distance;
      M.range.mount(M.def, M);
    }
    if (id === "elev" || id === "bore") {
      M.state.needBuild = true;
      if (id === "elev") M.state.remount = true;
    }
  },
  onToggle(M, id) {
    if (id === "cut") M.state.needBuild = true;
  },

  fire(M) {
    const st = M.state;
    const ctrl = M.ctrl;
    const aD = angleOf(1, ctrl);
    const pS = this.pose(M).p;
    const sim = simulate(ctrl, M.ammo, pS, aD);
    sim.slider = nockOf(aD);
    sim.hitT = sim.release.t;
    for (let i = 0; i < sim.rec.ts.length; i++) if (sim.rec.ts[i] > TRIG && sim.rec.frames[i].a <= A0 + 1e-4) {
      sim.hitT = sim.rec.ts[i];
      break;
    }
    st.sim = sim;
    st.mode = "shot";
    st.auto = false;
    st.fxT = 0;
    const SF = stockFrame(rad(ctrl.elev));
    const rel = sim.release;
    const L = M.ammo.length;
    const flight = M.launch({ p: SF.p(0, rel.s + 0.8 * L, HB), v: mul(SF.D, rel.v), t0: rel.t, spin: 0 });
    st.flight = flight;
    const T = Math.max(sim.end, rel.t + flight.impact.t + 2.4);
    M.startShot(T, [[0.04, "trip"], [rel.t, "loose"], [sim.hitT, "stop"], [rel.t + flight.impact.t, "impact"]]);
    M.setPhase("loose");
  },

  endShot(M) {
    const st = M.state;
    st.mode = "rest";
    st.engaged = false;
    st.sl = st.sim ? st.sim.slider : st.sl;
    st.f = 0;
    st.leak = 0;
    M.setPhase("rest");
  },

  tour(M) {
    if (M.state.mode === "rest") this.act(M, "loose");
  },

  update(M, dt) {
    const st = M.state;
    let moving = false;
    if (st.needBuild && M.time - st.builtAt > 0.12) {
      this.rebuild(M);
      if (st.remount) {
        st.remount = false;
        M.range.mount(M.def, M);
      }
      moving = true;
    }
    if (st.mode === "engage" || st.mode === "drawing") {
      // A click for every ratchet tooth the drum passes.
      const tooth = Math.floor((((S_N0 - this.pose(M).sl) / DRUM.r) * 14) / TAU);
      if (st.tooth !== undefined && tooth !== st.tooth && M.sfx) M.sfx(st.mode === "drawing" ? "click" : "tick", { pitch: 0.9 + 0.3 * (st.f || 0) });
      st.tooth = tooth;
    }
    if (st.mode === "engage") {
      st.e = Math.min(1, st.e + dt / 1.3);
      if (st.e >= 1) {
        st.mode = "drawing";
        st.engaged = true;
        st.sl = S_N0;
        st.f = 0;
        M.setPhase("drawing");
      }
      return true;
    }
    if (st.mode === "drawing") {
      st.f = Math.min(1, st.f + dt / (1.6 + 3.2 * (M.ctrl.draw / 100)));
      if (st.f >= 1) {
        st.mode = "loading";
        st.load = 0;
        M.setPhase("loading");
      }
      return true;
    }
    if (st.mode === "loading" || st.mode === "armed") {
      const p = this.pose(M).p;
      st.leak += ((p - PA) / LEAK_TAU) * dt;
    }
    if (st.mode === "loading") {
      st.load = Math.min(1, st.load + dt / 1.1);
      if (st.load >= 1) {
        st.mode = "armed";
        M.setPhase("armed");
        if (st.auto) this.fire(M);
      }
      return true;
    }
    if (st.mode === "shot" && M.shot) {
      const t = M.shot.t;
      const rel = st.sim.release.t;
      const hit = rel + st.flight.impact.t;
      M.setPhase(t < rel ? "loose" : t < hit ? "flight" : "impact");
      this.effects(M, t);
      return true;
    }
    if (st.mode === "armed") return true;
    return moving;
  },

  // One-off effects as the record passes them (forward playback only).
  effects(M, t) {
    const st = M.state;
    if (t < st.fxT) {
      st.fxT = t;
      return;
    }
    const from = st.fxT;
    st.fxT = t;
    const live = M.shot && M.shot.playing && M.sfx;
    if (live && from < 0.04 && t >= 0.04) M.sfx("clank", { pitch: 1.3 });
    if (live && from < st.sim.release.t && t >= st.sim.release.t) {
      M.sfx("twang", { pitch: 0.8 });
      M.sfx("hiss", { size: 0.5, gain: 0.7 });
    }
    if (live && from < st.sim.hitT && t >= st.sim.hitT) M.sfx("thud", { gain: 0.6 });
    if (M.calm) return;
    const SF = stockFrame(rad(M.ctrl.elev));
    const ro = radOf(M.ctrl);
    if (from < st.sim.release.t && t >= st.sim.release.t) {
      // Air ahead of each piston is driven out of the vents beside the gland.
      for (const sg of [1, -1]) for (const ds of [-0.555, -0.585]) {
        const p = SF.p(sg * XC, ds, HC + ro + 0.004);
        M.fx.emit("steam", p, { n: 7, v: mul(SF.dir(sg * 0.25, 0.35, 1), 0.8 * S), spread: 0.2 * S, size: 0.05 * S, grow: 0.22 * S, life: 1.1, buoy: 0.25 * S, drag: 2.6, alpha: 0.75 });
      }
    }
    if (from < st.sim.hitT && t >= st.sim.hitT) {
      for (const sg of [1, -1]) {
        const p = SF.p(sg * 0.47, 0.012, HA);
        M.fx.emit("dust", p, { n: 5, v: mul(SF.dir(sg * 0.6, -0.4, 0.5), 0.5 * S), spread: 0.12 * S, size: 0.03 * S, grow: 0.12 * S, life: 0.8, alpha: 0.55, drag: 3, buoy: 0.05 * S });
      }
    }
  },

  // The pose the machine is drawn in this frame.
  pose(M) {
    const st = M.state;
    const ctrl = M.ctrl;
    const p0 = ctrl.charge * 1e5;
    if (st.mode === "shot" && M.shot && st.sim) {
      const t = M.shot.t;
      const f = st.sim.rec.at(t);
      return { a: f.a, sl: st.sim.slider, phi: smoothstep(0.14, TRIG, t), psi: smoothstep(0.02, 0.16, t), nock: f.sb, bolt: f.rel ? null : { s: f.bs }, p: f.p, shot: true };
    }
    if (st.mode === "engage") {
      const u = ease(st.e);
      return { a: A0, sl: st.slFrom + (S_N0 - st.slFrom) * u, phi: 1 - smoothstep(0.82, 1, st.e), psi: 1 - smoothstep(0.88, 1, st.e), nock: S_N0, bolt: null, p: p0 };
    }
    if (st.mode === "rest") {
      const sl = st.engaged ? S_N0 : st.sl;
      return { a: A0, sl, phi: st.engaged ? 0 : 1, psi: st.engaged ? 0 : 1, nock: S_N0, bolt: null, p: p0 };
    }
    const f = st.mode === "drawing" ? st.f : 1;
    const a = angleOf(f, ctrl);
    const sl = nockOf(a);
    const bolt = st.mode === "loading" ? { load: ease(st.load), s: sl } : st.mode === "armed" ? { s: sl } : null;
    return { a, sl, phi: 0, psi: 0, nock: sl, bolt, p: pAt(p0, a) - st.leak };
  },

  draw(B, M) {
    const pose = this.pose(M);
    const st = M.state;
    const ctrl = M.ctrl;
    const SF = stockFrame(rad(ctrl.elev));
    const mini = !!B.mini;
    B.__scene = mini ? null : M.scene;
    B.keep("arms", [pose.a.toFixed(5), ctrl.elev, ctrl.bore], () => {
      for (const sg of [1, -1]) drawArm(B, SF, sg, pose.a, mini);
    });
    if (!mini) for (const sg of [1, -1]) drawDrive(B, SF, sg, pose.a, !!M.toggles.cut && sg > 0, ctrl);
    drawString(B, SF, pose);
    if (mini) return;
    if (M.toggles.cut) B.keep("inside", [pose.a.toFixed(5), ctrl.elev, ctrl.bore, Math.round(pose.p / 2000)], () => drawInside(B, SF, pose, ctrl));
    drawSlider(B, SF, pose, ctrl);
    const turned = (S_N0 - pose.sl) / DRUM.r;
    st.drum = turned;
    B.keep("winch", [turned.toFixed(4), ctrl.elev], () => drawWindlass(B, SF, turned, pose));
    if (pose.bolt) drawBolt(B, M, SF, pose);
    const onMachine = !!pose.bolt || st.mode === "shot";
    B.keep("pile", [M.ammo.id, onMachine], () => drawPile(B, M, onMachine));
    if (M.toggles.strobe && st.sim && M.shot) drawStrobe(B, SF, st.sim, M.shot.t);
    if (M.ammo.fire && pose.bolt && !M.calm && Math.random() < 0.6) {
      const L = M.ammo.length;
      const u = pose.bolt.load;
      if (u === undefined || u >= 1) M.fx.emit("fire", SF.p(0, pose.bolt.s + L * 0.78, HB + 0.03), { v: mul(SF.N, 0.3 * S), spread: 0.03 * S, size: 0.05 * S, grow: 0.02 * S, life: 0.35, heat: 1, buoy: 0.6 * S, drag: 2 });
    }
  },

  occluders(M) {
    const SF = stockFrame(rad(M.ctrl.elev));
    const ro = radOf(M.ctrl);
    const bb = (pts) => ({ min: [0, 1, 2].map((c) => Math.min(...pts.map((p) => p[c]))), max: [0, 1, 2].map((c) => Math.max(...pts.map((p) => p[c]))) });
    return [bb([SF.p(XC - ro, -0.52, HC - ro), SF.p(XC + ro, -0.99, HC + ro)]), bb([SF.p(-0.5, -0.07, -0.09), SF.p(0.5, 0.07, 0.45)])];
  },

  readouts(M) {
    const st = M.state;
    const ctrl = M.ctrl;
    const pose = this.pose(M);
    const A = areaOf(ctrl.bore / 1000);
    const a = pose.a;
    const p0 = ctrl.charge * 1e5;
    const lever = -dfn(gasLen, a);
    const torque = Math.max(0, pose.p - PA) * A * lever;
    const loaded = st.mode === "drawing" || st.mode === "loading" || st.mode === "armed";
    const pull = loaded ? (2 * torque) / Math.max(0.05, -dfn(nockOf, a)) : 0;
    const tempC = T0 * Math.max(0.2, pose.p / p0) ** ((GAM - 1) / GAM) - 273;
    const pEq = pose.p * (gasLen(a) / LG0) ** GAM;
    const rows = [
      ["Arm swing", fmt(deg(a - A0), 1), "°"],
      ["Piston travel", fmtInt((crossOf(A0) - crossOf(a)) * 1000), "mm"],
      ["Compression", fmt(LG0 / gasLen(a), 2), ": 1"],
      ["Air pressure", fmt(pose.p / 1e5, 2), "bar"],
      ["Air temp", fmtInt(tempC), "°C"],
      ["Arm torque", fmt(torque / 1000, 2), "kN·m"],
      ["Windlass pull", fmt(pull / 1000, 2), "kN"],
      ["Stored", fmtInt(storedEnergy(pEq, A, a)), "J"],
    ];
    if (st.mode === "armed") rows.push(["Leak", fmt(-(pose.p - PA) / LEAK_TAU / 1e5, 3), "bar/s"]);
    if (st.sim && st.flight) rows.push(["Efficiency", fmtInt((st.sim.ke / st.sim.ein) * 100), "%"], ["Bolt leaves", fmt((st.sim.release.t - TRIG) * 1000, 1), "ms"]);
    return rows;
  },
};

// ---------- static parts ----------
function buildRack(B) {
  for (const [i, y] of [[0, -1.15], [1, -0.75]]) {
    B.beam(`rack.bar${i}`, wW(0.8, y, 0.265), wW(1.2, y, 0.265), { w: 0.05 * S, h: 0.05 * S, up: [0, 0, 1], mat: "oak", tone: "mid", nails: [0.9, 1.0, 1.1].map((x) => ({ s: (x - 0.8) * S, face: "v", x: 0 })) });
    for (const x of [0.84, 1.16]) B.beam(`rack.leg${i}${x}`, wW(x, y, 0.035), wW(x, y, 0.24), { w: 0.04 * S, h: 0.04 * S, up: [0, 1, 0], mat: "oak", tone: "mid" });
    B.beam(`rack.foot${i}`, wW(0.8, y, 0), wW(1.2, y, 0), { w: 0.06 * S, h: 0.035 * S, up: [0, 0, 1], s0: 0, mat: "oak", tone: "lo" });
  }
}
// The beam's own up is z, so a foot from z 0 is centred: lift it.
function buildStand(B, mini) {
  const c = 0.075;
  const o = { mat: "oak", tone: "mid" };
  B.slab("stand.pad", { x: -0.13 * S, y: -0.13 * S, w: 0.26 * S, d: 0.26 * S, r: 1 }, 0, 0.04 * S, { ...o, steps: 2, bevel: 0.4 });
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  dirs.forEach(([dx, dy], i) => {
    B.slab(`stand.foot${i}`, { x: (0.62 * dx - 0.07) * S, y: (0.62 * dy - 0.07) * S, w: 0.14 * S, d: 0.14 * S, r: 1 }, 0, 0.04 * S, { ...o, tone: "lo", steps: 2, bevel: 0.3 });
    B.beam(`stand.leg${i}`, wW(c * dx, c * dy, 0.09), wW(0.66 * dx, 0.66 * dy, 0.09), { w: 0.11 * S, h: 0.1 * S, up: [0, 0, 1], ...o, grain: 1, nails: [{ s: 0.52 * S, face: "v", x: [-0.4, 0.4] }] });
    if (!mini) B.beam(`stand.strut${i}`, wW(0.42 * dx, 0.42 * dy, 0.14), wW(c * dx, c * dy, 0.56), { w: 0.065 * S, h: 0.065 * S, up: [0, 0, 1], ...o });
  });
  B.beam("stand.col", wW(0, 0, 0.04), wW(0, 0, ZT - 0.3), { w: 0.15 * S, h: 0.15 * S, up: [0, 1, 0], ...o, grain: 2, bands: [{ at: 0.38 * S }, { at: (ZT - 0.42) * S }] });
  B.cyl("stand.cap", wW(0, 0, ZT - 0.3), wW(0, 0, ZT - 0.27), 0.108 * S, { mat: "iron", tone: "hi", bolts: mini ? undefined : [{ s: 0.03 * S, r: 0.088 * S, count: 6 }] });
  B.cyl("stand.swivel", wW(0, 0, ZT - 0.27), wW(0, 0, ZT - 0.24), 0.118 * S, { mat: "bronze", tone: "hi", faceRing: mini ? undefined : [{ s: 0.03 * S, r: 0.07 * S }] });
  B.slab("stand.yoke", { x: -0.125 * S, y: -0.085 * S, w: 0.25 * S, d: 0.17 * S, r: 1 }, (ZT - 0.24) * S, 0.06 * S, { mat: "bronze", tone: "hi", steps: 2, bevel: 0.4 });
  for (const sg of [1, -1]) {
    B.slab(`stand.cheek${sg}`, { x: (sg > 0 ? 0.078 : -0.112) * S, y: -0.07 * S, w: 0.034 * S, d: 0.14 * S, r: 0.6 }, (ZT - 0.18) * S, 0.21 * S, { mat: "bronze", tone: "hi", steps: 2 });
    if (mini) continue;
    B.ring(`stand.washer${sg}`, wW(sg * 0.112, 0, ZT), wW(sg * 0.12, 0, ZT), 0.024 * S, 0.042 * S, { mat: "iron", tone: "hi" });
    B.cyl(`stand.pin${sg}`, wW(sg * 0.12, 0, ZT), wW(sg * 0.145, 0, ZT), 0.024 * S, { mat: "iron", tone: "hi", faceRing: [{ s: 0.025 * S, r: 0.012 * S }] });
  }
}

// One 30° stave of the far half of a ring (angles 90°…270°): outer arc, inner chord.
const stave = (rIn, rOut, i) => {
  const t0 = Math.PI / 2 + (i * Math.PI) / 6, t1 = t0 + Math.PI / 6;
  const pts = [0, 1, 2, 3].map((j) => {
    const t = t0 + ((t1 - t0) * j) / 3;
    return [rOut * Math.cos(t) * S, rOut * Math.sin(t) * S];
  });
  return [...pts, [rIn * Math.cos(t1) * S, rIn * Math.sin(t1) * S], [rIn * Math.cos(t0) * S, rIn * Math.sin(t0) * S]];
};

function buildStock(B, M, SF, mini) {
  const ctrl = M.ctrl;
  const ro = radOf(ctrl);
  const cutOn = !!M.toggles.cut;
  const oak = { mat: "oak", tone: "mid" };
  box(B, "stock.trunnion", SF, [-0.075, 0.075], [S_T - 0.08, S_T + 0.08], [H_T - 0.05, 0], { ...oak, r: 0.01 });
  // The stock in three lengths that meet face to face: behind, inside and ahead of the head.
  for (const [i, s0, s1] of [[0, -1.62, -0.07], [1, -0.07, 0.07], [2, 0.07, 0.55]])
    bar(B, `stock${i}`, SF, [0, s0, 0.05], [0, s1, 0.05], 0.18, 0.1, [0, 0, 1], { ...oak, grain: 2, nails: [-1.5, -1.12, -0.75, -0.3, 0.3].filter((s) => s > s0 && s < s1).map((s) => ({ s: (s - s0) * S, face: "u", x: [-0.45, 0.45] })) });
  box(B, "stock.cap", SF, [-0.096, 0.096], [0.55, 0.564], [-0.006, 0.106], { mat: "iron", tone: "hi" });
  // Toothed racks on the stock's top edges: the slider's pawls ride them.
  if (!mini) for (const sg of [1, -1]) {
    const pitch = 0.025, s0 = -1.27, s1 = -0.295;
    const top = [];
    for (let s = s0; s < s1 - 1e-6; s += pitch) top.push([s * S, 0.106 * S], [(s + pitch * 0.82) * S, 0.118 * S], [(s + pitch) * S, 0.118 * S]);
    const poly = [[s0 * S, 0.1 * S], [s1 * S, 0.1 * S], ...top.reverse()];
    const F = { o: SF.p(sg > 0 ? 0.058 : -0.09, 0, 0), a: SF.X, u: SF.D, v: SF.N };
    B.prism(`stock.rack${sg}`, F, poly, 0, 0.032 * S, { mat: "iron", sys: "slider", tone: "hi", convex: false });
  }
  // The head: cross-beams, stanchions, stops and the arms' pins.
  const dots = (pts) => B.D(pts.map((p) => B.at(SF.p(...p))), { size: 0.5, tone: "hi" });
  box(B, "head.bottom", SF, [-0.5, 0.5], [-0.07, 0.07], [-0.09, 0], { ...oak, r: 0.008 });
  box(B, "head.top", SF, [-0.5, 0.5], [-0.07, 0.07], [0.36, 0.45], { ...oak, r: 0.008, over: mini ? "" : dots([[0.12, -0.035, 0.45], [0.12, 0.035, 0.45], [-0.12, -0.035, 0.45], [-0.12, 0.035, 0.45], [0.47, 0.05, 0.45], [-0.47, 0.05, 0.45]]) });
  for (const sg of [1, -1]) {
    box(B, `head.stanchion${sg}`, SF, sg > 0 ? [0.09, 0.15] : [-0.15, -0.09], [-0.06, 0.06], [0, 0.36], { ...oak, r: 0.006, cut: sg > 0 ? true : undefined });
    box(B, `head.stop${sg}`, SF, sg > 0 ? [0.44, 0.5] : [-0.5, -0.44], [0.03, 0.07], [0.13, 0.36], { ...oak, r: 0.006, sys: "arm" });
    box(B, `head.pad${sg}`, SF, sg > 0 ? [0.44, 0.5] : [-0.5, -0.44], [0.014, 0.03], [0.15, 0.23], { mat: "hide", tone: "hi", r: 0.004, sys: "arm" });
    rod(B, `head.pinTop${sg}`, SF, [sg * XP, 0, 0.45], [sg * XP, 0, 0.47], 0.03, { mat: "iron", tone: "hi", sys: "arm", faceRing: mini ? undefined : [{ s: 0.02 * S, r: 0.014 * S }] });
    rod(B, `head.pinTail${sg}`, SF, [sg * XP, 0, -0.115], [sg * XP, 0, -0.09], 0.024, { mat: "iron", tone: "hi", sys: "arm" });
    rod(B, `head.washer${sg}`, SF, [sg * XP, 0, 0], [sg * XP, 0, 0.025], 0.062, { mat: "bronze", tone: "hi", sys: "arm" });
    // The hub turns on the pin but is round, so it is drawn once: crank boss, spacer, upper boss.
    rod(B, `hub${sg}.boss`, SF, [sg * XP, 0, 0.025], [sg * XP, 0, 0.06], 0.05, { mat: "bronze", tone: "hi", sys: "arm" });
    rod(B, `hub${sg}.spacer`, SF, [sg * XP, 0, 0.06], [sg * XP, 0, 0.145], 0.044, { mat: "bronze", tone: "hi", sys: "arm", seams: mini ? undefined : [0.0425 * S] });
    rod(B, `hub${sg}.upper`, SF, [sg * XP, 0, 0.235], [sg * XP, 0, 0.36], 0.05, { mat: "bronze", tone: "hi", sys: "arm", seams: mini ? undefined : [0.06 * S] });
    buildCylinder(B, SF, sg, ro, ctrl, cutOn && sg > 0, mini);
  }
  // Cradles under the cylinders, hung from the stock on spacers, braced to the head.
  for (const [i, c] of [[0, -0.62], [1, -0.86]]) {
    box(B, `cradle${i}`, SF, [-0.76, 0.76], [c - 0.04, c + 0.04], [-0.12, -0.03], { ...oak, r: 0.006 });
    box(B, `cradle.spacer${i}`, SF, [-0.09, 0.09], [c - 0.04, c + 0.04], [-0.03, 0], { ...oak });
    for (const sg of [1, -1]) box(B, `cradle.saddle${i}${sg}`, SF, [sg * XC - 0.05, sg * XC + 0.05], [c - 0.02, c + 0.02], [-0.03, HC - ro - 0.008], { ...oak, tone: "hi", sys: "cyl" });
  }
  for (const sg of [1, -1]) bar(B, `brace${sg}`, SF, [sg * 0.47, -0.07, -0.05], [sg * 0.7, -0.58, -0.075], 0.05, 0.05, [0, 0, 1], { ...oak });
  // Windlass cheeks and bearing bosses.
  for (const sg of [1, -1]) {
    box(B, `winch.cheek${sg}`, SF, sg > 0 ? [0.09, 0.15] : [-0.15, -0.09], [DRUM.s - 0.12, DRUM.s + 0.1], [0, 0.27], { ...oak, r: 0.01, sys: "winch", over: mini || sg < 0 ? "" : dots([[0.15, DRUM.s + 0.06, 0.04], [0.15, DRUM.s - 0.08, 0.04], [0.15, DRUM.s + 0.06, 0.08], [0.15, DRUM.s - 0.08, 0.08]]) });
    rod(B, `winch.boss${sg}`, SF, [sg * 0.15, DRUM.s, DRUM.h], [sg * 0.155, DRUM.s, DRUM.h], 0.036, { mat: "iron", tone: "hi", sys: "winch" });
    // Capstan heads: round, so they need no redrawing as they turn; the spikes do.
    const x0 = sg > 0 ? 0.175 : -0.215, x1 = sg > 0 ? 0.235 : -0.155;
    rod(B, `winch.head${sg > 0 ? 1 : 0}`, SF, [x0, DRUM.s, DRUM.h], [x1, DRUM.s, DRUM.h], 0.045, { mat: "oak", tone: "hi", sys: "winch", faceRing: [{ s: sg > 0 ? (x1 - x0) * S : 0, r: 0.02 * S }] });
  }
}

function buildCylinder(B, SF, sg, ro, ctrl, cutaway, mini) {
  const x = sg * XC;
  const at = (s) => [x, s, HC];
  const o = { mat: "bronze", sys: "cyl", tone: "hi" };
  const id = `cyl${sg > 0 ? 1 : 0}`;
  rod(B, `${id}.gland`, SF, at(-0.49), at(-0.45), 0.042, o);
  B.ring(`${id}.seal`, SF.p(...at(-0.45)), SF.p(...at(-0.444)), 0.0165 * S, 0.03 * S, { mat: "iron", sys: "cyl", tone: "hi" });
  rod(B, `${id}.flangeF`, SF, at(-0.49), at(-0.52), ro + 0.028, { ...o, bolts: mini ? undefined : [{ s: 0.03 * S, r: (ro + 0.016) * S, count: 10, size: 0.55 }] });
  const vents = mini
    ? ""
    : [-0.555, -0.585]
        .map((s) => {
          const F = G.frameAlong(SF.p(x, s, HC + ro), SF.N);
          return B.L(G.circleOf(F, 0, 0.008 * S, B.P, 14), { tone: "lo" }) + B.D([B.at(SF.p(x, s, HC + ro))], { size: 0.7, tone: "lo" });
        })
        .join("");
  const cut = cutaway ? true : undefined;
  const runs = [[-0.52, -0.6, ro, "bronze", vents], [-0.6, -0.64, ro + 0.008, "iron"], [-0.64, -0.84, ro, "bronze"], [-0.84, -0.88, ro + 0.008, "iron"], [-0.88, -0.96, ro, "bronze"]];
  runs.forEach(([a, b, r, mat, over], i) => rod(B, `${id}.barrel${i}`, SF, at(a), at(b), r, { ...o, mat, cut: sg > 0 ? true : undefined, over: over || "", seams: mat === "bronze" && !mini && b - a < -0.15 ? [0.1 * S] : undefined }));
  rod(B, `${id}.flangeR`, SF, at(-0.96), at(-0.99), ro + 0.028, { ...o, bolts: mini ? undefined : [{ s: 0.03 * S, r: (ro + 0.016) * S, count: 10, size: 0.55 }] });
  const F = G.frameAlong(SF.p(...at(-0.99)), mul(SF.D, -1));
  B.turned(`${id}.dome`, F, [[0, (ro + 0.004) * S], [0.012 * S, (ro - 0.002) * S, 1], [0.03 * S, ro * 0.8 * S, 1], [0.046 * S, ro * 0.48 * S, 1], [0.054 * S, 0.024 * S]], o);
  if (!mini) {
    rod(B, `${id}.plug`, SF, at(-1.044), at(-1.062), 0.016, { mat: "iron", sys: "cyl", tone: "hi", faceRing: [{ s: 0.018 * S, r: 0.007 * S }] });
  }
  if (cutaway) {
    const FS = { o: SF.p(x, -0.96, HC), a: SF.D, u: SF.X, v: SF.N };
    const r0 = ctrl.bore / 2000;
    // The far half of the barrel and its hoops, in 30° staves so each piece is convex and the
    // piston and air inside sort against them.
    for (let i = 0; i < 6; i++) {
      B.prism(`${id}.shell${i}`, FS, stave(r0, ro, i), 0, 0.44 * S, o);
      B.prism(`${id}.hoopA${i}`, FS, stave(ro, ro + 0.008, i), 0.08 * S, 0.12 * S, { ...o, mat: "iron" });
      B.prism(`${id}.hoopB${i}`, FS, stave(ro, ro + 0.008, i), 0.32 * S, 0.36 * S, { ...o, mat: "iron" });
    }
  }
}

// ---------- moving parts ----------
const Z3 = [0, 0, 1];
// One arm on its pin: hub stack, the arm, the crank, and the link / crosshead / rod it drives.
function drawArm(B, SF, sg, a, mini) {
  const px = sg * XP;
  const u = armU(a, sg), nb = backN(a, sg);
  const L3 = (r, off = 0, h = HA) => [px + r * u[0] + off * nb[0], r * u[1] + off * nb[1], h];
  const cd = [sg * Math.cos(a - AM), -Math.sin(a - AM)];
  const C3 = (r, h) => [px + r * cd[0], r * cd[1], h];
  const id = `arm${sg > 0 ? 1 : 0}`;
  const oI = { mat: "iron", sys: "arm", tone: "hi" };
  const oBz = { mat: "bronze", sys: "arm", tone: "hi" };
  bar(B, `${id}.crank`, SF, C3(0.048, 0.0425), C3(RC - 0.018, 0.0425), 0.036, 0.035, Z3, oI);
  rod(B, `${id}.crankEye`, SF, C3(RC, 0.025), C3(RC, 0.06), 0.022, { ...oI, steps: 16 });
  bar(B, `${id}.collar`, SF, L3(-0.06), L3(0.06), 0.11, 0.09, Z3, { ...oI, nails: mini ? [] : [{ s: 0.025 * S, face: "v", x: [-0.55, 0.55] }, { s: 0.095 * S, face: "v", x: [-0.55, 0.55] }] });
  bar(B, `${id}.beam`, SF, L3(0.06), L3(0.39), 0.075, 0.085, Z3, { mat: "oak", sys: "arm", tone: "hi", grain: mini ? 0 : 2, bands: [{ at: 0.17 * S }] });
  bar(B, `${id}.cap`, SF, L3(0.39), L3(0.445), 0.085, 0.095, Z3, oI);
  if (mini) return;
  const pin = L3(LA, DT);
  rod(B, `${id}.stringPin`, SF, [pin[0], pin[1], HA + 0.0475], [pin[0], pin[1], HA + 0.062], 0.011, oI);
  // Link from the crank pin to the crosshead, the crosshead's fork and the piston rod.
  const pp = pinOf(a);
  const P0 = [sg * pp[0], pp[1]];
  const sc = crossOf(a);
  const X0 = [sg * XC, sc];
  const dl = Math.hypot(X0[0] - P0[0], X0[1] - P0[1]);
  const ld = [(X0[0] - P0[0]) / dl, (X0[1] - P0[1]) / dl];
  const oP = { mat: "iron", sys: "piston", tone: "hi" };
  rod(B, `${id}.linkEyeA`, SF, [P0[0], P0[1], 0.06], [P0[0], P0[1], 0.09], 0.02, oP);
  bar(B, `${id}.link`, SF, [P0[0] + ld[0] * 0.019, P0[1] + ld[1] * 0.019, HC], [X0[0] - ld[0] * 0.018, X0[1] - ld[1] * 0.018, HC], 0.024, 0.022, Z3, oP);
  rod(B, `${id}.crankPin`, SF, [P0[0], P0[1], 0.09], [P0[0], P0[1], 0.099], 0.011, oP);
}

// A rigid group that only translates (crosshead, piston, rod, bolt): drawn once at its
// reference position into a private builder, then emitted each frame shifted by d (world
// units). o.clip is a fixed screen window (the rod's gland), o.shape the painter's shape.
function sprite(B, key, deps, d, fn, o = {}) {
  const cache = B.__sprites || (B.__sprites = new Map());
  const sig = JSON.stringify(deps);
  let hit = cache.get(key);
  if (!hit || hit.sig !== sig) {
    const parts = [];
    const sink = { P: B.P, V: B.V, KS: B.KS, add: (p) => parts.push(p), put: (p) => parts.push(p) };
    fn(createBuilder(sink, { unit: B.unit }));
    hit = { sig, parts };
    cache.set(key, hit);
  }
  const o0 = B.at([0, 0, 0]), o1 = B.at(d);
  const t = `translate(${(o1[0] - o0[0]).toFixed(2)} ${(o1[1] - o0[1]).toFixed(2)})`;
  const scene = B.dynamic ? B.__scene : null;
  for (const p of hit.parts) {
    const sh = p.shape;
    const shape = o.shape || shapeOf(sh.pts.map((q) => add(q, d)), { r: sh.r, axes: sh.axes, edges: sh.edges });
    B.raw(p.id, scene ? `<g data-sprite="">${p.svg}</g>` : `<g transform="${t}">${p.svg}</g>`, shape, { mat: p.mat, sys: p.sys, cut: p.cut, layer: p.layer, bias: p.bias, hidden: p.hidden, cls: p.cls, clip: o.clip, after: o.after || p.after, before: p.before });
    const g = scene && scene.parts.get(p.id)?.el.querySelector("[data-sprite]");
    if (g) g.setAttribute("transform", t);
  }
}

// What the crank drives: crosshead with its fork, the piston rod (one rod, seen through two
// windows: outside the gland, and inside the cut cylinder) and the piston.
function drawDrive(B, SF, sg, a, cutaway, ctrl) {
  const id = `drive${sg > 0 ? 1 : 0}`;
  const x = sg * XC;
  const sc0 = crossOf(A0), sc = crossOf(a);
  const d = mul(SF.D, (sc - sc0) * S);
  const oP = { mat: "iron", sys: "piston", tone: "hi" };
  const oPb = { mat: "bronze", sys: "piston", tone: "hi" };
  sprite(B, `${id}.xh`, [ctrl.elev], d, (C) => {
    box(C, `${id}.xhead`, SF, [x - 0.03, x + 0.03], [sc0 - 0.06, sc0 - 0.021], [HC - 0.03, HC + 0.03], { ...oPb, r: 0.006 });
    box(C, `${id}.forkU`, SF, [x - 0.022, x + 0.022], [sc0 - 0.021, sc0 + 0.024], [0.09, 0.1], oPb);
    box(C, `${id}.forkL`, SF, [x - 0.022, x + 0.022], [sc0 - 0.021, sc0 + 0.024], [0.05, 0.06], oPb);
    rod(C, `${id}.eye`, SF, [x, sc0, 0.06], [x, sc0, 0.09], 0.019, { ...oP, steps: 16 });
    rod(C, `${id}.xpin`, SF, [x, sc0, 0.1], [x, sc0, 0.108], 0.009, { ...oP, steps: 16 });
  });
  const r0 = sc0 - 0.06, r1 = sc0 - LR + 0.06;
  const R = 0.016;
  const axis = { r: R * S, axes: [SF.D], edges: [SF.D, SF.X, SF.N] };
  const along = (s0, s1) => shapeOf([SF.p(x, s0, HC), SF.p(x, s1, HC)], axis);
  const outer = G.rodOut(G.frameAlong(SF.p(x, S_GLAND + 0.006, HC), SF.D), 0, 0.32 * S, R * S, B.P);
  const drawRod = (name) => (C) => rod(C, `${id}.${name}`, SF, [x, r0, HC], [x, r1, HC], R, { ...oP, steps: 20 });
  if (sc - 0.06 > S_GLAND + 0.008) sprite(B, `${id}.rod`, [ctrl.elev], d, drawRod("rod"), { clip: outer.clip, shape: along(sc - 0.06, S_GLAND + 0.006) });
  if (!cutaway) return;
  const after = undefined;
  const inner = G.rodOut(G.frameAlong(SF.p(x, S_FRONT, HC), mul(SF.D, -1)), 0, 0.46 * S, R * S, B.P);
  sprite(B, `${id}.rodIn`, [ctrl.elev], d, drawRod("rodIn"), { clip: inner.clip, shape: along(S_FRONT, sc - LR + 0.06), after });
  const rp = ctrl.bore / 2000 - 0.0015;
  sprite(B, `${id}.piston`, [ctrl.elev, ctrl.bore], d, (C) => rod(C, `${id}.piston`, SF, [x, sc0 - LR, HC], [x, sc0 - LR + 0.06, HC], rp, { mat: "bronze", sys: "piston", tone: "hi", seams: [0.016 * S, 0.044 * S] }), { after });
}

function drawString(B, SF, pose) {
  const tp = tipOf(pose.a);
  const c = SF.p(0, pose.nock, HA);
  // Each half of the string ends in its loop on the arm's string pin (a terminal dot).
  for (const sg of [1, -1]) {
    const end = SF.p(sg * tp[0], tp[1], HA);
    const svg = `<path class="iso-line cord" data-tone="hi" style="stroke-width:1.6px" d="${k.pathOf([B.at(end), B.at(c)])}"/>` + B.D([B.at(end)], { size: 0.9, tone: "hi" });
    B.raw(`string${sg > 0 ? 1 : 0}`, svg, shapeOf([end, c], { r: 0.009 * S, edges: [unit(sub(c, end))] }), { sys: "arm", mat: "sinew" });
  }
}

// Inside the near cylinder (cutaway): the piston with its ground rings, the rod, and the
// trapped air tinted by its pressure.
function drawInside(B, SF, pose, ctrl) {
  const x = XC;
  const r0 = ctrl.bore / 2000;
  const sPf = crossOf(pose.a) - LR;
  const after = undefined;
  const p0w = SF.p(x, S_BACK, HC), p1w = SF.p(x, sPf, HC);
  const F = G.frameAlong(p0w, sub(p1w, p0w));
  const Lw = len(sub(p1w, p0w));
  const ra = (r0 - 0.003) * S;
  const paths = G.disc(0, Lw, ra, F, B.P);
  const u = clamp((pose.p - PA) / 24e5, 0, 1);
  const ring = G.circleOf(F, Lw, ra * (0.25 + 0.65 * u), B.P);
  const svg = `<path d="${paths.fill}" style="fill:var(--accent);fill-opacity:${(0.05 + 0.4 * u).toFixed(3)};stroke:none"/>` + B.L(paths.outline, { tone: "faint" });
  B.raw("cyl1.air", svg, shapeOf([p0w, p1w], { r: ra, axes: [F.a], edges: [F.a, F.u, F.v] }), { sys: "cyl", after });
  const face = `<path class="iso-line" style="stroke:var(--accent);stroke-opacity:${(0.25 + 0.6 * u).toFixed(3)};stroke-width:0.9px" d="${ring}"/>`;
  B.marks("cyl1.airRing", face, [p1w], { r: ra, after: ["cyl1.air", "drive1.piston"] });
}

// The slider (q along the stock from the claw's throat): a grooved front that carries the
// bolt, the claw block with its fingers and trigger, and a tail with pawls and the haul eye.
const SLD = { front: 0.78, claw0: -0.13, claw1: 0.1, tail: -0.2 };
const SL_PIV = [-0.045, 0.172]; // claw pin (q, h)
const SL_TRIG = [-0.115, 0.192]; // trigger pin (q, h)
const rotQH = ([q, h], c, ang) => {
  const dq = q - c[0], dh = h - c[1];
  return [c[0] + dq * Math.cos(ang) + dh * Math.sin(ang), c[1] - dq * Math.sin(ang) + dh * Math.cos(ang)];
};
// The slider's rigid timber and ironwork, drawn with the claw's throat at s = 0.
function sliderRigid(C, SF) {
  const Q = (x, q, h) => [x, q, h];
  const oS = { mat: "oak", sys: "slider", tone: "hi" };
  const groove = C.L([0.012, -0.012].map((x) => k.pathOf([C.at(SF.p(...Q(x, SLD.claw1, 0.176))), C.at(SF.p(...Q(x, SLD.front, 0.176)))])).join(""), { tone: "lo" });
  bar(C, "slider.body", SF, Q(0, SLD.claw1, 0.138), Q(0, SLD.front, 0.138), 0.11, 0.076, Z3, { ...oS, grain: 1, inner: groove, nails: [{ s: 0.05 * S, face: "u", x: [-0.5, 0.5] }, { s: 0.62 * S, face: "u", x: [-0.5, 0.5] }] });
  bar(C, "slider.tail", SF, Q(0, SLD.tail, 0.138), Q(0, SLD.claw0, 0.138), 0.11, 0.076, Z3, { ...oS, nails: [{ s: 0.035 * S, face: "v", x: [-0.5, 0.5] }] });
  for (const sg of [1, -1]) box(C, `slider.cheek${sg > 0 ? 1 : 0}`, SF, sg > 0 ? [0.03, 0.055] : [-0.055, -0.03], [SLD.claw0, SLD.claw1], [0.1, 0.215], { ...oS, r: 0.004 });
  box(C, "slider.floor", SF, [-0.03, 0.03], [SLD.claw0, SLD.claw1], [0.1, 0.135], { ...oS, tone: "mid" });
  const oT = { mat: "iron", sys: "trigger", tone: "hi" };
  for (const sg of [1, -1]) rod(C, `slider.clawPin${sg > 0 ? 1 : 0}`, SF, Q(sg * 0.055, ...SL_PIV), Q(sg * 0.063, ...SL_PIV), 0.006, oT);
  rod(C, "slider.trigPin", SF, Q(0.068, ...SL_TRIG), Q(0.076, ...SL_TRIG), 0.007, oT);
  const oPw = { mat: "iron", sys: "slider", tone: "hi" };
  for (const sg of [1, -1]) {
    const j = sg > 0 ? 1 : 0;
    rod(C, `slider.pawlPin${j}`, SF, Q(sg * 0.079, -0.165, 0.13), Q(sg * 0.087, -0.165, 0.13), 0.006, oPw);
    rod(C, `slider.pawlBoss${j}`, SF, Q(sg * 0.055, -0.165, 0.13), Q(sg * 0.066, -0.165, 0.13), 0.009, oPw);
  }
  const oW = { mat: "iron", sys: "winch", tone: "hi" };
  rod(C, "slider.eye", SF, Q(0, SLD.tail, 0.14), Q(0, SLD.tail - 0.033, 0.14), 0.008, oW);
  C.ring("slider.ring", SF.p(...Q(-0.004, SLD.tail - 0.047, 0.14)), SF.p(...Q(0.004, SLD.tail - 0.047, 0.14)), 0.006 * S, 0.014 * S, oW);
}
// Claw fingers on their pin, the lug on their tail and the trigger lever, at claw angle phi
// (tripped: the nose drops forward and the string slips over it) and trigger pull psi.
function sliderClaw(C, SF, phi, psi) {
  const th = phi * rad(42);
  const finger = [[-0.075, 0.158], [0.028, 0.158], [0.028, 0.205], [0.017, 0.212], [0.007, 0.212], [0.007, 0.18], [-0.075, 0.18]].map((p) => rotQH(p, SL_PIV, th));
  const oT = { mat: "iron", sys: "trigger", tone: "hi" };
  for (const sg of [1, -1]) {
    const F = { o: SF.p(sg > 0 ? 0.013 : -0.027, 0, 0), a: SF.X, u: SF.D, v: SF.N };
    C.prism(`slider.finger${sg > 0 ? 1 : 0}`, F, finger.map(([q, h]) => [q * S, h * S]), 0, 0.014 * S, { ...oT, convex: false });
  }
  const lug = rotQH([-0.068, 0.165], SL_PIV, th);
  rod(C, "slider.lug", SF, [0.055, ...lug], [0.07, ...lug], 0.0055, oT);
  const tt = -psi * rad(22);
  const nose = rotQH([-0.064, 0.178], SL_TRIG, tt), handle = rotQH([-0.235, 0.218], SL_TRIG, tt);
  bar(C, "slider.trigNose", SF, [0.062, ...SL_TRIG], [0.062, ...nose], 0.012, 0.014, Z3, oT);
  bar(C, "slider.trigHandle", SF, [0.062, ...SL_TRIG], [0.062, ...handle], 0.012, 0.014, Z3, oT);
}
// The slider slides as one piece; only the pawls bob over the rack teeth.
function drawSlider(B, SF, pose, ctrl) {
  const sl = pose.sl;
  const d = mul(SF.D, sl * S);
  sprite(B, "slider", [ctrl.elev], d, (C) => sliderRigid(C, SF));
  sprite(B, "claw", [ctrl.elev, pose.phi.toFixed(3), pose.psi.toFixed(3)], d, (C) => sliderClaw(C, SF, pose.phi, pose.psi));
  const tooth = ((((S_N0 - sl) / 0.025) % 1) + 1) % 1;
  const toeH = 0.113 + 0.011 * tooth;
  const oPw = { mat: "iron", sys: "slider", tone: "hi" };
  for (const sg of [1, -1]) bar(B, `slider.pawl${sg > 0 ? 1 : 0}`, SF, [sg * 0.0725, sl - 0.165, 0.13], [sg * 0.0725, sl - 0.212, toeH], 0.013, 0.012, Z3, oPw);
  B.cord("winch.rope", [SF.p(0, sl + SLD.tail - 0.061, 0.14), SF.p(0, DRUM.s, DRUM.h - DRUM.r - 0.006)], { width: 1.5, tone: "mid", sys: "winch", mat: "rope", r: 0.007 * S });
}

// The windlass: drum with the rope taken in, ratchet and pawl, two capstan heads.
function drawWindlass(B, SF, turned, pose) {
  const t = -turned;
  const at = (x) => SF.p(x, DRUM.s, DRUM.h);
  const Fr = (x) => ({ o: at(x), a: SF.X, u: SF.dir(0, Math.cos(t), Math.sin(t)), v: SF.dir(0, -Math.sin(t), Math.cos(t)) });
  const oW = { mat: "oak", sys: "winch", tone: "hi" };
  const w = 0.012 + 0.008 * (Math.abs(turned) / TAU);
  B.cyl("winch.drumA", at(-0.09), at(-w), DRUM.r * S, { ...oW, steps: 20, F: Fr(-0.09), ribs: { count: 12, phase: t } });
  B.cyl("winch.coil", at(-w), at(w), (DRUM.r + 0.008) * S, { mat: "rope", sys: "winch", tone: "hi", steps: 20, F: Fr(-w), ribs: { count: 22, twist: 0.6, phase: t } });
  B.cyl("winch.drumB", at(w), at(0.09), DRUM.r * S, { ...oW, steps: 20, F: Fr(w), ribs: { count: 12, phase: t } });
  const RF = { o: at(0.155), a: SF.X, u: SF.D, v: SF.N };
  B.toothed("winch.ratchet", RF, polySaw(0.06 * S, 0.076 * S, 14, t), 0, 0.02 * S, { mat: "iron", sys: "winch", tone: "hi" });
  const tooth = ((((turned * 14) / TAU) % 1) + 1) % 1;
  const piv = [DRUM.s - 0.105, 0.258];
  const toe = [DRUM.s - 0.066, DRUM.h + 0.046 + 0.012 * (1 - tooth)];
  const oI = { mat: "iron", sys: "winch", tone: "hi" };
  bar(B, "winch.pawl", SF, [0.166, piv[0], piv[1]], [0.166, toe[0], toe[1]], 0.012, 0.014, Z3, oI);
  rod(B, "winch.pawlBoss", SF, [0.15, piv[0], piv[1]], [0.16, piv[0], piv[1]], 0.009, oI);
  rod(B, "winch.pawlPin", SF, [0.172, piv[0], piv[1]], [0.18, piv[0], piv[1]], 0.007, oI);
  for (const sg of [1, -1]) {
    const x0 = sg > 0 ? 0.175 : -0.215, x1 = sg > 0 ? 0.235 : -0.155;
    const j = sg > 0 ? 1 : 0;
    const xm = (x0 + x1) / 2;
    for (let i = 0; i < 4; i++) {
      const a = t + Math.PI / 4 + (i * Math.PI) / 2;
      const c = Math.cos(a), s = Math.sin(a);
      rod(B, `winch.spike${j}${i}`, SF, [xm, DRUM.s + 0.044 * c, DRUM.h + 0.044 * s], [xm, DRUM.s + 0.27 * c, DRUM.h + 0.27 * s], 0.013, oW);
    }
  }
}

function drawBolt(B, M, SF, pose) {
  const am = M.ammo;
  const L = am.length, r = am.shaft;
  let tail = SF.p(0, pose.bolt.s, HB);
  let dir = SF.D;
  const u = pose.bolt.load;
  if (u !== undefined && u < 1) {
    const from = wW(RACK.x[M.ammoIndex], RACK.y0, RACK.z + r + 0.003);
    tail = lerp(from, tail, u);
    tail[2] += Math.sin(u * Math.PI) * 0.45 * S;
    dir = unit(lerp([0, -1, 0], dir, u));
  }
  const look = { fire: am.fire, heavy: am.heavy, sys: "slider", roll: Math.PI / 2, vane: 2.6 };
  if (u !== undefined && u < 1) return looks.bolt(B, "bolt", tail, dir, L * S, r * S, look);
  // On the slider and on the string the bolt only slides along the stock: drawn once, shifted.
  const ref = SF.p(0, 0, HB);
  sprite(B, "bolt", [am.id, M.ctrl.elev], mul(SF.D, pose.bolt.s * S), (C) => looks.bolt(C, "bolt", ref, SF.D, L * S, r * S, look));
}

function drawPile(B, M, onMachine) {
  M.def.ammo.forEach((am, i) => {
    if (i === M.ammoIndex && onMachine) return;
    looks.bolt(B, `pile${i}`, wW(RACK.x[i], RACK.y0, RACK.z + am.shaft + 0.003), [0, -1, 0], am.length * S, am.shaft * S, { fire: am.fire, heavy: am.heavy, lit: i === M.ammoIndex, roll: Math.PI / 2, vane: 2.6 });
  });
}

// Ghosts of the arms, cranks and string through the release, and the nock's path.
function drawStrobe(B, SF, sim, now) {
  const lines = [];
  const pts = [];
  const path = [];
  const end = Math.min(now, sim.hitT + 0.04);
  for (let t = TRIG; t <= end; t += 0.0025) {
    const f = sim.rec.at(t);
    const tp = tipOf(f.a);
    const pp = pinOf(f.a);
    for (const sg of [1, -1]) {
      lines.push(k.pathOf([B.at(SF.p(sg * XP, 0, HA)), B.at(SF.p(sg * tp[0], tp[1], HA))]));
      lines.push(k.pathOf([B.at(SF.p(sg * XP, 0, 0.0425)), B.at(SF.p(sg * pp[0], pp[1], 0.0425))]));
    }
    lines.push(k.pathOf([B.at(SF.p(tp[0], tp[1], HA)), B.at(SF.p(0, f.sb, HA)), B.at(SF.p(-tp[0], tp[1], HA))]));
    pts.push(B.at(SF.p(0, f.bs, HB)));
  }
  for (let t = TRIG; t <= Math.min(now, sim.release.t); t += 0.0005) path.push(B.at(SF.p(0, sim.rec.at(t).bs, HB + 0.02)));
  const svg = B.L(lines.join(""), { tone: "lo" }) + (path.length > 1 ? `<path class="iso-line" data-tone="lit" style="stroke:var(--accent);stroke-width:1.2px" d="${k.pathOf(path)}"/>` : "") + B.D(pts, { size: 1.2, tone: "mid" });
  B.marks("strobe", svg, [SF.p(0, -0.5, 0.5)], { r: 200, layer: 6 });
}

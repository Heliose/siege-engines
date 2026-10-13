// Counterweight trebuchet with a hinged weight box, a sling on a release prong, a trough,
// a ratchet windlass and a sear trigger. Authored in metres (S converts to world units).
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { add, sub, mul, unit, len, lerp, clamp, rad, deg, ease, smoothstep, fmt, fmtInt, TAU, rng } from "../engine/vec.js";
import * as PH from "../engine/physics.js";
import * as looks from "../engine/looks.js";
import { frameFrom, polyRect, polySaw } from "../engine/geo.js";
import { shapeOf } from "../engine/scene.js";

const U = 0.05;
const S = 1 / U;
const w = (x, y, z) => [x * S, y * S, z * S];
const W2 = (y, z, x = 0) => [x * S, y * S, z * S];

// Real proportions (metres, kilograms).
const ZP = 6.5; // axle height
const LL = 8.8; // long arm
const LS = 2.4; // short arm, to the weight hinge
const LC = 1.9; // hinge to weight-box centre
const DCG = 1.4; // arm centre of mass on the long side
const MA = 1100; // arm mass
const IA = 9000; // arm inertia about its centre
const ZT = 0.52; // trough floor
const TH0 = Math.asin((1.0 - ZP) / LL); // cocked: tip 1 m off the ground
const TH_REST = Math.PI / 2;
const DRUM = { y: 9.5, z: 1.35, r: 0.32 };
const EYE_S = 7.2; // winch eye on the arm
const RING_S = 8.35; // trigger ring on the arm
const TRIG = 0.45; // seconds of trigger before the arm moves
const POST_X = 1.5;

const armDir = (th) => [0, Math.cos(th), Math.sin(th)];
const armNrm = (th) => [0, -Math.sin(th), Math.cos(th)];
const pivot = [0, 0, ZP];
const onArm = (th, s, off = 0, x = 0) => add(add(add(pivot, mul(armDir(th), s)), mul(armNrm(th), off)), [x, 0, 0]);
const hingeAt = (th) => onArm(th, -LS);
const cwAt = (th, ph) => add(hingeAt(th), [0, LC * Math.sin(ph), -LC * Math.cos(ph)]);

// Stepped taper of the arm: [s0, s1, width, height] and iron bands at s.
const ARM = [[-2.6, -0.36, 0.54, 0.6], [-0.36, 0.36, 0.62, 0.74], [0.36, 2.2, 0.52, 0.58], [2.2, 4.3, 0.46, 0.52], [4.3, 6.3, 0.4, 0.45], [6.3, 8.0, 0.34, 0.38], [8.0, 8.8, 0.3, 0.33]];
const BANDS = [-2.2, -1.25, -0.44, 0.44, 1.3, 2.2, 3.25, 4.3, 5.3, 6.3, 7.15, 8.0];
const sectionAt = (s) => ARM.find(([a, b]) => s >= a && s <= b) || ARM[ARM.length - 1];

function simulate(ctrl, ammo, range) {
  const M = ctrl.cw;
  const Lsl = ctrl.sling;
  const relAngle = rad(ctrl.prong);
  const mp = ammo.mass;
  const r = ammo.radius;
  const zc = ZT + r;
  const tip = (th) => [LL * Math.cos(th), ZP + LL * Math.sin(th)];
  const sEnd = (th) => [-LS * Math.cos(th), ZP - LS * Math.sin(th)];
  const cw = (th, ph) => {
    const s = sEnd(th);
    return [s[0] + LC * Math.sin(ph), s[1] - LC * Math.cos(ph)];
  };
  const psiOf = (th) => Math.PI - Math.asin(clamp((zc - tip(th)[1]) / Lsl, -1, 1));
  const proj = (th, ps) => {
    const t = tip(th);
    return [t[0] + Lsl * Math.cos(ps), t[1] + Lsl * Math.sin(ps)];
  };
  const P3 = (p) => [0, p[0], p[1]];
  const armCg = (th) => [DCG * Math.cos(th), ZP + DCG * Math.sin(th)];
  const Icw = M * 0.55;
  const sys1 = PH.linkage({
    n: 2,
    points: (q) => [{ m: MA, p: P3(armCg(q[0])) }, { m: M, p: P3(cw(q[0], q[1])) }, { m: mp, p: P3(proj(q[0], psiOf(q[0]))) }],
    bodies: (q) => [{ I: IA, a: q[0] }, { I: Icw, a: q[1] }],
  });
  const make2 = (m, damp) =>
    PH.linkage({
      n: 3,
      points: (q) => [{ m: MA, p: P3(armCg(q[0])) }, { m: M, p: P3(cw(q[0], q[1])) }, { m, p: P3(proj(q[0], q[2])) }],
      bodies: (q) => [{ I: IA, a: q[0] }, { I: Icw, a: q[1] }],
      force: damp ? (q, qd) => [-damp[0] * qd[0], -damp[1] * (qd[1] - qd[0] * 0.2), -damp[2] * (qd[2] - qd[0])] : null,
    });
  const sys2 = make2(mp, null);
  const rec = PH.timeline();
  const dt = 1 / 1600;
  const every = 6;
  let t = 0;
  let q = [TH0, 0];
  let qd = [0, 0];
  let q3 = null, qd3 = null;
  let lift = null, release = null;
  const f1 = (tt, y) => [y[2], y[3], ...sys1.accel([y[0], y[1]], [y[2], y[3]], tt)];
  const f2 = (sys) => (tt, y) => [y[3], y[4], y[5], ...sys.accel(y.slice(0, 3), y.slice(3), tt)];
  const push = (th, ph, ps, released, pv) => rec.push(TRIG + t, { th, ph, ps, rel: released ? 1 : 0, py: pv[0], pz: pv[1] });
  let i = 0;
  rec.push(0, { th: TH0, ph: 0, ps: psiOf(TH0), rel: 0, py: proj(TH0, psiOf(TH0))[0], pz: proj(TH0, psiOf(TH0))[1] });
  // Phase 1: the ball slides back along the trough.
  while (t < 3) {
    const y = PH.rk4(f1, t, [...q, ...qd], dt);
    q = [y[0], y[1]];
    qd = [y[2], y[3]];
    t += dt;
    const ps = psiOf(q[0]);
    if (i++ % every === 0) push(q[0], q[1], ps, false, proj(q[0], ps));
    const e = 1e-6;
    const psd = ((psiOf(q[0] + e) - psiOf(q[0] - e)) / (2 * e)) * qd[0];
    const a = sys2.accel([q[0], q[1], ps], [qd[0], qd[1], psd], t);
    const h = 1e-3;
    const zAt = (s) => proj(q[0] + qd[0] * s + 0.5 * a[0] * s * s, ps + psd * s + 0.5 * a[2] * s * s)[1];
    const zdd = (zAt(h) - 2 * zAt(0) + zAt(-h)) / (h * h);
    if (zdd > 0 || Math.abs(zc - tip(q[0])[1]) >= Lsl * 0.998) {
      lift = t;
      q3 = [q[0], q[1], ps];
      qd3 = [qd[0], qd[1], psd];
      break;
    }
  }
  if (!q3) return null;
  // Phase 2: the sling whips round until its loop slips off the prong.
  while (t < 4) {
    const y = PH.rk4(f2(sys2), t, [...q3, ...qd3], dt);
    q3 = y.slice(0, 3);
    qd3 = y.slice(3);
    t += dt;
    if (i++ % every === 0) push(q3[0], q3[1], q3[2], false, proj(q3[0], q3[2]));
    if (q3[2] - q3[0] >= TAU - relAngle) {
      const v = sys2.velocity(q3, qd3, 2);
      release = { t, p: proj(q3[0], q3[2]), v: [0, v[1], v[2]], th: q3[0], ps: q3[2] };
      break;
    }
  }
  if (!release) return null;
  push(q3[0], q3[1], q3[2], true, release.p);
  // Phase 3: the empty sling and the arm swing on and settle against bearing friction.
  const sys3 = make2(3, [2600, 0.9 * M, 4]);
  const f3 = f2(sys3);
  const end = t + 7;
  while (t < end) {
    const y = PH.rk4(f3, t, [...q3, ...qd3], dt * 2);
    q3 = y.slice(0, 3);
    qd3 = y.slice(3);
    t += dt * 2;
    if (i++ % 3 === 0) push(q3[0], q3[1], q3[2], true, proj(q3[0], q3[2]));
  }
  const drop = M * PH.GRAVITY * (sEnd(TH0)[1] - LC - (ZP - LS - LC));
  return { rec, lift: TRIG + lift, release: { ...release, t: TRIG + release.t }, end: TRIG + t, final: { th: q3[0], ph: q3[1], ps: q3[2] }, drop, Lsl };
}

// Rope length from the drum to the winch eye, for the drum's turn.
const ropeLen = (th) => {
  const e = onArm(th, EYE_S, -0.24);
  return Math.hypot(e[1] - DRUM.y, e[2] - (DRUM.z + DRUM.r));
};

const PILE = {
  granite: [[3.05, 1.2, 0.21], [3.49, 1.2, 0.21], [3.27, 1.58, 0.21], [3.27, 1.33, 0.55]],
  pot: [[3.1, 2.6], [3.55, 2.95]],
  rubble: [[3.3, 4.0]],
};

export default {
  id: "trebuchet",
  name: "Counterweight Trebuchet",
  short: "Trebuchet",
  unit: U,
  view: { W: 1000, H: 640, azimuth: 24, elevation: 20, pad: 26, fit: [w(-5, -7.6, -0.9), w(5, -7.6, -0.9), w(-5, 11.6, -0.9), w(5, 11.6, -0.9), w(0, -1, 16.2), w(0, 4, 15.2)] },
  target: { kind: "wall", distance: 240, maxRange: 420, height: 9, apex: 140 },
  ammo: [
    { id: "granite", name: "Granite ball", look: "granite", mass: 100, radius: 0.21, cd: 0.47 },
    { id: "pot", name: "Fire pot", look: "pot", mass: 30, radius: 0.2, cd: 0.6, fire: true },
    { id: "rubble", name: "Rubble bag", look: "cluster", mass: 140, radius: 0.31, cd: 0.85 },
  ],
  controls: [
    { id: "cw", name: "Counterweight", min: 3000, max: 10000, step: 250, value: 6000, unit: "kg" },
    { id: "sling", name: "Sling length", min: 5, max: 9, step: 0.1, value: 7.2, unit: "m", digits: 1 },
    { id: "prong", name: "Prong release", min: 10, max: 80, step: 1, value: 32, unit: "°" },
    { id: "distance", name: "Wall distance", min: 120, max: 380, step: 10, value: 240, unit: "m" },
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
    { id: "arm", name: "Arm" },
    { id: "cw", name: "Counterweight" },
    { id: "sling", name: "Sling" },
    { id: "trigger", name: "Trigger" },
    { id: "winch", name: "Windlass" },
    { id: "frame", name: "Frame" },
  ],
  phases: ["rest", "winding", "loading", "armed", "loose", "flight", "impact"],
  hint: "Space · loose   W · wind",
  holdShot: true,

  build(B, M) {
    const mini = !!B.mini;
    if (!mini) {
      B.plinth({ x: -5 * S, y: -7.6 * S, w: 10 * S, d: 19.2 * S, r: 10 }, { h: 12, foot: 6, ruler: "y", label: { x: 2.6 * S, y: 9.2 * S, w: 46, d: 22, r: 1.5 } });
      B.halo("frame.halo", [w(-2.7, -6.2, 0), w(2.7, -6.2, 0), w(2.7, 10.4, 0), w(-2.7, 10.4, 0)], 0, { blur: 6 });
    }
    // Cross sills on the ground, sole beams on them.
    for (const y of [-5.4, -1.6, 3.4, 9.5]) {
      B.beam(`sill${y}`, w(-2.6, y, 0.21), w(2.6, y, 0.21), { w: 0.42 * S, h: 0.42 * S, up: [0, 0, 1], mat: "oak", sys: "frame", grain: 1, nails: [{ s: 0.22 * S, face: "v", x: [-0.4, 0.4] }, { s: 5.0 * S, face: "v", x: [-0.4, 0.4] }] });
    }
    for (const x of [-POST_X, POST_X]) {
      const near = x > 0;
      const o = { mat: "oak", sys: "frame", cut: near ? true : undefined };
      B.beam(`sole${x}`, w(x, -6.0, 0.65), w(x, 10.2, 0.65), { w: 0.46 * S, h: 0.46 * S, up: [0, 0, 1], ...o, grain: 2, bands: [{ at: 0.35 * S }, { at: 15.85 * S }], nails: [-5.4, -1.6, 3.4, 9.5].map((y) => ({ s: (y + 6) * S, face: "v", x: [-0.35, 0.35] })) });
      // Upright with its bearing block and iron cap.
      B.beam(`post${x}`, w(x, 0, 0.88), w(x, 0, 6.28), { w: 0.5 * S, h: 0.5 * S, up: [0, 1, 0], ...o, grain: 2, bands: [{ at: 1.2 * S }, { at: 3.6 * S }], pegs: [{ s: 0.5 * S, face: near ? "u" : "-u", x: [-0.45, 0.45] }] });
      B.slab(`bearing${x}`, { x: (x - 0.3) * S, y: -0.36 * S, w: 0.6 * S, d: 0.72 * S, r: 2 }, 6.28 * S, 0.66 * S, { tone: "hi", mat: "oak", sys: "frame", cut: o.cut, steps: 3, bevel: 0.5 });
      B.slab(`cap${x}`, { x: (x - 0.27) * S, y: -0.4 * S, w: 0.54 * S, d: 0.8 * S, r: 1 }, 6.94 * S, 0.06 * S, { tone: "hi", mat: "iron", sys: "frame", cut: o.cut, steps: 2, over: B.D([w(x - 0.16, -0.3, 7.0), w(x + 0.16, -0.3, 7.0), w(x - 0.16, 0.3, 7.0), w(x + 0.16, 0.3, 7.0)].map(B.at), { size: 0.6, tone: "hi" }) });
      // Long braces and knee braces.
      for (const sgn of [-1, 1]) {
        B.beam(`brace${x}${sgn}`, w(x, sgn * 4.9, 0.9), w(x, sgn * 0.27, 5.35), { w: 0.36 * S, h: 0.34 * S, up: [0, -sgn, 0.6], ...o, grain: 1, nails: [{ s: 0.6 * S, face: "-v", x: 0 }] });
        B.beam(`knee${x}${sgn}`, w(x, sgn * 1.95, 0.9), w(x, sgn * 0.27, 2.55), { w: 0.26 * S, h: 0.24 * S, up: [0, -sgn, 0.9], ...o });
      }
      // Axle stubs outside the bearing, inside between bearing and arm.
      const ax = Math.sign(x);
      B.cyl(`axle.out${x}`, w(ax * 1.8, 0, ZP), w(ax * 2.06, 0, ZP), 0.16 * S, { mat: "iron", sys: "arm", tone: "hi", cut: o.cut, faceRing: [{ s: 0.26 * S, r: 0.08 * S }] });
      B.cyl(`axle.in${x}`, w(ax * 0.31, 0, ZP), w(ax * 1.2, 0, ZP), 0.16 * S, { mat: "iron", sys: "arm", tone: "hi", seams: [0.3 * S] });
    }
    // Trough planks between the sole beams.
    [[-1.22, -0.43], [-0.41, 0.41], [0.43, 1.22]].forEach(([x0, x1], i) =>
      B.slab(`trough${i}`, { x: x0 * S, y: -2.6 * S, w: (x1 - x0) * S, d: 10.6 * S, r: 0.5 }, 0.42 * S, 0.1 * S, { tone: "mid", mat: "wood", sys: "sling", steps: 2, over: B.D([-1.6, 3.4].flatMap((y) => [w(x0 + 0.12, y, 0.52), w(x1 - 0.12, y, 0.52)]).map(B.at), { size: 0.45 }) }),
    );
    // Windlass cheeks on the rear of the sole beams.
    for (const x of [-POST_X, POST_X]) {
      const cut = x > 0 ? true : undefined;
      B.slab(`cheek${x}`, { x: (x - 0.23) * S, y: (DRUM.y - 0.42) * S, w: 0.46 * S, d: 0.84 * S, r: 2 }, 0.88 * S, 1.02 * S, { tone: "hi", mat: "oak", sys: "winch", steps: 3, bevel: 0.4, cut });
      B.cyl(`drumpin${x}`, w(Math.sign(x) * 1.2, DRUM.y, DRUM.z), w(Math.sign(x) * 1.27, DRUM.y, DRUM.z), 0.11 * S, { mat: "iron", sys: "winch" });
    }
    B.cyl(`drumaxle.out`, w(1.73, DRUM.y, DRUM.z), w(2.0, DRUM.y, DRUM.z), 0.11 * S, { mat: "iron", sys: "winch" });
    B.cyl(`drumaxle.far`, w(-1.73, DRUM.y, DRUM.z), w(-2.0, DRUM.y, DRUM.z), 0.11 * S, { mat: "iron", sys: "winch" });
    if (!mini) {
      // A ladder against the far upright, a coil of spare rope, the trigger mallet, sill stakes.
      const foot = [-2.05, 2.7, 0], head = [-1.84, 0.34, 6.05];
      const along = sub(head, foot);
      const side = [0.24, 0, 0];
      for (const sx of [-1, 1]) B.beam(`ladder.rail${sx}`, w(...add(foot, mul(side, sx))), w(...add(head, mul(side, sx))), { w: 0.07 * S, h: 0.11 * S, up: [0, 1, 0.4], mat: "wood", tone: "mid" });
      for (let i = 1; i < 16; i++) {
        const p = add(foot, mul(along, i / 16));
        B.cyl(`ladder.rung${i}`, w(...add(p, mul(side, -0.95))), w(...add(p, mul(side, 0.95))), 0.025 * S, { mat: "wood", tone: "mid" });
      }
      for (let i = 0; i < 4; i++) B.ring(`coil${i}`, w(3.4, 8.3, i * 0.075), w(3.4, 8.3, i * 0.075 + 0.07), (0.36 - i * 0.02) * S, (0.44 - i * 0.02) * S, { mat: "rope", tone: "hi" });
      B.cyl("mallet.handle", w(2.35, 7.25, 0.05), w(2.95, 7.6, 0.05), 0.03 * S, { mat: "oak", tone: "hi" });
      B.cyl("mallet.head", w(2.95, 7.45, 0.11), w(3.0, 7.84, 0.11), 0.11 * S, { mat: "oak", tone: "hi", F: G.frameAlong(w(2.9, 7.5, 0.11), [0.12, 0.99, 0]) });
      for (const y of [-5.4, -1.6, 3.4, 9.5]) for (const x of [-2.75, 2.75]) B.cyl(`stake${x}${y}`, w(x, y, 0), w(x, y, 0.62), 0.06 * S, { mat: "oak", tone: "mid", faceRing: [{ s: 0.62 * S, r: 0.03 * S }] });
    }
    // Trigger post on the trough, with its lanyard stake.
    B.slab("trigger.post", { x: -0.22 * S, y: 6.2 * S, w: 0.44 * S, d: 0.42 * S, r: 1 }, 0.52 * S, 0.42 * S, { tone: "hi", mat: "oak", sys: "trigger", steps: 2, bevel: 0.4 });
    B.cyl("trigger.pivot", w(-0.24, 6.4, 0.86), w(0.24, 6.4, 0.86), 0.05 * S, { mat: "iron", sys: "trigger" });
    B.cyl("trigger.stake", w(2.75, 6.6, 0), w(2.75, 6.6, 0.5), 0.07 * S, { mat: "oak", sys: "trigger", faceRing: [{ s: 0.5 * S, r: 0.04 * S }] });
  },

  init(M) {
    return { mode: "rest", wind: 0, load: 0, auto: false, rest: { th: TH_REST, ph: 0, ps: -Math.PI / 2 }, sim: null, drum: 0 };
  },

  act(M, id) {
    const st = M.state;
    if (id === "wind") {
      if (st.mode === "rest") {
        st.mode = "winding";
        st.from = { ...st.rest };
        M.setPhase("winding");
      }
    }
    if (id === "loose") {
      if (st.mode === "armed") return this.fire(M);
      if (st.mode === "rest") {
        st.mode = "winding";
        st.from = { ...st.rest };
        M.setPhase("winding");
      }
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
    const sim = simulate(M.ctrl, M.ammo, M.range);
    if (!sim) return;
    st.sim = sim;
    st.heard = {};
    st.mode = "shot";
    st.auto = false;
    const rel = sim.release;
    const p = W2(rel.p[0], rel.p[1]);
    const flight = M.launch({ p, v: rel.v, t0: rel.t, spin: 6 });
    st.flight = flight;
    const T = Math.max(sim.end, rel.t + flight.impact.t + 2.6);
    M.startShot(T, [[TRIG, "trip"], [sim.lift, "lift"], [rel.t, "loose"], [rel.t + flight.impact.t, "impact"]]);
    M.setPhase("loose");
  },

  endShot(M) {
    const st = M.state;
    st.rest = st.sim ? { ...st.sim.final } : st.rest;
    st.mode = "rest";
    M.setPhase("rest");
    if (st.autoAgain) {
      st.autoAgain = false;
      this.act(M, "loose");
    }
  },

  tour(M) {
    if (M.state.mode === "rest") this.act(M, "loose");
  },

  update(M, dt) {
    const st = M.state;
    if (st.mode === "winding") {
      st.wind = Math.min(1, st.wind + dt / 4.2);
      const tooth = Math.floor(Math.abs(st.drum || 0) / (TAU / 16));
      if (tooth !== st.tooth) {
        st.tooth = tooth;
        M.sfx?.("click", { pitch: 0.9 + Math.random() * 0.2 });
      }
      if (Math.random() < dt * 1.5) M.sfx?.("creak", { pitch: 0.7 + Math.random() * 0.5 });
      if (st.wind >= 1) {
        st.mode = "loading";
        st.load = 0;
        M.setPhase("loading");
      }
      return true;
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
      if (M.shot.playing && dt > 0) {
        if (!st.heard.trip && t >= 0.06) (st.heard.trip = true), M.sfx?.("clank", { pitch: 0.8 });
        if (!st.heard.creak && t >= TRIG + 0.1) (st.heard.creak = true), M.sfx?.("creak", { pitch: 0.6, gap: 0 });
        if (!st.heard.swing && t >= st.sim.lift) (st.heard.swing = true), M.sfx?.("whoosh", { size: 1.6, gain: 0.5 });
        if (!st.heard.settle && t >= st.sim.release.t + 0.9) (st.heard.settle = true), M.sfx?.("thud", { pitch: 0.7, size: 1.5, gain: 0.6 });
        if (!M.calm && t > TRIG && t < st.sim.lift && Math.random() < dt * 90) {
          const f = st.sim.rec.at(t);
          M.fx.emit("dust", W2(f.py + 0.3, ZT + 0.05, (Math.random() - 0.5) * 0.6), { v: [0, 20, 6], spread: 8, size: 6, grow: 22, life: 1.6, drag: 2.2, buoy: 6, alpha: 0.7 });
        }
      }
      const rel = st.sim.release.t;
      const hit = rel + st.flight.impact.t;
      M.setPhase(t < rel ? "loose" : t < hit ? "flight" : "impact");
      return true;
    }
    if (st.mode === "armed" && M.ammo.fire) return true;
    return false;
  },

  // The pose the machine is drawn in this frame.
  pose(M) {
    const st = M.state;
    const r = M.ammo.radius;
    const zc = ZT + r;
    const L = M.ctrl.sling;
    const tipOf = (th) => onArm(th, LL);
    const layOut = (th) => {
      const T = tipOf(th);
      const hang = [T[1], T[2] - L];
      if (hang[1] > zc) return { py: hang[0], pz: hang[1], ps: -Math.PI / 2 };
      const dy = Math.sqrt(Math.max(0, L * L - (T[2] - zc) ** 2));
      return { py: T[1] - dy, pz: zc, ps: Math.atan2(zc - T[2], -dy) };
    };
    if (st.mode === "shot" && M.shot && st.sim) {
      const f = st.sim.rec.at(M.shot.t);
      const sear = smoothstep(0.05, TRIG - 0.05, M.shot.t);
      return { th: f.th, ph: f.ph, py: f.py, pz: f.pz, ps: f.ps, proj: f.rel < 0.5, sear, hook: "loose", released: f.rel >= 0.5, armed: true };
    }
    if (st.mode === "winding") {
      const e = ease(st.wind);
      const th = st.from.th + (TH0 - st.from.th) * e;
      const ph = st.from.ph * (1 - e);
      return { th, ph, ...layOut(th), proj: false, sear: 1 - smoothstep(0.85, 1, st.wind), hook: "arm", armed: false };
    }
    if (st.mode === "loading" || st.mode === "armed") {
      const lay = layOut(TH0);
      const u = st.mode === "armed" ? 1 : ease(st.load);
      return { th: TH0, ph: 0, ...lay, proj: true, loading: u, sear: 0, hook: u > 0.3 ? "loose" : "arm", armed: true };
    }
    const rs = st.rest;
    const T = tipOf(rs.th);
    const ps = rs.ps ?? -Math.PI / 2;
    return { th: rs.th, ph: rs.ph, py: T[1] + L * Math.cos(ps), pz: Math.max(zc, T[2] + L * Math.sin(ps)), ps, proj: false, sear: 1, hook: "loose", released: true, armed: false };
  },

  draw(B, M) {
    const pose = this.pose(M);
    const st = M.state;
    const mini = !!B.mini;
    drawArm(B, pose.th, M.ctrl.prong);
    drawWeight(B, pose.th, pose.ph, M.ctrl.cw);
    if (mini) return;
    const tip = onArm(pose.th, LL);
    const prongTip = add(tip, mul(prongDir(pose.th, M.ctrl.prong), 0.5));
    drawSling(B, M, pose, tip, prongTip);
    // Windlass: drum turned by the rope it has taken in.
    const turned = st.mode === "winding" ? (ropeLen(st.from.th) - ropeLen(pose.th)) / DRUM.r : st.mode === "loading" || st.mode === "armed" ? (ropeLen(st.from?.th ?? TH_REST) - ropeLen(TH0)) / DRUM.r : 0;
    st.drum = turned;
    B.keep("winch", [turned.toFixed(4), pose.hook, pose.hook === "arm" ? pose.th.toFixed(5) : 0], () => drawWindlass(B, turned, pose, st));
    B.keep("trigger", [pose.sear.toFixed(3)], () => drawTrigger(B, pose));
    B.keep("pile", [M.ammo.id, !!pose.proj, !!pose.released], () => drawPile(B, M, pose));
    if (M.toggles.strobe && st.sim && M.shot) drawStrobe(B, M, st.sim, M.shot.t);
    if (M.ammo.fire && pose.proj && !M.calm) {
      const P = W2(pose.py, pose.pz, 0);
      if (Math.random() < 0.7) M.fx.emit("fire", add(P, [0, 0, M.ammo.radius * S * 1.9]), { v: [0, 0, 18], spread: 4, size: 6, grow: 2, life: 0.4, heat: 1, buoy: 30, drag: 2 });
    }
  },

  occluders(M) {
    return [
      { min: w(1.25, -5, 0.4), max: w(1.75, 5, 6.95) },
      { min: w(-2.6, -6, 0), max: w(2.6, 10.2, 0.88) },
    ];
  },

  readouts(M) {
    const st = M.state;
    const pose = this.pose(M);
    const rows = [
      ["Arm", fmt(deg(pose.th), 1), "°"],
      ["Weight swing", fmt(deg(pose.ph), 1), "°"],
      ["Winding", fmtInt((st.mode === "winding" ? st.wind : st.mode === "rest" ? 0 : 1) * 100), "%"],
      ["Drum turns", fmt(Math.abs(st.drum || 0) / TAU, 1), ""],
      ["Arm ratio", fmt(LL / LS, 2), ": 1"],
      ["Weight energy", fmt((M.ctrl.cw * PH.GRAVITY * (LS * (1 - Math.sin(TH0)))) / 1000, 0), "kJ"],
    ];
    if (st.sim && st.flight) {
      const v = st.sim.release.v;
      const ke = 0.5 * M.ammo.mass * (v[1] ** 2 + v[2] ** 2);
      rows.push(["Launch angle", fmt(deg(Math.atan2(v[2], -v[1])), 1), "°"], ["Efficiency", fmt((ke / (M.ctrl.cw * PH.GRAVITY * LS * (1 - Math.sin(TH0)))) * 100, 0), "%"], ["Release at", fmt(st.sim.release.t - TRIG, 2), "s"]);
    }
    return rows;
  },
};

const prongDir = (th, deg0) => {
  const a = th + rad(deg0) * 0.9;
  return [0, Math.cos(a), Math.sin(a)];
};

function drawArm(B, th, prong) {
  const d = armDir(th);
  const n = armNrm(th);
  const cuts = [];
  for (const s of BANDS) cuts.push(s - 0.08, s + 0.08);
  const edges = [ARM[0][0], ...cuts, LL];
  for (let i = 0; i < edges.length - 1; i++) {
    const s0 = edges[i], s1 = edges[i + 1];
    const isBand = i % 2 === 1;
    const sec = sectionAt((s0 + s1) / 2);
    const grow = isBand ? 0.06 : 0;
    const width = sec[2] + grow, height = sec[3] + grow;
    const a = onArm(th, s0), b = onArm(th, s1);
    const opts = isBand ? { w: width * S, h: height * S, up: n, mat: "iron", sys: "arm", tone: "hi", crease: "lo", nails: [{ s: 0.08 * S, face: "u", x: 0 }] } : { w: width * S, h: height * S, up: n, mat: "oak", sys: "arm", grain: s1 - s0 > 0.6 ? 2 : 0, nails: s0 < 0 && s1 > 0 ? [] : [] };
    B.beam(`arm${i}`, w(...a), w(...b), opts);
  }
  // Iron tip cap, release prong, sling eye, winch eye, trigger ring, hub boss.
  const tip = onArm(th, LL);
  B.beam("arm.tipcap", w(...onArm(th, LL - 0.12)), w(...onArm(th, LL + 0.04)), { w: 0.36 * S, h: 0.38 * S, up: n, mat: "iron", sys: "sling", tone: "hi" });
  const pd = prongDir(th, prong);
  B.cyl("arm.prong", w(...add(tip, mul(d, 0.04))), w(...add(tip, mul(pd, 0.55))), 0.045 * S, { mat: "iron", sys: "sling", tone: "hi" });
  B.ball("arm.prongtip", w(...add(tip, mul(pd, 0.55))), 0.06 * S, { mat: "iron", sys: "sling" });
  const eye = onArm(th, LL - 0.3, -0.2);
  B.ring("arm.slingeye", w(...add(eye, [-0.04, 0, 0])), w(...add(eye, [0.04, 0, 0])), 0.05 * S, 0.1 * S, { mat: "iron", sys: "sling" });
  const we = onArm(th, EYE_S, -0.24);
  B.ring("arm.winchEye", w(...add(we, [-0.05, 0, 0])), w(...add(we, [0.05, 0, 0])), 0.06 * S, 0.12 * S, { mat: "iron", sys: "winch" });
  const ring = onArm(th, RING_S, -0.24);
  B.ring("arm.triggerRing", w(...add(ring, [-0.04, 0, 0])), w(...add(ring, [0.04, 0, 0])), 0.07 * S, 0.13 * S, { mat: "iron", sys: "trigger" });
  B.cyl("arm.boss+", w(0.37, 0, ZP), w(0.44, 0, ZP), 0.26 * S, { mat: "iron", sys: "arm", bolts: [{ s: 0.07 * S, r: 0.19 * S, count: 6, phase: th }] });
  B.cyl("arm.boss-", w(-0.44, 0, ZP), w(-0.37, 0, ZP), 0.26 * S, { mat: "iron", sys: "arm" });
  // Hinge pin through the short end and both hanger straps.
  const H = hingeAt(th);
  for (const [x0, x1, part] of [[0.27, 0.36, "pin"], [0.5, 0.6, "pin"], [-0.36, -0.27, "pin"], [-0.6, -0.5, "pin"]]) B.cyl(`hinge.${part}${x0}`, w(H[0] + x0, H[1], H[2]), w(H[0] + x1, H[1], H[2]), 0.09 * S, { mat: "iron", sys: "cw", faceRing: x0 > 0.4 ? [{ s: (x1 - x0) * S, r: 0.05 * S }] : undefined });
}

function drawWeight(B, th, ph, mass) {
  const H = hingeAt(th);
  const down = [0, Math.sin(ph), -Math.cos(ph)];
  const fwd = [0, Math.cos(ph), Math.sin(ph)];
  const at = (x, f, dn) => add(add(add(H, [x, 0, 0]), mul(fwd, f)), mul(down, dn));
  const o = { mat: "oak", sys: "cw" };
  // Hanger straps from the hinge to the yoke.
  for (const x of [-0.43, 0.43]) B.beam(`cw.hanger${x}`, w(...at(x, 0, -0.08)), w(...at(x, 0, 1.08)), { w: 0.14 * S, h: 0.2 * S, up: fwd, mat: "iron", sys: "cw", tone: "hi", nails: [{ s: 0.95 * S, face: x > 0 ? "u" : "-u", x: 0 }] });
  B.beam("cw.yoke", w(...at(-1.18, 0, 1.2)), w(...at(1.18, 0, 1.2)), { w: 0.24 * S, h: 0.24 * S, up: mul(down, -1), ...o, grain: 1 });
  const top = 1.32, bot = 2.75, hx = 1.1, hf = 0.95, t = 0.1;
  // Walls (in the box frame: u = fwd, v = up), floor, corner posts.
  const scaleF = { o: [H[0] * S, H[1] * S, H[2] * S], a: [1, 0, 0], u: fwd, v: mul(down, -1) };
  const prism = (id, x0, x1, f0, f1, d0, d1, mat = "oak", extra = {}) => {
    const poly = [[f0 * S, -d1 * S], [f1 * S, -d1 * S], [f1 * S, -d0 * S], [f0 * S, -d0 * S]];
    B.prism(id, scaleF, poly, x0 * S, x1 * S, { mat, sys: "cw", tone: "hi", ...extra });
  };
  const plankLines = (x, f0, f1, d0, d1) => {
    const lines = [];
    for (let dd = d0 + 0.36; dd < d1 - 0.1; dd += 0.36) lines.push(k.pathOf([B.at(w(...at(x, f0, dd))), B.at(w(...at(x, f1, dd)))]));
    return B.L(lines.join(""), { tone: "faint" });
  };
  const strap = (x, f0, f1, dd) => B.L(k.pathOf([B.at(w(...at(x, f0, dd))), B.at(w(...at(x, f1, dd)))]), { tone: "hi" });
  prism("cw.floor", -hx, hx, -hf, hf, bot - 0.12, bot, "oak");
  prism("cw.wallFar", -hx, -hx + t, -hf, hf, top, bot, "oak");
  prism("cw.wallBack", -hx + t, hx - t, -hf, -hf + t, top, bot, "oak");
  prism("cw.wallFront", -hx + t, hx - t, hf - t, hf, top, bot, "oak");
  prism("cw.wallNear", hx - t, hx, -hf, hf, top, bot, "oak", { inner: plankLines(hx, -hf, hf, top, bot), over: strap(hx, -hf, hf, top + 0.18) + strap(hx, -hf, hf, bot - 0.18) + B.D([-0.7, 0, 0.7].flatMap((f) => [B.at(w(...at(hx, f, top + 0.18))), B.at(w(...at(hx, f, bot - 0.18)))]), { size: 0.55, tone: "hi" }) });
  for (const [x, f] of [[-hx, -hf], [hx, -hf], [-hx, hf], [hx, hf]]) prism(`cw.corner${x}${f}`, x - 0.07, x + 0.07, f - 0.07, f + 0.07, top - 0.06, bot + 0.04, "iron", { crease: "lo" });
  // Stone fill: its depth is the weight divided by the box's floor area and rubble density.
  const depth = clamp(mass / (1700 * (2 * hx - 2 * t) * (2 * hf - 2 * t)), 0.15, bot - top - 0.12);
  const fillTop = bot - 0.12 - depth;
  prism("cw.fill", -hx + t, hx - t, -hf + t, hf - t, fillTop, bot - 0.12, "granite", { tone: "mid" });
  const R = rng(5);
  for (let i = 0; i < 6; i++) {
    const x = -hx + 0.3 + R() * (2 * hx - 0.6);
    const f = -hf + 0.3 + R() * (2 * hf - 0.6);
    const rr = 0.13 + R() * 0.08;
    B.ball(`cw.stone${i}`, w(...at(x, f, fillTop - rr * 0.92)), rr * S, { mat: "granite", sys: "cw", tone: "hi" });
  }
}

function drawSling(B, M, pose, tip, prongTip) {
  const r = M.ammo.radius;
  const P = [0, pose.py, pose.pz];
  const dir = unit(sub(P, tip));
  const side = [1, 0, 0];
  const pr = Math.max(r, 0.16) * 1.06;
  const L = M.ctrl.sling;
  const fixed = onArm(pose.th, LL - 0.3, -0.2);
  const slack = pose.released;
  const leftEnd = add(P, mul(side, -pr * 0.9));
  const rightEnd = add(P, mul(side, pr * 0.9));
  if (slack) {
    // The loop has slipped off the prong: the empty pouch trails on the fixed cord.
    const pouch = add(fixed, mul(dir, L));
    B.rope("sling.fixed", [w(...fixed), w(...pouch)], 0.035 * S, { sys: "sling", maxLength: 40 });
    const loose = add(pouch, mul(unit(add(dir, [0, 0.3, -0.6])), L * 0.42));
    B.rope("sling.loose", [w(...pouch), w(...lerp(pouch, loose, 0.5)), w(...loose)], 0.035 * S, { sys: "sling", maxLength: 40 });
    B.turned("sling.pouch", G.frameAlong(w(...pouch), dir), [[-0.02 * S, 0.12 * S], [0.06 * S, 0.1 * S, 1], [0.12 * S, 0.02 * S]], { mat: "hide", sys: "sling" });
    return;
  }
  B.rope("sling.fixed", [w(...fixed), w(...leftEnd)], 0.035 * S, { sys: "sling", maxLength: 40 });
  B.rope("sling.loop", [w(...prongTip), w(...rightEnd)], 0.035 * S, { sys: "sling", maxLength: 40 });
  B.ring("sling.ring", w(...add(prongTip, [-0.035, 0, 0])), w(...add(prongTip, [0.035, 0, 0])), 0.05 * S, 0.09 * S, { mat: "iron", sys: "sling" });
  // Leather pouch cupping the ball on the side away from the arm.
  const toward = B.V[0] * dir[0] + B.V[1] * dir[1] + B.V[2] * dir[2];
  const Pw = w(...P);
  B.turned("sling.pouch", G.frameAlong(Pw, dir), [[-0.25 * pr * S, pr * S], [0.25 * pr * S, pr * 0.97 * S, 1], [0.7 * pr * S, pr * 0.72 * S, 1], [1.05 * pr * S, pr * 0.2 * S]], { mat: "hide", sys: "sling", bias: toward > 0 ? r * S : -r * S, key: B.V[0] * Pw[0] + B.V[1] * Pw[1] + B.V[2] * Pw[2] + (toward > 0 ? 0.6 : -0.6) * r * S });
  if (pose.proj) {
    let c = P;
    if (pose.loading !== undefined && pose.loading < 1) {
      const from = [PILE_POS(M)[0], PILE_POS(M)[1], 0.6];
      const u = pose.loading;
      c = lerp(from, P, u);
      c[2] += Math.sin(u * Math.PI) * 1.2;
    }
    looks.draw(M.ammo.look, B, "proj", w(...c), r * S, { seed: 5, sys: "sling", axis: [0, 0, 1], lit: false });
  }
}
const PILE_POS = (M) => {
  const p = PILE[M.ammo.id === "pot" ? "pot" : M.ammo.id === "rubble" ? "rubble" : "granite"];
  return [p[0][0], p[0][1]];
};

function drawWindlass(B, turned, pose, st) {
  const c = w(0, DRUM.y, DRUM.z);
  const o = { sys: "winch" };
  // Drum with rope coils, ratchet wheel and the near hand-wheel.
  B.cyl("winch.drum", w(-1.2, DRUM.y, DRUM.z), w(0.84, DRUM.y, DRUM.z), DRUM.r * S, { mat: "oak", ...o, F: { o: w(-1.2, DRUM.y, DRUM.z), a: [1, 0, 0], u: [0, Math.cos(turned), Math.sin(turned)], v: [0, -Math.sin(turned), Math.cos(turned)] }, ribs: { count: 18, phase: turned } });
  const coils = Math.min(9, 1 + Math.round(Math.abs(turned) / TAU * 1.6));
  B.cyl("winch.coil", w(-0.2 - coils * 0.06, DRUM.y, DRUM.z), w(-0.2 + coils * 0.06, DRUM.y, DRUM.z), (DRUM.r + 0.035) * S, { mat: "rope", ...o, ribs: { count: 30, twist: 0.4, phase: turned } });
  const RF = { o: w(0.84, DRUM.y, DRUM.z), a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] };
  B.toothed("winch.ratchet", RF, polySaw(0.4 * S, 0.5 * S, 16, -turned), 0, 0.12 * S, { mat: "iron", ...o, tone: "hi" });
  B.cyl("winch.ratchetHub", w(0.96, DRUM.y, DRUM.z), w(1.2, DRUM.y, DRUM.z), 0.2 * S, { mat: "oak", ...o });
  // Pawl rides the teeth: it lifts once per tooth as the drum turns.
  const tooth = ((turned / (TAU / 16)) % 1 + 1) % 1;
  const lift = 0.16 * (1 - tooth);
  const pivotP = [1.02, DRUM.y + 0.55, DRUM.z + 0.55];
  const tipP = [1.02, DRUM.y + 0.18, DRUM.z + 0.5 + lift];
  B.beam("winch.pawl", w(...pivotP), w(...tipP), { w: 0.07 * S, h: 0.1 * S, up: [0, 0, 1], mat: "iron", ...o, tone: "hi" });
  B.cyl("winch.pawlPin", w(0.96, pivotP[1], pivotP[2]), w(1.27, pivotP[1], pivotP[2]), 0.04 * S, { mat: "iron", ...o });
  const WF = { o: w(2.08, DRUM.y, DRUM.z), a: [1, 0, 0], u: [0, Math.cos(turned), Math.sin(turned)], v: [0, -Math.sin(turned), Math.cos(turned)] };
  B.wheel("winch.wheel", WF, { R: 1.05 * S, rim: 0.12 * S, width: 0.12 * S, spokes: 6, hub: 0.17 * S, hubLen: 0.3 * S, phase: 0, segments: 14, spokeW: 0.09 * S, mat: "oak", sys: "winch", hubBands: false });
  for (let i = 0; i < 6; i++) {
    const a = ((i + 0.5) / 6) * TAU;
    const dirv = [0, Math.cos(a) * Math.cos(turned) - Math.sin(a) * Math.sin(turned), Math.cos(a) * Math.sin(turned) + Math.sin(a) * Math.cos(turned)];
    const from = add([2.08, DRUM.y, DRUM.z], mul(dirv, 1.05));
    B.cyl(`winch.handle${i}`, w(...from), w(...add(from, mul(dirv, 0.32))), 0.045 * S, { mat: "oak", ...o, tone: "hi" });
  }
  // Far end: a cross of hand-spikes.
  for (let i = 0; i < 2; i++) {
    const a = turned + (i * Math.PI) / 2;
    const dv = [0, Math.cos(a), Math.sin(a)];
    B.cyl(`winch.spike${i}`, w(...add([-2.0, DRUM.y, DRUM.z], mul(dv, -0.75))), w(...add([-2.0, DRUM.y, DRUM.z], mul(dv, 0.75))), 0.05 * S, { mat: "oak", ...o });
  }
  // The winch rope: to the arm while winding, else lying slack on the trough.
  const top = [0, DRUM.y, DRUM.z + DRUM.r];
  if (pose.hook === "arm") {
    const eye = onArm(pose.th, EYE_S, -0.24);
    B.rope("winch.rope", [w(...top), w(...eye)], 0.04 * S, { ...o, maxLength: 30 });
    B.ball("winch.hook", w(...add(eye, [0, 0.02, -0.08])), 0.07 * S, { mat: "iron", ...o });
  } else {
    const end = [0.1, DRUM.y - 1.9, ZT + 0.05];
    B.rope("winch.rope", [w(...top), w(0, DRUM.y - 0.5, ZT + 0.35), w(...end)], 0.04 * S, { ...o, maxLength: 30 });
    B.ball("winch.hook", w(...add(end, [0, -0.06, 0.03])), 0.07 * S, { mat: "iron", ...o });
  }
}

function drawTrigger(B, pose) {
  // The sear: an iron hook on a pin; tripped, it swings forward and lets the ring go.
  const open = pose.sear;
  const a = rad(-12 + open * 70);
  const piv = [0, 6.4, 0.86];
  const up = [0, -Math.sin(a), Math.cos(a)];
  const fw = [0, Math.cos(a), Math.sin(a)];
  const top = add(piv, mul(up, 0.34));
  B.beam("trigger.sear", w(...add(piv, mul(up, -0.02))), w(...top), { w: 0.09 * S, h: 0.07 * S, up: fw, mat: "iron", sys: "trigger", tone: "hi" });
  B.beam("trigger.hook", w(...top), w(...add(top, mul(fw, -0.13))), { w: 0.09 * S, h: 0.06 * S, up: up, mat: "iron", sys: "trigger", tone: "hi" });
  const lever = add(piv, mul(fw, 0.28));
  B.beam("trigger.lever", w(...add(piv, mul(fw, 0.02))), w(...lever), { w: 0.07 * S, h: 0.06 * S, up, mat: "iron", sys: "trigger" });
  const stake = [2.75, 6.6, 0.45];
  const sag = lerp(lever, stake, 0.5);
  sag[2] -= open > 0.5 ? 0.05 : 0.18;
  B.rope("trigger.lanyard", [w(...lever), w(...sag), w(...stake)], 0.025 * S, { sys: "trigger", maxLength: 40, twist: false });
}

function drawPile(B, M, pose) {
  const loaded = pose.proj || pose.released;
  const id = M.ammo.id;
  const lit = (kind) => kind === id;
  PILE.granite.forEach(([x, y, z], i) => {
    if (id === "granite" && pose.proj && i === 3) return;
    looks.stone(B, `pile.g${i}`, w(x, y, z), 0.21 * S, { mat: "granite", cls: lit("granite") ? "sel" : undefined, seed: i + 2 });
  });
  PILE.pot.forEach(([x, y], i) => {
    if (id === "pot" && pose.proj && i === 0) return;
    looks.pot(B, `pile.p${i}`, w(x, y, 0.2), 0.2 * S, { cls: lit("pot") ? "sel" : undefined, axis: [0, 0, 1], wick: true });
  });
  if (!(id === "rubble" && pose.proj)) looks.cluster(B, "pile.r", w(3.3, 4.0, 0.31), 0.31 * S, { cls: lit("rubble") ? "sel" : undefined, seed: 4 });
}

function drawStrobe(B, M, sim, now) {
  const lines = [];
  const pts = [];
  const step = 0.09;
  for (let t = TRIG; t <= Math.min(now, sim.release.t + 0.6); t += step) {
    const f = sim.rec.at(t);
    const tip = onArm(f.th, LL);
    const sEnd = onArm(f.th, -LS);
    lines.push(k.pathOf([B.at(w(...sEnd)), B.at(w(...tip))]));
    lines.push(k.pathOf([B.at(w(...tip)), B.at(w(0, f.py, f.pz))]));
    const c = cwAt(f.th, f.ph);
    lines.push(k.pathOf([B.at(w(...hingeAt(f.th))), B.at(w(...c))]));
    pts.push(B.at(w(0, f.py, f.pz)));
  }
  const path = [];
  for (let t = TRIG; t <= Math.min(now, sim.release.t); t += 1 / 120) {
    const f = sim.rec.at(t);
    path.push(B.at(w(0.02, f.py, f.pz)));
  }
  const svg = B.L(lines.join(""), { tone: "lo" }) + (path.length > 1 ? `<path class="iso-line" data-tone="lit" style="stroke:var(--accent);stroke-width:1.2px" d="${k.pathOf(path)}"/>` : "") + B.D(pts, { size: 1.6, tone: "mid" });
  B.marks("strobe", svg, [w(0, 0, 8)], { r: 400, layer: 6 });
}

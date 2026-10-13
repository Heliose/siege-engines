// Traction trebuchet: the Chinese pao (from the 4th c. BC), the mangonel of the Byzantines and Arabs
// (from the 6th c. AD). A crew hauls on many ropes hanging from the short end of a pivoted pole beam;
// the long end whips over and a sling on a prong flings the stone. Authored in metres (S converts).
//
// TRUTH (metres, kilograms, newtons)
//   Frame: four-legged tower, axle 4.2 m up, legs splayed from 1.5 × 1.1 m at the cap to 3.0 × 3.5 m
//   at the soles; open front so the ropes pass between the front legs; a padded gallows at the rear
//   on which the beam rests (beam at −40°, tip 0.5 m off the ground).
//   Beam: 7.0 m bundle of three poles (two lower poles run tip to yoke, the upper pole stops at
//   3.3 m), two oak splints across the hub and short arm, rope lashings, iron hub straps, an
//   iron-bound oak yoke at the short end with six iron eyes. Long arm 5.75 m, short arm 1.25 m,
//   ratio 4.6 : 1. Mass and inertia are integrated from the drawn poles: 313 kg, centre of mass
//   0.66 m on the long side, I ≈ 1050 kg·m² about it.
//   Crew: 10–60 pullers in ranks of eight in front of the machine, one rope each, tied to the
//   yoke eyes. Each rope is a fixed length; a puller's hands travel a straight path down from
//   2.1 m toward 0.3 m, so where the hands are follows from the beam angle (≈ 1.65 m of travel).
//   Tension per rope = pull × human ramp (0.16 s rise, held ≈ 1.2 s) × (1 − rope speed / 5.5 m/s),
//   fading as the hands bottom out; a rope running back out is held at 45 % of the pull while the
//   beam goes over (22 % as it drops back). Generalised force on the beam: Σ T (∂A/∂θ · d) over
//   every rope (A its eye, d its direction). Crew work = ∫ Σ T · rope speed dt.
//   Sling: PH.linkage with arm angle + sling angle; the stone first slides along the sling board,
//   lifts, whips round and the loop slips off the prong at the release angle (as the trebuchet).
//   After release the beam swings on, the crew brakes it on the ropes and it drops back onto the
//   padded gallows (dust, thud); the empty pouch is a damped pendulum that lands and lies.
//   Defaults (33 × 300 N, 5 kg stone, 4.5 m sling, 14° prong): 36 m/s at 43°, 123 m (hits the
//   wall at 120 m), crew work 7.8 kJ, peak pull 8.9 kN, efficiency ≈ 40 %. 60 × 300 N: 46 m/s,
//   190 m; 60 × 400 N with a fire pot: 58 m/s, 209 m. 10 × 300 N: an 8 m/s near-vertical lob that
//   falls back by the machine (the beam is too heavy for ten); 10 × 200 N cannot lift the stone.
//
// PARTS (≈ 95 for the machine + one rope and one toggle per puller)
//   base: 2 soles (iron straps), rear tie, 2 gallows posts, 2 gallows knees, gallows bar, hide
//   pad, 3 sling-board planks
//   frame: 4 legs with level feet and heads, 4 iron foot shoes, 2 cap beams, 4 knee braces,
//   2 side girts, 4 side diagonals, front low tie
//   axle & bearings: 2 bearing blocks, 2 iron cap straps, 4 wedges, oak axle (2 pieces), 2 axle
//   bands, 2 washers, 2 iron journals, 2 linchpins, 2 iron hub straps
//   beam: 10 bundle segments (2–5 poles and splints each) with 7 rope lashings, yoke bar (3 oak
//   pieces, 2 iron straps, 2 iron end caps), 6 iron eyes, tip ferrule, sling eye, prong, knob
//   sling: fixed cord, release loop, prong ring, leather pouch
//   crew: one rope + one oak toggle per puller, a stake and ground ring at each station
//   ammunition: stone tray (5 pieces) with stones, fire pots and plugged lime pots on straw rings
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { add, sub, mul, dot, cross, unit, len, lerp, clamp, rad, deg, ease, smoothstep, fmt, fmtInt, TAU, rng } from "../engine/vec.js";
import * as PH from "../engine/physics.js";
import * as looks from "../engine/looks.js";
import { frameFrom, framePoint, polyRect, polyCircle, extrudeAlong } from "../engine/geo.js";
import { shapeOf } from "../engine/scene.js";
import { createFx } from "../engine/fx.js";

const U = 0.035;
const S = 1 / U;
const w = (x, y, z) => [x * S, y * S, z * S];
const W = (p) => [p[0] * S, p[1] * S, p[2] * S];
const X = [1, 0, 0];
const Y = [0, 1, 0];
const Z = [0, 0, 1];

// ---------------- dimensions ----------------
const ZP = 4.2; // axle height
const LS = 1.25; // short arm (to the yoke)
const LL = 5.75; // long arm
const TH0 = rad(-40); // beam at rest on the gallows
const ZB = 0.05; // sling-board top
const PRE = 0.25; // crew takes the strain before the heave
const VMAX = 5.5; // hand speed at which a puller can no longer pull, m/s
const HOLD = 0.45; // fraction of the pull the crew holds against a running rope
const RHO = 600; // seasoned elm and ash poles, kg/m³
const CAP_X = 0.75; // cap beams
const SOLE_X = 1.5;
const FOOT_Y = 1.75;
const TOP_Y = 0.55;
const Z_SOLE = 0.3;
const Z_CAP = 3.72;
const YOKE = { s0: -LS - 0.08, s1: -LS + 0.08, v0: -0.13, v1: 0.15, half: 0.56 };
const EYES = [0.26, 0.4, 0.54];
const EYE_V = YOKE.v0 - 0.045;
const GAL_Y = 3.0;
const HAND_Z0 = 2.1;
const HAND_Z1 = 0.3;
const STOW = 1.4;
const BOARD_Y = [-1.55, 3.3];
// Height of an empty pouch resting on the sling board or the ground.
const restZ = (y) => (y > BOARD_Y[0] && y < BOARD_Y[1] ? ZB : 0) + 0.075;
const REAR_Y = 5.45; // a sling flung back lies folded short of the plinth's rear edge // after the beam settles the crew lets the ropes go slack

const armDir = (th) => [0, Math.cos(th), Math.sin(th)];
const armNrm = (th) => [0, -Math.sin(th), Math.cos(th)];
// A point on the beam: s along the arm, v along its normal, u across (x).
const onArm = (th, s, v = 0, u = 0) => [u, Math.cos(th) * s - Math.sin(th) * v, ZP + Math.sin(th) * s + Math.cos(th) * v];

// ---------------- the beam bundle ----------------
// Round poles: [u, v, s0, s1, rHub, rEnd, taperFrom]
const POLES = [
  { id: "pl", u: -0.09, v: -0.05, s0: YOKE.s1, s1: LL - 0.16, r0: 0.088, r1: 0.042 },
  { id: "pr", u: 0.09, v: -0.05, s0: YOKE.s1, s1: LL - 0.16, r0: 0.088, r1: 0.042 },
  { id: "pu", u: 0, v: 0.098, s0: YOKE.s1, s1: 3.34, r0: 0.082, r1: 0.06 },
];
// Squared oak splints either side across the hub and short arm.
const SPLINTS = [
  { id: "sl", u0: -0.27, u1: -0.185, v0: -0.1, v1: 0.11, s0: YOKE.s1, s1: 0.94 },
  { id: "sr", u0: 0.185, u1: 0.27, v0: -0.1, v1: 0.11, s0: YOKE.s1, s1: 0.94 },
];
const poleR = (p, s) => (s <= 0.4 ? p.r0 : p.r0 + (p.r1 - p.r0) * clamp((s - 0.4) / (p.s1 - 0.4), 0, 1));
// Lashings: rope bands; iron straps at the hub.
const BANDS = [
  { s: -0.75, w: 0.13, mat: "rope" },
  { s: -0.22, w: 0.07, mat: "iron" },
  { s: 0.22, w: 0.07, mat: "iron" },
  { s: 1.0, w: 0.13, mat: "rope" },
  { s: 1.8, w: 0.12, mat: "rope" },
  { s: 2.6, w: 0.12, mat: "rope" },
  { s: 3.4, w: 0.12, mat: "rope" },
  { s: 4.25, w: 0.11, mat: "rope" },
  { s: 5.05, w: 0.1, mat: "rope" },
];
const FERRULE = [LL - 0.16, LL];

function massProps() {
  let m = 0, ms = 0, mss = 0;
  const addMass = (dm, s, r2 = 0) => {
    m += dm;
    ms += dm * s;
    mss += dm * (s * s + r2);
  };
  const ds = 0.01;
  for (const p of POLES) for (let s = p.s0; s < p.s1; s += ds) {
    const r = poleR(p, s + ds / 2);
    addMass(RHO * Math.PI * r * r * ds, s + ds / 2, p.u * p.u + p.v * p.v);
  }
  for (const sp of SPLINTS) {
    const dm = 700 * (sp.u1 - sp.u0) * (sp.v1 - sp.v0) * (sp.s1 - sp.s0);
    addMass(dm, (sp.s0 + sp.s1) / 2 + 0, ((sp.s1 - sp.s0) ** 2) / 12);
  }
  const yokeVol = (YOKE.s1 - YOKE.s0) * (YOKE.v1 - YOKE.v0) * 2 * YOKE.half;
  addMass(720 * yokeVol, -LS, 0.04);
  addMass(22, -LS); // iron eyes, end caps and straps
  for (const b of BANDS) addMass(b.mat === "iron" ? 4 : 1.2, b.s);
  addMass(6, LL - 0.1); // ferrule, prong, sling eye
  const cg = ms / m;
  return { m, cg, I: mss - m * cg * cg, Ip: mss };
}
const ARM = massProps();

// ---------------- the crew ----------------
function crewLayout(n) {
  const out = [];
  const per = 8;
  let k = 0;
  for (let j = 0; k < n; j++) {
    const count = Math.min(per, n - k);
    const spread = count === per ? 1 : Math.max(0.3, (count - 1) / (per - 1));
    const half = Math.min(1.45, 0.8 + 0.12 * j) * spread;
    for (let i = 0; i < count; i++) {
      const f = count === 1 ? 0 : -1 + (2 * i) / (count - 1);
      out.push({ x: f * half, y: -2.6 - 0.5 * j - (i % 2) * 0.1, rank: j });
      k++;
    }
  }
  return out;
}
const eyeAt = (th, ex) => onArm(th, -LS, EYE_V, ex);
const eyeD = (th) => [0, LS * Math.sin(th) - EYE_V * Math.cos(th), -LS * Math.cos(th) - EYE_V * Math.sin(th)];
const ROPE_CACHE = new Map();
function ropesFor(n) {
  if (ROPE_CACHE.has(n)) return ROPE_CACHE.get(n);
  const crew = crewLayout(n);
  const perEye = new Map();
  const list = crew.map((c, i) => {
    const ax = Math.abs(c.x);
    const e = ax < 0.42 ? 0 : ax < 0.9 ? 1 : 2;
    const side = c.x < 0 ? -1 : 1;
    const ex = side * EYES[e];
    const H0 = [c.x, c.y, HAND_Z0];
    const pd = unit([c.x * 0.05, 0.15, -1]);
    const A0 = eyeAt(TH0, ex);
    const ell = len(sub(H0, A0));
    const sMax = (HAND_Z0 - HAND_Z1) / -pd[2];
    const key = `${side}${e}`;
    const slot = perEye.get(key) || 0;
    perEye.set(key, slot + 1);
    return { i, rank: c.rank, side, eye: e, ex, H0, pd, ell, sMax, slot, foot: [c.x + pd[0] * sMax, c.y + pd[1] * sMax, 0] };
  });
  // Where each rope's toggle hangs (or lies) at rest, its rope dangling from its eye.
  for (const r of list) {
    const count = perEye.get(`${r.side}${r.eye}`);
    const off = (r.slot - (count - 1) / 2) * 0.045;
    const A0 = eyeAt(TH0, r.ex);
    const hz = A0[2] - r.ell;
    if (hz >= 0.08) r.hang = { H: [r.ex + off, A0[1] - 0.03 + Math.abs(off) * 0.4, hz], lying: false };
    else {
      const run = 0.08 - hz;
      r.hang = { H: [r.ex + off * 1.6, A0[1] - run - 0.05, 0.075], lying: true, ground: [r.ex + off * 0.4, A0[1] - 0.02, 0.06] };
    }
  }
  ROPE_CACHE.set(n, list);
  return list;
}
// Hands on a taut rope: s along the puller's path such that |H − A| = ell.
function handOf(r, th) {
  const A = eyeAt(th, r.ex);
  const D = sub(r.H0, A);
  const b = dot(D, r.pd);
  const disc = b * b - dot(D, D) + r.ell * r.ell;
  let s = disc < 0 ? 0 : -b + Math.sqrt(disc);
  const free = s < -1e-4;
  s = Math.max(0, s);
  const bottom = s >= r.sMax;
  s = Math.min(s, r.sMax);
  return { A, H: add(r.H0, mul(r.pd, s)), s, bottom, free };
}
const humanRamp = (t) => smoothstep(0, 0.16, t) * (1 - smoothstep(1.2, 1.7, t));
// Tension in one rope for beam angle th, rate thd at pull time tp (seconds since the heave).
function ropeTension(r, th, thd, tp, pull) {
  const h = handOf(r, th);
  const d = unit(sub(h.H, h.A));
  const lever = dot(eyeD(th), d);
  const v = lever * thd;
  let T = 0;
  if (v >= -0.02) {
    if (!h.free && !h.bottom) T = pull * humanRamp(tp) * Math.max(0, 1 - Math.max(0, v) / VMAX) * (1 - smoothstep(r.sMax - 0.2, r.sMax, h.s));
  } else if (thd > 0 || h.s > 0.02) {
    // The rope runs back out through the crew's hands: they hang on hard while the beam is still
    // going over, and only steady it as it drops back.
    T = pull * (thd > 0 ? HOLD : HOLD * 0.5) * smoothstep(0, 0.4, tp);
  }
  return { T, h, lever, v };
}

// ---------------- the shot ----------------
function simulate(ctrl, ammo) {
  const crew = ctrl.crew;
  const pull = ctrl.pull;
  const Lsl = ctrl.sling;
  const relAngle = rad(ctrl.prong);
  const mp = ammo.mass;
  const r = ammo.radius;
  const zc = ZB + r;
  const ropes = ropesFor(crew);
  const tip = (th) => [LL * Math.cos(th), ZP + LL * Math.sin(th)];
  const psiOf = (th) => Math.PI - Math.asin(clamp((zc - tip(th)[1]) / Lsl, -1, 1));
  const proj = (th, ps) => {
    const t = tip(th);
    return [t[0] + Lsl * Math.cos(ps), t[1] + Lsl * Math.sin(ps)];
  };
  const P3 = (p) => [0, p[0], p[1]];
  const armCg = (th) => [ARM.cg * Math.cos(th), ZP + ARM.cg * Math.sin(th)];
  let Tnow = 0, Pnow = 0;
  const pullForce = (th, thd, t) => {
    let Q = 0, Tt = 0, Pw = 0;
    const tp = t - PRE;
    if (tp <= 0) return { Q, Tt, Pw };
    for (const rp of ropes) {
      const f = ropeTension(rp, th, thd, tp, pull);
      if (!f.T) continue;
      Q += f.T * f.lever;
      Tt += f.T;
      Pw += f.T * f.v;
    }
    return { Q, Tt, Pw };
  };
  const force = (n, damp) => (q, qd, t) => {
    const out = new Array(n).fill(0);
    out[0] = pullForce(q[0], qd[0], t).Q;
    if (damp) {
      out[0] -= damp[0] * qd[0];
      if (n > 1) out[1] -= damp[1] * (qd[1] - qd[0]);
    }
    return out;
  };
  const sys1 = PH.linkage({ n: 1, points: (q) => [{ m: ARM.m, p: P3(armCg(q[0])) }, { m: mp, p: P3(proj(q[0], psiOf(q[0]))) }], bodies: (q) => [{ I: ARM.I, a: q[0] }], force: force(1, [15]) });
  const make2 = (m, damp) => PH.linkage({ n: 2, points: (q) => [{ m: ARM.m, p: P3(armCg(q[0])) }, { m, p: P3(proj(q[0], q[1])) }], bodies: (q) => [{ I: ARM.I, a: q[0] }], force: force(2, damp) });
  const sys2 = make2(mp, [15, 0]);
  const rec = PH.timeline();
  const dt = 1 / 1600;
  let t = 0;
  let work = 0, peak = 0;
  let q = TH0, qd = 0;
  let q2 = null, qd2 = null;
  let lift = null, release = null;
  const bumps = [];
  const push = (th, thd, ps, released, p, wk) => {
    const f = pullForce(th, thd, t);
    rec.push(t, { th, thd, ps, rel: released ? 1 : 0, py: p[0], pz: p[1], T: f.Tt, W: wk });
  };
  const f1 = (tt, y) => {
    const a = sys1.accel([y[0]], [y[1]], tt);
    if (y[0] <= TH0 + 1e-9 && y[1] <= 0 && a[0] < 0) a[0] = 0;
    return [y[1], a[0]];
  };
  push(q, qd, psiOf(q), false, proj(q, psiOf(q)), 0);
  let i = 0;
  // Phase 1: the stone slides along the sling board while the crew heaves.
  while (t < 4) {
    const fNow = pullForce(q, qd, t);
    const y = PH.rk4(f1, t, [q, qd], dt);
    work += Math.max(0, fNow.Pw) * dt;
    peak = Math.max(peak, fNow.Tt);
    q = y[0];
    qd = y[1];
    if (q < TH0) {
      q = TH0;
      qd = Math.max(0, qd);
    }
    t += dt;
    const ps = psiOf(q);
    if (i++ % 6 === 0) push(q, qd, ps, false, proj(q, ps), work);
    if (q <= TH0 + 1e-4) continue;
    const e = 1e-6;
    const psd = ((psiOf(q + e) - psiOf(q - e)) / (2 * e)) * qd;
    const a = sys2.accel([q, ps], [qd, psd], t);
    const h = 1e-3;
    const zAt = (s) => proj(q + qd * s + 0.5 * a[0] * s * s, ps + psd * s + 0.5 * a[1] * s * s)[1];
    const zdd = (zAt(h) - 2 * zAt(0) + zAt(-h)) / (h * h);
    if (zdd > 0 || Math.abs(zc - tip(q)[1]) >= Lsl * 0.998) {
      lift = t;
      q2 = [q, ps];
      qd2 = [qd, psd];
      break;
    }
  }
  const f2 = (sys) => (tt, y) => [y[2], y[3], ...sys.accel(y.slice(0, 2), y.slice(2), tt)];
  // Phase 2: the stone swings round until the loop slips off the prong.
  if (q2) {
    const g2 = f2(sys2);
    while (t < 5) {
      const fNow = pullForce(q2[0], qd2[0], t);
      work += Math.max(0, fNow.Pw) * dt;
      peak = Math.max(peak, fNow.Tt);
      const y = PH.rk4(g2, t, [...q2, ...qd2], dt);
      q2 = y.slice(0, 2);
      qd2 = y.slice(2);
      t += dt;
      if (i++ % 6 === 0) push(q2[0], qd2[0], q2[1], false, proj(q2[0], q2[1]), work);
      if (q2[1] - q2[0] >= TAU - relAngle) {
        const v = sys2.velocity(q2, qd2, 1);
        release = { t, p: proj(q2[0], q2[1]), v: [0, v[1], v[2]], th: q2[0] };
        break;
      }
      if (q2[0] < TH0) break;
    }
  }
  if (!release) {
    // Too weak to whip the sling round: the stone falls out of the pouch where it is.
    const qq = q2 || [q, psiOf(q)];
    const qv = qd2 || [qd, 0];
    const sysD = q2 ? sys2 : null;
    const v = sysD ? sysD.velocity(qq, qv, 1) : [0, 0, 0];
    release = { t, p: proj(qq[0], qq[1]), v: [0, v[1], v[2]], th: qq[0], drop: true };
    q2 = qq;
    qd2 = qv;
  }
  push(q2[0], qd2[0], q2[1], true, release.p, work);
  // Phase 3: the empty sling and the beam swing on; the crew brakes on its ropes and the beam
  // drops back onto the padded gallows.
  // The beam alone (crew braking, gravity, the gallows); the empty pouch is a damped pendulum
  // hung from the moving tip that lands on the board or ground and stops there.
  const sys3 = PH.linkage({ n: 1, points: (q) => [{ m: ARM.m, p: P3(armCg(q[0])) }], bodies: (q) => [{ I: ARM.I, a: q[0] }], force: force(1, [70]) });
  const g3 = (tt, y) => [y[1], sys3.accel([y[0]], [y[1]], tt)[0]];
  let th = q2[0], thd = qd2[0];
  let ph = q2[1], phd = qd2[1];
  let resting = false;
  const end = t + 6.5;
  const h3 = dt * 2;
  let still = 0;
  while (t < end) {
    const fNow = pullForce(th, thd, t);
    work += Math.max(0, fNow.Pw) * h3;
    const thdd = sys3.accel([th], [thd], t)[0];
    const y = PH.rk4(g3, t, [th, thd], h3);
    t += h3;
    th = y[0];
    thd = y[1];
    if (th < TH0) {
      if (thd < -0.25) bumps.push({ t, v: -thd * LL * Math.cos(TH0) });
      th = TH0;
      thd = thd < 0 ? -thd * 0.18 : thd;
    }
    // tip acceleration drives the pendulum
    const aT = [LL * (-Math.sin(th) * thdd - Math.cos(th) * thd * thd), LL * (Math.cos(th) * thdd - Math.sin(th) * thd * thd)];
    const T = tip(th);
    if (!resting) {
      const et = [-Math.sin(ph), Math.cos(ph)];
      const phdd = (-PH.GRAVITY * Math.cos(ph) - (aT[0] * et[0] + aT[1] * et[1])) / Lsl - 1.2 * phd;
      phd += phdd * h3;
      ph += phd * h3;
    }
    let p = [T[0] + Lsl * Math.cos(ph), T[1] + Lsl * Math.sin(ph)];
    const zg = restZ(p[0]);
    if (resting || p[1] < zg) {
      // The pouch lies out on the side it fell to; a sling flung back lies folded short of the
      // plinth's edge.
      const dy = Math.sqrt(Math.max(0, Lsl * Lsl - (T[1] - zg) ** 2));
      const side = Math.cos(ph) >= 0 ? 1 : -1;
      const yy = side > 0 ? Math.min(T[0] + dy, REAR_Y) : T[0] - dy;
      p = [yy, restZ(yy)];
      // it lifts again only if the tip rises far enough to swing it
      resting = T[1] - p[1] < Lsl * 0.98;
      if (!resting) phd = 0;
      ph = Math.atan2(p[1] - T[1], p[0] - T[0]);
      if (resting) phd = 0;
    }
    // a sling swinging out past the plinth's rear edge crumples back as it comes down
    if (p[0] > REAR_Y) p = [REAR_Y + (p[0] - REAR_Y) * smoothstep(0.1, 2.2, p[1]), p[1]];
    if (i++ % 3 === 0) push(th, thd, ph, true, p, work);
    still = Math.abs(thd) < 0.004 && th < TH0 + 0.002 ? still + h3 : 0;
    if (still > 0.6 && t > release.t + 2.5) break;
  }
  push(th, 0, ph, true, [rec.frames[rec.frames.length - 1].py, rec.frames[rec.frames.length - 1].pz], work);
  const last = rec.frames[rec.frames.length - 1];
  return { rec, lift, release, end: t, final: { th: TH0, ps: last.ps, py: last.py }, work, peak, bumps, ropes, Lsl, pull, crew };
}

// ---------------- pile ----------------
const TRAY = { x: 1.25, y: 3.95, w: 0.66, d: 0.78 };
const PILE = {
  stone: [[1.43, 4.15, 0.127], [1.73, 4.15, 0.127], [1.43, 4.53, 0.127], [1.73, 4.53, 0.127], [1.58, 4.34, 0.26]],
  fire: [[1.42, 5.08], [1.74, 5.2]],
  lime: [[1.3, 5.46], [1.62, 5.6]],
};
// A lime pot is sealed with a pale plaster plug where a fire pot has its tow wick.
function limePlug(B, id, c, r, o = {}) {
  const F = G.frameAlong(add(c, [0, 0, r * 0.95]), Z);
  turnedLite(B, id, F, [[0, r * 0.4], [r * 0.06, r * 0.44], [r * 0.16, r * 0.34], [r * 0.22, r * 0.05]], { mat: "stone", tone: "hi", lit: o.lit, sys: o.sys }, 14);
}
const pileItem = (id) => (id === "fire" ? [...PILE.fire[1], 0.02 + 0.09] : id === "lime" ? [...PILE.lime[1], 0.098] : PILE.stone[4]);

// ---------------- skewed prism (legs with level ends) ----------------
// A polygon in the horizontal (u = x, v = y) plane carried along the leg axis F.a, so both ends
// are level and the legs sit flat on the soles and under the caps. Side tones use true normals.
function skewPrism(F, ring, s0, s1, P) {
  const V = G.viewOf(P);
  const iso = (p) => k.iso(p, P);
  const n = ring.length;
  const capUp = F.a[2] > 0;
  const topVisible = dot(capUp ? Z : mul(Z, -1), V) >= 0;
  const sTop = topVisible ? s1 : s0;
  const sBot = topVisible ? s0 : s1;
  const top = ring.map(([x, y]) => iso(framePoint(F, sTop, x, y)));
  const bot = ring.map(([x, y]) => iso(framePoint(F, sBot, x, y)));
  const normals = ring.map(([ax, ay], i) => {
    const [bx, by] = ring[(i + 1) % n];
    const e = add(mul(F.u, bx - ax), mul(F.v, by - ay));
    let nn = unit(cross(e, F.a));
    const out = add(mul(F.u, by - ay), mul(F.v, -(bx - ax)));
    if (dot(nn, out) < 0) nn = mul(nn, -1);
    return nn;
  });
  const facing = normals.map((nn) => dot(nn, V) > 1e-9);
  const outline = [];
  const crease = [];
  const runs = (want) => {
    const out = [];
    const start = facing.findIndex((f, i) => f !== facing[(i + n - 1) % n]);
    if (start < 0) return facing[0] === want ? [Array.from({ length: n + 1 }, (_, i) => i % n)] : [];
    let run = null;
    for (let step = 0; step < n; step++) {
      const i = (start + step) % n;
      if (facing[i] === want) {
        if (!run) run = [i];
        run.push((i + 1) % n);
      } else if (run) {
        out.push(run);
        run = null;
      }
    }
    if (run) out.push(run);
    return out;
  };
  for (const run of runs(false)) outline.push(k.pathOf(run.map((i) => top[i])));
  for (const run of runs(true)) {
    crease.push(k.pathOf(run.map((i) => top[i])));
    outline.push(k.pathOf(run.map((i) => bot[i])));
  }
  for (let i = 0; i < n; i++) if (facing[(i + n - 1) % n] !== facing[i]) outline.push(k.pathOf([top[i], bot[i]]));
  const buckets = [[], [], [], [], []];
  for (let i = 0; i < n; i++) {
    if (!facing[i]) continue;
    const j = (i + 1) % n;
    buckets[G.toneOf(normals[i], P)].push(k.pathOf([top[i], top[j], bot[j], bot[i]], true));
  }
  buckets[G.toneOf(topVisible ? Z : mul(Z, -1), P)].push(k.pathOf(top, true));
  const fill = k.pathOf(G.hullOf([...top, ...bot]), true);
  const pts = [];
  for (const [x, y] of ring) pts.push(framePoint(F, s0, x, y), framePoint(F, s1, x, y));
  return { paths: { fill, outline: outline.join(""), crease: crease.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((l) => l.join("")) }, pts, normals };
}
// A leg from a level foot to a level head (metres), square section wd.
function leg(B, id, foot, head, wd, o) {
  const F = { o: W(foot), a: W(sub(head, foot)).map((c) => c / ((head[2] - foot[2]) * S)), u: X, v: Y };
  const ring = polyRect(wd * S, wd * S);
  const { paths, pts, normals } = skewPrism(F, ring, 0, (head[2] - foot[2]) * S, B.P);
  const grain = [];
  const V = B.V;
  const faces = [[X, wd / 2, Y], [mul(X, -1), -wd / 2, Y], [Y, wd / 2, X], [mul(Y, -1), -wd / 2, X]];
  for (const [nrm, off, along] of faces) {
    if (dot(nrm, V) < 0.05) continue;
    for (const f of [-0.3, 0.25]) {
      const base = add(mul(nrm[0] ? X : Y, off), mul(along, f * wd * 0.5));
      grain.push(k.pathOf([B.at(add(W(foot), W(base))), B.at(add(W(head), W(base)))]));
    }
  }
  const shape = shapeOf(pts, { axes: [Z, ...normals], edges: [unit(sub(head, foot)), X, Y] });
  B.raw(id, B.S(paths, { tone: o.tone || "hi", inner: B.L(grain.join(""), { tone: "faint" }), over: o.over || "" }), shape, o);
}

// ---------------- composite parts (several solids depth-sorted inside one part) ----------------
function piece(B, F, poly, s0, s1, o = {}) {
  const paths = extrudeAlong(F, poly, s0, s1, B.P);
  const pts = [];
  for (const [x, y] of poly) pts.push(framePoint(F, s0, x, y), framePoint(F, s1, x, y));
  let c = [0, 0, 0];
  for (const p of pts) c = add(c, p);
  c = mul(c, 1 / pts.length);
  return { svg: `<g data-mat="${o.mat || "wood"}">${B.S(paths, o)}</g>`, pts, depth: dot(c, B.V) + (o.bias || 0) };
}
function composite(B, id, items, axes, o) {
  items.sort((a, b) => a.depth - b.depth);
  const pts = items.flatMap((it) => it.pts);
  B.raw(id, items.map((it) => it.svg).join(""), shapeOf(pts, { axes, edges: axes }), o);
}

// A small turned part with few facets (pouches, plugs): the lathe at 14–18 steps.
function turnedLite(B, id, F, profile, o = {}, steps = 16) {
  const paths = G.solidOf(profile, F, B.P, { steps, smooth: false });
  const pts = [];
  for (const [s, r] of profile) for (let i = 0; i < 8; i++) pts.push(framePoint(F, s, r * 1.05 * Math.cos((i / 8) * TAU), r * 1.05 * Math.sin((i / 8) * TAU)));
  B.raw(id, B.S(paths, o), shapeOf(pts, { axes: [F.a], edges: [F.a, F.u, F.v] }), o);
}
// A leather pouch: a shallow cup of two short facets, open toward the stone.
function pouchCup(B, id, c, dir, pr, o = {}) {
  const F = G.frameAlong(c, dir);
  const items = [
    piece(B, F, polyCircle(pr, 10), -0.2 * pr, 0.32 * pr, { mat: "hide", tone: "hi" }),
    piece(B, F, polyCircle(pr * 0.74, 10), 0.32 * pr, 0.72 * pr, { mat: "hide", tone: "hi" }),
    piece(B, F, polyCircle(pr * 0.36, 8), 0.72 * pr, 0.92 * pr, { mat: "hide", tone: "hi" }),
  ];
  const near = dot(dir, B.V) < 0;
  items.forEach((it, i) => (it.depth = near ? -i : i));
  composite(B, id, items, [F.a, F.u, F.v], { mat: "hide", ...o });
}
// A small iron eye: a short ring seen as a disc with a dark bore.
function eyeSvg(B, c, axis, rIn, rOut, t) {
  const F = G.frameAlong(sub(c, mul(axis, t / 2)), axis);
  const paths = extrudeAlong(F, polyCircle(rOut, 8), 0, t, B.P);
  const face = dot(axis, B.V) >= 0 ? add(c, mul(axis, t / 2)) : sub(c, mul(axis, t / 2));
  return `<g data-mat="iron">${B.S(paths, { tone: "hi", crease: "lo", over: B.D([B.at(face)], { size: Math.max(0.5, rIn * B.KS * 0.8), tone: "hi" }) })}</g>`;
}

// 2D convex hull of the bundle cross-section at s, offset by t (for lashings and the ferrule).
function sectionHull(s, t, onlyLower = false) {
  const pts = [];
  for (const p of POLES) {
    if (s < p.s0 - 0.001 || s > p.s1 + 0.001) continue;
    if (onlyLower && p.id === "pu") continue;
    const r = poleR(p, s) + t;
    for (let i = 0; i < 8; i++) pts.push([p.u + r * Math.cos(((i + 0.5) / 8) * TAU), p.v + r * Math.sin(((i + 0.5) / 8) * TAU)]);
  }
  if (!onlyLower) for (const sp of SPLINTS) {
    if (s < sp.s0 || s > sp.s1) continue;
    const c = 0.012;
    pts.push([sp.u0 - t, sp.v0 - t + c], [sp.u0 - t + c, sp.v0 - t], [sp.u1 + t - c, sp.v0 - t], [sp.u1 + t, sp.v0 - t + c], [sp.u1 + t, sp.v1 + t - c], [sp.u1 + t - c, sp.v1 + t], [sp.u0 - t + c, sp.v1 + t], [sp.u0 - t, sp.v1 + t - c]);
  }
  const hull = G.hullOf(pts);
  return hull.map(([x, y]) => [x * S, y * S]);
}

const beamFrame = (th) => ({ o: w(0, 0, ZP), a: armDir(th), u: X, v: armNrm(th) });
const prongDir = (th, p) => armDir(th + rad(p) * 0.9);

function drawBeam(B, th, prong, mini) {
  const F = beamFrame(th);
  const V = B.V;
  const axes = [F.a, F.u, F.v];
  // Segment edges between lashings.
  const cuts = [YOKE.s1];
  for (const b of BANDS) cuts.push(b.s - b.w / 2, b.s + b.w / 2);
  cuts.push(FERRULE[0]);
  const lashing = (b) => {
    const iron = b.mat === "iron";
    const poly = sectionHull(b.s, iron ? 0.014 : 0.024);
    const s0 = (b.s - b.w / 2) * S, s1 = (b.s + b.w / 2) * S;
    let inner = "";
    let over = "";
    const n = poly.length;
    const visible = [];
    for (let j = 0; j < n; j++) {
      const [ax, ay] = poly[j];
      const [bx, by] = poly[(j + 1) % n];
      const nn = add(mul(F.u, by - ay), mul(F.v, -(bx - ax)));
      visible.push(dot(nn, V) > 0);
    }
    const wrapAt = (s) => {
      const segs = [];
      for (let j = 0; j < n; j++) if (visible[j]) segs.push(k.pathOf([B.at(framePoint(F, s, ...poly[j])), B.at(framePoint(F, s, ...poly[(j + 1) % n]))]));
      return segs.join("");
    };
    if (!iron) inner = B.L([0.25, 0.5, 0.75].map((f) => wrapAt(s0 + (s1 - s0) * f)).join(""), { tone: "lo" });
    else {
      const dots = [];
      for (let j = 0; j < n; j += Math.max(1, Math.floor(n / 6))) {
        const [ax, ay] = poly[j];
        const [bx, by] = poly[(j + 1) % n];
        const nn = add(mul(F.u, by - ay), mul(F.v, -(bx - ax)));
        if (dot(nn, V) > 0.25) dots.push(B.at(framePoint(F, (s0 + s1) / 2, (ax + bx) / 2, (ay + by) / 2)));
      }
      over = B.D(dots, { size: 0.5, tone: "hi" });
    }
    return { poly, s0, s1, inner, over, iron };
  };
  const aV = dot(F.a, V);
  for (let i = 0; i < cuts.length; i += 2) {
    const s0 = cuts[i], s1 = cuts[i + 1];
    const mid = (s0 + s1) / 2;
    const items = [];
    // the rope lashing that closes this segment is drawn with it, past the pole ends
    const band = BANDS[i / 2];
    if (band && band.mat === "rope") {
      const L = lashing(band);
      const it = piece(B, F, L.poly, L.s0, L.s1, { mat: "rope", tone: "hi", inner: L.inner });
      it.depth = aV >= 0 ? 1e9 : -1e9;
      items.push(it);
    }
    for (const p of POLES) {
      if (p.s1 <= s0 + 0.001 || p.s0 >= s1 - 0.001) continue;
      const a = Math.max(s0, p.s0), b = Math.min(s1, p.s1);
      const r = poleR(p, mid);
      const PF = { o: framePoint(F, 0, p.u * S, p.v * S), a: F.a, u: F.u, v: F.v };
      items.push(piece(B, PF, polyCircle(r * S, 8, 0.2), a * S, b * S, { mat: "wood", tone: "hi" }));
    }
    for (const sp of SPLINTS) {
      if (sp.s1 <= s0 + 0.001 || sp.s0 >= s1 - 0.001) continue;
      // the splint on the far side of the bundle is hidden behind the poles
      if (Math.sign(sp.u0) * dot(X, V) < -0.4) continue;
      const a = Math.max(s0, sp.s0), b = Math.min(s1, sp.s1);
      const poly = [[sp.u0 * S, sp.v0 * S], [sp.u1 * S, sp.v0 * S], [sp.u1 * S, sp.v1 * S], [sp.u0 * S, sp.v1 * S]];
      items.push(piece(B, F, poly, a * S, b * S, { mat: "oak", tone: "hi" }));
    }
    composite(B, `beam.seg${i / 2}`, items, axes, { sys: "beam", mat: "wood" });
  }
  // Iron hub straps (part of the axle assembly).
  BANDS.forEach((b, i) => {
    if (b.mat !== "iron") return;
    const L = lashing(b);
    B.prism(`beam.band${i}`, F, L.poly, L.s0, L.s1, { mat: "iron", tone: "hi", crease: "lo", over: L.over, sys: "axle" });
  });
  if (mini) return;
  // The yoke: an oak bar across the short end, iron end caps, six iron eyes under it.
  const YF = { o: framePoint(F, -LS * S, 0, 0), a: X, u: F.a, v: F.v };
  const ys = [(YOKE.s0 + LS) * S, (YOKE.s1 + LS) * S];
  const ybar = [[ys[0], YOKE.v0 * S], [ys[1], YOKE.v0 * S], [ys[1], YOKE.v1 * S], [ys[0], YOKE.v1 * S]];
  const capPoly = [[ys[0] - 0.012 * S, (YOKE.v0 - 0.012) * S], [ys[1] + 0.012 * S, (YOKE.v0 - 0.012) * S], [ys[1] + 0.012 * S, (YOKE.v1 + 0.012) * S], [ys[0] - 0.012 * S, (YOKE.v1 + 0.012) * S]];
  const H = YOKE.half;
  const items = [
    piece(B, YF, ybar, (-H + 0.03) * S, (-0.33) * S, { mat: "oak" }),
    piece(B, YF, capPoly, -0.33 * S, -0.26 * S, { mat: "iron", crease: "lo" }),
    piece(B, YF, ybar, -0.26 * S, 0.26 * S, { mat: "oak" }),
    piece(B, YF, capPoly, 0.26 * S, 0.33 * S, { mat: "iron", crease: "lo" }),
    piece(B, YF, ybar, 0.33 * S, (H - 0.03) * S, { mat: "oak" }),
    piece(B, YF, capPoly, (-H) * S, (-H + 0.03) * S, { mat: "iron", crease: "lo" }),
    piece(B, YF, capPoly, (H - 0.03) * S, H * S, { mat: "iron", crease: "lo" }),
  ];
  // eyes: small iron rings hanging under the bar
  const under = dot(mul(F.v, -1), V) > 0;
  for (const side of [-1, 1]) for (const ex of EYES) {
    const c = eyeAt(th, side * ex);
    const pts = [add(W(c), W(mul(F.a, 0.046))), add(W(c), W(mul(F.a, -0.046))), add(W(c), W(mul(F.v, 0.046))), add(W(c), W(mul(F.v, -0.046)))];
    items.push({ svg: eyeSvg(B, W(c), X, 0.026 * S, 0.046 * S, 0.024 * S), pts, depth: dot(W(c), V) + (under ? 1 : -50) });
  }
  composite(B, "yoke", items, [X, F.a, F.v], { sys: "ropes", mat: "oak" });
  // Tip: iron ferrule binding the two lower poles, the sling eye under it, the prong.
  const fpoly = sectionHull(FERRULE[0] - 0.005, 0.016, true);
  const dots = [];
  B.prism("tip.ferrule", F, fpoly, FERRULE[0] * S, FERRULE[1] * S, { mat: "iron", tone: "hi", crease: "lo", sys: "sling", over: B.D([B.at(w(...onArm(th, LL - 0.08, 0, 0.14)))].filter(() => dot(X, V) > 0), { size: 0.55, tone: "hi" }) });
  const tip = onArm(th, LL);
  const pd = prongDir(th, prong);
  const pBase = onArm(th, LL, 0.02);
  const pEnd = add(pBase, mul(pd, 0.42));
  B.cyl("tip.prong", W(pBase), W(pEnd), 0.022 * S, { mat: "iron", sys: "sling", tone: "hi" });
  B.ball("tip.knob", W(pEnd), 0.034 * S, { mat: "iron", sys: "sling" });
  const eye = slingEye(th);
  B.raw("tip.eye", eyeSvg(B, W(eye), X, 0.022 * S, 0.042 * S, 0.028 * S), shapeOf([W(eye)], { r: 0.042 * S }), { sys: "sling", mat: "iron" });
}
const slingEye = (th) => onArm(th, LL - 0.08, -0.145);

export default {
  id: "traction-trebuchet",
  name: "Traction Trebuchet",
  short: "Traction",
  unit: U,
  view: { W: 1000, H: 640, azimuth: 26, elevation: 21, pad: 24, fit: [w(-2.8, -7.0, -0.6), w(2.8, -7.0, -0.6), w(-2.8, 5.9, -0.6), w(2.8, 5.9, -0.6), w(0, 0.4, ZP + LL + 0.15), w(0, 0.5, 12.6)] },
  target: { kind: "wall", distance: 120, maxRange: 240, height: 8 },
  ammo: [
    { id: "stone", name: "Stone", look: "stone", mass: 5, radius: 0.0766, cd: 0.47 },
    { id: "fire", name: "Fire pot", look: "pot", mass: 3, radius: 0.09, cd: 0.55, fire: true },
    { id: "lime", name: "Lime pot", look: "pot", mass: 4, radius: 0.098, cd: 0.55 },
  ],
  controls: [
    { id: "crew", name: "Crew", min: 10, max: 60, step: 1, value: 33, unit: "pullers" },
    { id: "pull", name: "Pull per puller", min: 200, max: 400, step: 10, value: 300, unit: "N" },
    { id: "sling", name: "Sling length", min: 2.5, max: 5.5, step: 0.1, value: 4.5, unit: "m", digits: 1 },
    { id: "prong", name: "Release angle", min: 5, max: 60, step: 1, value: 14, unit: "°" },
    { id: "distance", name: "Wall distance", min: 60, max: 220, step: 10, value: 120, unit: "m" },
  ],
  actions: [
    { id: "gather", name: "Load", key: "l" },
    { id: "loose", name: "Heave", key: " ", primary: true },
  ],
  toggles: [
    { id: "cut", name: "Cutaway" },
    { id: "strobe", name: "Strobe" },
  ],
  focus: [
    { id: "beam", name: "Beam" },
    { id: "ropes", name: "Pull ropes" },
    { id: "sling", name: "Sling" },
    { id: "axle", name: "Axle & bearings" },
    { id: "frame", name: "Frame" },
  ],
  phases: ["rest", "loading", "gathering", "armed", "heave", "flight", "impact"],
  hint: "Space · heave   L · load",
  holdShot: true,

  build(B, M) {
    const mini = !!B.mini;
    if (!mini) {
      B.plinth({ x: -2.8 * S, y: -7.0 * S, w: 5.6 * S, d: 12.9 * S, r: 10 }, { h: 12, foot: 6, ruler: "y", label: { x: -2.3 * S, y: 5.0 * S, w: 46, d: 22, r: 1.5 } });
      B.halo("frame.halo", [w(-1.9, -2.3, 0), w(1.9, -2.3, 0), w(1.9, 3.7, 0), w(-1.9, 3.7, 0)], 0, { blur: 6 });
    }
    const fr = { mat: "oak", sys: "frame" };
    // Soles on the ground, the rear tie between them.
    for (const x of [-SOLE_X, SOLE_X]) {
      B.beam(`sole${x}`, w(x, -2.25, Z_SOLE / 2), w(x, 3.65, Z_SOLE / 2), { w: 0.3 * S, h: Z_SOLE * S, up: Z, ...fr, grain: 2, bands: [{ at: 0.3 * S }, { at: 5.6 * S }], nails: [-FOOT_Y, FOOT_Y, GAL_Y].map((y) => ({ s: (y + 2.25) * S, face: "v", x: [-0.42, 0.42] })) });
    }
    B.beam("tie.rear", w(-SOLE_X + 0.15, 3.42, 0.13), w(SOLE_X - 0.15, 3.42, 0.13), { w: 0.18 * S, h: 0.22 * S, up: Z, ...fr, grain: 1, nails: [{ s: 0.25 * S, face: "v", x: 0 }, { s: 2.45 * S, face: "v", x: 0 }] });
    // Sling board: three planks on the ground under the frame, two cleats.
    [[-0.3, -0.105], [-0.095, 0.095], [0.105, 0.3]].forEach(([x0, x1], i) =>
      B.slab(`board${i}`, { x: x0 * S, y: -1.55 * S, w: (x1 - x0) * S, d: 4.85 * S, r: 0.4 }, 0, ZB * S, { tone: "mid", mat: "wood", sys: "sling", steps: 2, over: B.D([-1.3, 1.0, 3.0].flatMap((y) => [w(x0 + 0.05, y, ZB), w(x1 - 0.05, y, ZB)]).map(B.at), { size: 0.4 }) }),
    );
    // Legs: level feet on the soles, level heads under the caps.
    const legs = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const near = sx > 0;
      const foot = [sx * SOLE_X, sy * FOOT_Y, Z_SOLE];
      const head = [sx * CAP_X, sy * TOP_Y, Z_CAP];
      legs.push({ sx, sy, foot, head });
      leg(B, `leg${sx}${sy}`, foot, head, 0.22, { ...fr, cut: near ? true : undefined });
      // iron shoe strap at the foot
      B.slab(`shoe${sx}${sy}`, { x: (foot[0] - 0.125) * S, y: (foot[1] - 0.125) * S, w: 0.25 * S, d: 0.25 * S, r: 0.6 }, Z_SOLE * S, 0.05 * S, { mat: "iron", tone: "hi", sys: "frame", steps: 2, cut: near ? true : undefined, over: B.D([B.at(w(foot[0] + 0.125, foot[1], Z_SOLE + 0.025))], { size: 0.45 }) });
    }
    const legAt = (sx, sy, z) => {
      const f = (z - Z_SOLE) / (Z_CAP - Z_SOLE);
      return [sx * (SOLE_X + (CAP_X - SOLE_X) * f), sy * (FOOT_Y + (TOP_Y - FOOT_Y) * f), z];
    };
    for (const sx of [-1, 1]) {
      const near = sx > 0;
      const o = { ...fr, cut: near ? true : undefined };
      // Cap beam.
      B.beam(`cap${sx}`, w(sx * CAP_X, -0.8, Z_CAP + 0.13), w(sx * CAP_X, 0.8, Z_CAP + 0.13), { w: 0.24 * S, h: 0.26 * S, up: Z, ...o, grain: 1, nails: [{ s: 0.25 * S, face: near ? "u" : "-u", x: [-0.4, 0.4] }, { s: 1.35 * S, face: near ? "u" : "-u", x: [-0.4, 0.4] }] });
      // Side girt and diagonals in the side face.
      const g0 = legAt(sx, -1, 2.0), g1 = legAt(sx, 1, 2.0);
      B.beam(`girt${sx}`, w(g0[0], g0[1] + 0.11, 2.0), w(g1[0], g1[1] - 0.11, 2.0), { w: 0.16 * S, h: 0.2 * S, up: Z, ...o, grain: 1, nails: [{ s: 0.1 * S, face: near ? "u" : "-u", x: 0 }, { s: (g1[1] - g0[1] - 0.32) * S, face: near ? "u" : "-u", x: 0 }] });
      const d0 = legAt(sx, -1, 0.62), d1 = legAt(sx, 1, 1.74);
      B.beam(`diag${sx}a`, w(d0[0], d0[1] + 0.11, d0[2]), w(d1[0], d1[1] - 0.11, d1[2]), { w: 0.13 * S, h: 0.15 * S, up: [sx, 0, 0], ...o });
      const e0 = legAt(sx, 1, 2.28), e1 = legAt(sx, -1, 2.95);
      B.beam(`diag${sx}b`, w(e0[0], e0[1] - 0.11, e0[2]), w(e1[0], e1[1] + 0.11, e1[2]), { w: 0.13 * S, h: 0.15 * S, up: [sx, 0, 0], ...o });
      // Knee braces from the legs up under the cap.
      for (const sy of [-1, 1]) {
        const kz = legAt(sx, sy, 3.14);
        B.beam(`knee${sx}${sy}`, w(kz[0], kz[1] - sy * 0.1, kz[2]), w(sx * CAP_X, sy * 0.12, Z_CAP - 0.005), { w: 0.12 * S, h: 0.12 * S, up: [sx, 0, 0], ...o });
      }
      // Bearing block on the cap, iron cap strap, wedges.
      const bx = sx * CAP_X;
      B.slab(`bearing${sx}`, { x: (bx - 0.11) * S, y: -0.24 * S, w: 0.22 * S, d: 0.48 * S, r: 1.5 }, (Z_CAP + 0.26) * S, 0.38 * S, { tone: "hi", mat: "oak", sys: "axle", steps: 3, bevel: 0.5, cut: o.cut, seams: [(ZP + 0.0) * S] });
      B.slab(`bearcap${sx}`, { x: (bx - 0.12) * S, y: -0.27 * S, w: 0.24 * S, d: 0.54 * S, r: 1 }, (Z_CAP + 0.64) * S, 0.045 * S, { tone: "hi", mat: "iron", sys: "axle", steps: 2, cut: o.cut, over: B.D([w(bx, -0.2, Z_CAP + 0.685), w(bx, 0.2, Z_CAP + 0.685)].map(B.at), { size: 0.6, tone: "hi" }) });
      for (const sy of [-1, 1]) {
        const WF = frameFrom(w(bx - 0.1, sy * 0.24, Z_CAP + 0.26), w(bx + 0.1, sy * 0.24, Z_CAP + 0.26), Z);
        B.prism(`wedge${sx}${sy}`, { o: WF.o, a: X, u: Y, v: Z }, sy > 0 ? [[0, 0], [0.09 * S, 0], [0, 0.16 * S]] : [[0, 0], [0, 0.16 * S], [-0.09 * S, 0]], 0, 0.2 * S, { mat: "oak", tone: "hi", sys: "axle", cut: o.cut });
      }
      // Axle: oak between hub splints and bearing, iron journals outside, washers, linchpins.
      B.cyl(`axle.in${sx}`, w(sx * 0.27, 0, ZP), w(sx * (CAP_X - 0.11), 0, ZP), 0.085 * S, { mat: "oak", sys: "axle", tone: "hi", seams: [0.05 * S] });
      B.ring(`axle.band${sx}`, w(sx * 0.33, 0, ZP), w(sx * 0.37, 0, ZP), 0.085 * S, 0.097 * S, { mat: "iron", sys: "axle" });
      B.ring(`axle.washer${sx}`, w(sx * (CAP_X + 0.11), 0, ZP), w(sx * (CAP_X + 0.13), 0, ZP), 0.05 * S, 0.1 * S, { mat: "iron", sys: "axle", cut: o.cut });
      B.cyl(`axle.out${sx}`, w(sx * (CAP_X + 0.13), 0, ZP), w(sx * (CAP_X + 0.3), 0, ZP), 0.05 * S, { mat: "iron", sys: "axle", tone: "hi", cut: o.cut, faceRing: [{ s: 0.17 * S, r: 0.024 * S }] });
      B.cyl(`axle.pin${sx}`, w(sx * (CAP_X + 0.24), 0, ZP - 0.1), w(sx * (CAP_X + 0.24), 0, ZP + 0.1), 0.014 * S, { mat: "iron", sys: "axle", cut: o.cut });
    }
    // Front low tie between the front legs (the ropes pass above it).
    const t0 = legAt(-1, -1, 0.75), t1 = legAt(1, -1, 0.75);
    B.beam("tie.front", w(t0[0] + 0.11, t0[1], 0.75), w(t1[0] - 0.11, t1[1], 0.75), { w: 0.16 * S, h: 0.18 * S, up: Z, ...fr, grain: 1 });
    // Gallows: two posts on the soles, a bar with a hide pad the beam rests on, knee braces.
    const padTop = this.padTop();
    for (const x of [-SOLE_X, SOLE_X]) {
      B.beam(`gal.post${x}`, w(x, GAL_Y, Z_SOLE), w(x, GAL_Y, padTop - 0.21), { w: 0.18 * S, h: 0.18 * S, up: Y, ...fr, grain: 1 });
      B.beam(`gal.knee${x}`, w(x, GAL_Y + 0.55, Z_SOLE), w(x, GAL_Y + 0.09, Z_SOLE + 0.62), { w: 0.12 * S, h: 0.12 * S, up: [0, 1, 1], ...fr });
    }
    B.beam("gal.bar", w(-SOLE_X - 0.12, GAL_Y, padTop - 0.125), w(SOLE_X + 0.12, GAL_Y, padTop - 0.125), { w: 0.2 * S, h: 0.17 * S, up: Z, ...fr, grain: 1, nails: [{ s: 0.12 * S, face: "v", x: 0 }, { s: (2 * SOLE_X + 0.12) * S, face: "v", x: 0 }] });
    B.slab("gal.pad", { x: -0.32 * S, y: (GAL_Y - 0.12) * S, w: 0.64 * S, d: 0.24 * S, r: 2 }, (padTop - 0.04) * S, 0.04 * S, { mat: "hide", tone: "hi", sys: "frame", steps: 3, bevel: 0.6, over: B.D([w(-0.26, GAL_Y, padTop), w(0.26, GAL_Y, padTop)].map(B.at), { size: 0.45 }) });
    if (mini) return;
    // Stone tray: floor and four walls.
    const T = TRAY;
    B.slab("tray.floor", { x: T.x * S, y: T.y * S, w: T.w * S, d: T.d * S, r: 1 }, 0, 0.04 * S, { mat: "wood", tone: "mid", steps: 2 });
    B.slab("tray.wallFar", { x: T.x * S, y: T.y * S, w: 0.04 * S, d: T.d * S, r: 0.3 }, 0.04 * S, 0.12 * S, { mat: "wood", tone: "hi", steps: 2 });
    B.slab("tray.wallBack", { x: (T.x + 0.04) * S, y: (T.y + T.d - 0.04) * S, w: (T.w - 0.08) * S, d: 0.04 * S, r: 0.3 }, 0.04 * S, 0.12 * S, { mat: "wood", tone: "hi", steps: 2 });
    B.slab("tray.wallFront", { x: (T.x + 0.04) * S, y: T.y * S, w: (T.w - 0.08) * S, d: 0.04 * S, r: 0.3 }, 0.04 * S, 0.12 * S, { mat: "wood", tone: "hi", steps: 2 });
    B.slab("tray.wallNear", { x: (T.x + T.w - 0.04) * S, y: T.y * S, w: 0.04 * S, d: T.d * S, r: 0.3 }, 0.04 * S, 0.12 * S, { mat: "wood", tone: "hi", steps: 2, over: B.D([w(T.x + T.w, T.y + 0.1, 0.1), w(T.x + T.w, T.y + T.d - 0.1, 0.1)].map(B.at), { size: 0.45 }) });
    // Straw rings under the pots.
    for (const [x, y] of [...PILE.fire, ...PILE.lime]) B.ring(`straw${x}${y}`, w(x, y, 0), w(x, y, 0.035), 0.05 * S, 0.11 * S, { mat: "rope", tone: "hi" });
  },

  // Height of the gallows pad: the beam's underside where it crosses the bar at rest.
  padTop() {
    const s = GAL_Y / Math.cos(TH0);
    const vMin = Math.min(...POLES.filter((p) => s >= p.s0 && s <= p.s1).map((p) => p.v - poleR(p, s)));
    return ZP + GAL_Y * Math.tan(TH0) + vMin / Math.cos(TH0);
  },

  init(M) {
    return { mode: "rest", load: 0, gather: 0, auto: false, sim: null, flight: null, pouchY: null, lastT: 0, limeDone: true };
  },

  act(M, id) {
    const st = M.state;
    if (id === "gather") {
      if (st.mode === "rest") this.startLoading(M);
    }
    if (id === "loose") {
      if (st.mode === "armed") return this.fire(M);
      if (st.mode === "rest") this.startLoading(M);
      if (st.mode !== "shot") st.auto = true;
    }
  },

  startLoading(M) {
    const st = M.state;
    st.mode = "loading";
    st.load = st.loaded ? 1 : 0;
    st.loaded = false;
    st.gather = 0;
    st.from = this.restPouch(M);
    M.setPhase("loading");
  },

  onControl(M, id) {
    if (id === "distance") {
      M.def.target.distance = M.ctrl.distance;
      M.range.mount(M.def, M);
    }
    M.dirty = true;
  },

  fire(M) {
    const st = M.state;
    const sim = simulate(M.ctrl, M.ammo);
    st.sim = sim;
    st.mode = "shot";
    st.auto = false;
    st.lastT = 0;
    st.flight = null;
    st.limeDone = M.ammo.id !== "lime";
    st.heard = {};
    const marks = [[PRE, "heave"]];
    if (sim.lift) marks.push([sim.lift, "lift"]);
    let T = sim.end + STOW;
    if (sim.release && sim.release.drop) {
      // the crew could not lift the stone off the board: nothing flies
      M.flight = null;
      M.lastFlight = null;
    } else if (sim.release) {
      const rel = sim.release;
      const p = W([0, rel.p[0], rel.p[1]]);
      const flight = M.launch({ p, v: rel.v, t0: rel.t, spin: 5 });
      st.flight = flight;
      T = Math.max(sim.end + STOW, rel.t + flight.impact.t + 2.6);
      marks.push([rel.t, "loose"], [rel.t + flight.impact.t, "impact"]);
    } else {
      M.flight = null;
    }
    M.startShot(T, marks);
    M.setPhase("heave");
  },

  endShot(M) {
    const st = M.state;
    if (st.mode !== "shot") return;
    st.mode = "rest";
    st.pouchY = st.sim ? st.sim.final.py : null;
    st.loaded = !!(st.sim && st.sim.release && st.sim.release.drop);
    M.setPhase("rest");
  },

  tour(M) {
    const st = M.state;
    if (st.mode === "shot" && M.shot && M.shot.finished) this.endShot(M);
    if (st.mode === "rest") this.act(M, "loose");
  },

  update(M, dt) {
    const st = M.state;
    this._dt = dt;
    if (st.mode === "loading") {
      st.load = Math.min(1, st.load + dt / 1.2);
      if (st.load >= 1) {
        M.sfx?.("thunk", { pitch: 1.6, gain: 0.35 });
        st.mode = "gather";
        st.gather = 0;
        M.setPhase("gathering");
      }
      return true;
    }
    if (st.mode === "gather") {
      st.gather = Math.min(1, st.gather + dt / 1.7);
      // ropes creak as the crew takes up the slack, rank by rank
      if (dt > 0 && st.gather > 0.25 && Math.random() < dt * 5) M.sfx?.("creak", { pitch: 1.1 + Math.random() * 0.6, gap: 0.08 });
      if (st.gather >= 1) {
        st.mode = "armed";
        M.setPhase("armed");
        if (st.auto) this.fire(M);
      }
      return true;
    }
    if (st.mode === "shot" && M.shot && st.sim) {
      const t = M.shot.t;
      const sim = st.sim;
      const rel = sim.release && !sim.release.drop ? sim.release.t : Infinity;
      const hit = st.flight ? rel + st.flight.impact.t : Infinity;
      M.setPhase(t < rel ? "heave" : t < hit ? "flight" : "impact");
      if (t < st.lastT - 1e-6) st.heard = {};
      if (M.shot.playing && dt > 0) {
        const h = (st.heard = st.heard || {});
        const once = (key, at, name, o) => {
          if (!h[key] && t >= at && st.lastT < at + 0.25) {
            h[key] = true;
            M.sfx?.(name, o);
          }
        };
        once("heave", PRE + 0.05, "creak", { pitch: 0.55, gap: 0 });
        once("strain", PRE + 0.25, "creak", { pitch: 0.75, gap: 0 });
        if (sim.lift) once("swing", sim.lift, "whoosh", { size: 1.3, gain: 0.45 });
        if (sim.release) once("loose", sim.release.t, "whoosh", { size: 0.6, gain: 0.7 });
        sim.bumps.forEach((b, i) => once("bump" + i, b.t, "thud", { pitch: 0.7, size: clamp(b.v / 5, 0.5, 1.6), gain: clamp(b.v / 8, 0.2, 0.7) }));
        once("slack", sim.end + 0.1, "creak", { pitch: 1.4, gap: 0 });
      }
      this.effects(M, st.lastT, t);
      st.lastT = t;
      return true;
    }
    if (st.mode === "armed" && M.ammo.fire) return true;
    return this.limeActive(M);
  },

  // Dust where the beam drops onto the gallows, puffs off the sling board, the lime cloud.
  effects(M, t0, t1) {
    const st = M.state;
    const sim = st.sim;
    if (t1 < t0) {
      st.limeDone = M.ammo.id !== "lime";
      return;
    }
    if (M.calm) return;
    for (const b of sim.bumps) {
      if (b.t > t0 && b.t <= t1 && b.v > 0.4) {
        const n = Math.round(clamp(b.v * 3, 3, 16));
        M.fx.emit("dust", w(0, GAL_Y, this.padTop()), { n, v: [0, 0, 0.5 * S], spread: 0.9 * S, spreadZ: 0.3, size: 0.25 * S, grow: 0.9 * S, life: 1.4, drag: 2.2, jitter: 0.25 * S });
      }
    }
    // the stone scuffs along the board until it lifts
    if (sim.lift && t0 < sim.lift && t1 > PRE + 0.05) {
      const f = sim.rec.at(t1);
      if (f.pz < ZB + M.ammo.radius + 0.02 && Math.random() < 0.6) M.fx.emit("dust", w(0, f.py, ZB + 0.02), { n: 2, v: [0, 0.6 * S, 0.25 * S], spread: 0.25 * S, size: 0.08 * S, grow: 0.35 * S, life: 0.9, drag: 2.5 });
    }
    // lime: the pot bursts into a choking white cloud where it lands
    if (!st.limeDone && st.flight && sim.release) {
      const hitT = sim.release.t + st.flight.impact.t;
      if (t1 >= hitT && t0 < hitT + 0.5) {
        st.limeDone = true;
        const ip = st.flight.impact.p;
        this.limeBurst(M, ip, st.flight.impact.what);
        if (ip[1] > -7 && ip[1] < 6 && Math.abs(ip[0]) < 3) {
          M.fx.emit("steam", w(ip[0], ip[1], 0.2), { n: 40, v: [0, 0, 0.5 * S], spread: 1.2 * S, size: 0.4 * S, grow: 2.6 * S, life: 3.5, drag: 1.4, buoy: 0.2 * S, alpha: 0.9 });
          M.fx.emit("dust", w(ip[0], ip[1], 0.15), { n: 24, v: [0, 0, 0.3 * S], spread: 1.4 * S, size: 0.35 * S, grow: 2.0 * S, life: 3.0, drag: 1.6, alpha: 0.7 });
        }
      }
    }
  },

  limeBurst(M, p, what) {
    if (M.calm) return;
    if (!M.range || !M.range.emit) return;
    const wallHit = what && what.kind === "wall";
    const c = [p[0], p[1] + (wallHit ? 0.5 : 0), Math.max(0.3, p[2])];
    {
      const v = { fx: M.range };
      v.fx.emit("steam", c, { n: 60, v: [0, wallHit ? 2.4 : 0.6, 1.2], spread: 2.6, size: 1.2, grow: 7, life: 6, drag: 0.9, buoy: 0.3, alpha: 0.95, jitter: 0.8 });
      v.fx.emit("steam", add(c, [0, 0.5, 0]), { n: 30, v: [0, 1.4, 0.4], spread: 4, size: 1.6, grow: 9, life: 8, drag: 0.6, buoy: 0.12, alpha: 0.7, jitter: 1.6 });
      v.fx.emit("dust", c, { n: 24, v: [0, wallHit ? 3 : 0.5, 0.8], spread: 3, size: 1, grow: 5, life: 4, drag: 1.1, buoy: 0.15, alpha: 0.6, jitter: 1 });
    }
  },
  limeActive() {
    return false;
  },

  onToggle(M) {
    M.dirty = true;
  },
  onAmmo(M) {
    M.dirty = true;
  },

  // Where the empty pouch lies at rest (on the board forward of the tip) for a sling angle.
  pouchOf(M, th, ps) {
    const L = M.ctrl.sling;
    const r = M.ammo.radius;
    const zc = ZB + r;
    const T = onArm(th, LL);
    if (ps === undefined || ps === null) {
      const dy = Math.sqrt(Math.max(0, L * L - (T[2] - zc) ** 2));
      return { py: T[1] - dy, pz: zc };
    }
    const p = [T[1] + L * Math.cos(ps), T[2] + L * Math.sin(ps)];
    if (p[1] >= zc - 1e-6) return { py: p[0], pz: p[1] };
    const dy = Math.sqrt(Math.max(0, L * L - (T[2] - zc) ** 2));
    return { py: T[1] + (Math.cos(ps) >= 0 ? dy : -dy), pz: zc };
  },
  restPouch(M) {
    const st = M.state;
    const load = this.pouchOf(M, TH0);
    if (st.pouchY === null || st.pouchY === undefined) return { py: load.py, pz: restZ(load.py) };
    return { py: st.pouchY, pz: restZ(st.pouchY) };
  },

  // The pose the machine is drawn in this frame.
  pose(M) {
    const st = M.state;
    const r = M.ammo.radius;
    if (st.mode === "shot" && M.shot && st.sim) {
      const f = st.sim.rec.at(M.shot.t);
      const dud = !!st.sim.release.drop;
      return { th: f.th, thd: f.thd, tp: M.shot.t - PRE, py: f.py, pz: f.pz, ps: f.ps, proj: f.rel < 0.5 || dud, released: f.rel >= 0.5 && !dud, T: f.T, W: f.W, shot: true };
    }
    if (st.mode === "shot") return { th: TH0, thd: 0, ...this.pouchOf(M, TH0), proj: false, released: true, T: 0, W: 0 };
    const load = this.pouchOf(M, TH0);
    if (st.mode === "loading") {
      const from = st.from || load;
      const u = ease(clamp(st.load / 0.55, 0, 1));
      const far = Math.abs(load.py - from.py) > 0.3 ? 1 : 0;
      return { th: TH0, thd: 0, py: from.py + (load.py - from.py) * u, pz: from.pz + (load.pz - from.pz) * u + far * Math.sin(u * Math.PI) * 0.55, proj: true, loading: st.load, released: false, T: 0, W: 0 };
    }
    if (st.mode === "gather" || st.mode === "armed") return { th: TH0, thd: 0, ...load, proj: true, released: false, T: 0, W: 0 };
    const rp = this.restPouch(M);
    if (st.loaded) return { th: TH0, thd: 0, ...load, proj: true, released: false, T: 0, W: 0 };
    return { th: TH0, thd: 0, py: rp.py, pz: rp.pz, proj: false, released: !!st.sim, T: 0, W: 0 };
  },

  // Each rope: its eye, its toggle, its length, taut or slack, pulling or not.
  ropeStates(M, pose) {
    const st = M.state;
    const ropes = st.mode === "shot" && st.sim ? st.sim.ropes : ropesFor(M.ctrl.crew);
    const pull = st.mode === "shot" && st.sim ? st.sim.pull : M.ctrl.pull;
    return ropes.map((r) => {
      const A = eyeAt(pose.th, r.ex);
      const slack = st.mode === "shot" && st.sim && M.shot ? clamp((M.shot.t - st.sim.end) / STOW, 0, 1) : 0;
      if (st.mode === "shot" && st.sim && slack <= 0) {
        const f = ropeTension(r, pose.th, pose.thd, pose.tp, pull);
        return { r, A, H: f.h.H, active: f.T > 1, taut: !f.h.bottom || f.T > 1 };
      }
      if (st.mode === "armed") return { r, A, H: r.H0, active: false, taut: true };
      if (st.mode === "gather" || slack > 0) {
        const g = st.mode === "gather" ? st.gather : 1 - slack;
        const ranks = Math.ceil(ropes.length / 8);
        const lag = ((st.mode === "gather" ? 0.55 : 0.3) * (r.rank + (r.i % 8) / 10)) / ranks;
        const u = ease(clamp((g - lag) / (st.mode === "gather" ? 0.45 : 0.7), 0, 1));
        const from = r.hang.H;
        const H = lerp(from, r.H0, u);
        H[2] += Math.sin(u * Math.PI) * 0.35;
        return { r, A, H, active: false, taut: u > 0.995, hang: u < 0.005 ? r.hang : null };
      }
      return { r, A, H: r.hang.H, active: false, taut: !r.hang.lying, hang: r.hang };
    });
  },

  draw(B, M) {
    const st = M.state;
    const mini = !!B.mini;
    const pose = this.pose(M);
    B.keep("beam", [pose.th.toFixed(5), M.ctrl.prong], () => drawBeam(B, pose.th, M.ctrl.prong, mini));
    if (mini) return;
    const tip = onArm(pose.th, LL);
    const pd = prongDir(pose.th, M.ctrl.prong);
    const prongTip = add(onArm(pose.th, LL, 0.02), mul(pd, 0.42));
    B.keep("sling", [pose.th.toFixed(5), pose.py.toFixed(4), pose.pz.toFixed(4), !!pose.proj, !!pose.released, M.ammo.id, M.ctrl.sling, M.ctrl.prong, st.mode === "loading" ? st.load.toFixed(3) : 0], () => drawSling(B, M, pose, tip, prongTip));
    const focus = M.stage && M.stage.dataset ? M.stage.dataset.focus || "" : "";
    const moving = st.mode === "shot" || st.mode === "gather";
    const sig = moving ? `${st.mode}${M.shot ? M.shot.t.toFixed(4) : ""}${st.gather}` : st.mode;
    B.keep("ropes", [sig, M.ctrl.crew, focus, pose.th.toFixed(5)], () => drawRopes(B, M, pose, focus === "ropes"));
    B.keep("stations", [M.ctrl.crew], () => drawStations(B, M));
    B.keep("pile", [M.ammo.id, !!pose.proj, st.mode], () => drawPile(B, M, pose));
    if (M.toggles.strobe && st.mode === "shot" && st.sim && M.shot) drawStrobe(B, M, st.sim, M.shot.t);
    if (M.ammo.fire && pose.proj && !M.calm && !(st.mode === "loading" && st.load < 0.05)) {
      const P = this.projAt(M, pose);
      if (Math.random() < 0.7) M.fx.emit("fire", add(W(P), [0, 0, M.ammo.radius * S * 1.9]), { v: [0, 0, 0.5 * S], spread: 0.1 * S, size: 0.17 * S, grow: 0.06 * S, life: 0.4, heat: 1, buoy: 0.9 * S, drag: 2 });
    }
  },

  projAt(M, pose) {
    const st = M.state;
    const P = [0, pose.py, pose.pz];
    if (st.mode === "loading" && st.load < 1) {
      const from = pileItem(M.ammo.id);
      const u = ease(st.load);
      const via = [0.75, 3.3, 0.85];
      const a = lerp(from, via, u);
      const b = lerp(via, P, u);
      return lerp(a, b, u);
    }
    return P;
  },

  occluders(M) {
    return [
      { min: w(1.2, -1.9, 0.3), max: w(1.65, 1.9, 3.75) },
      { min: w(-1.7, -2.3, 0), max: w(1.7, 3.7, Z_SOLE) },
    ];
  },

  readouts(M) {
    const st = M.state;
    const pose = this.pose(M);
    const sim = st.sim;
    const live = st.mode === "shot";
    const rows = [
      ["Crew", fmtInt(M.ctrl.crew), "pullers"],
      ["Total pull", fmt((live ? pose.T : 0) / 1000, 1), "kN"],
      ["Peak pull", sim ? fmt(sim.peak / 1000, 1) : "—", sim ? "kN" : ""],
      ["Crew work", fmt((live ? pose.W : sim ? sim.work : 0) / 1000, 2), "kJ"],
      ["Beam", fmt(deg(pose.th), 1), "°"],
      ["Arm ratio", fmt(LL / LS, 1), ": 1"],
      ["Beam mass", fmtInt(ARM.m), "kg"],
    ];
    if (sim && sim.release && st.flight) {
      const v = sim.release.v;
      const ke = 0.5 * M.ammo.mass * (v[1] ** 2 + v[2] ** 2);
      rows.push(["Launch angle", fmt(deg(Math.atan2(v[2], -v[1])), 1), "°"], ["Efficiency", fmt((ke / Math.max(1, sim.work)) * 100, 0), "%"], ["Release at", fmt(sim.release.t - PRE, 2), "s"]);
    } else if (sim && (!sim.release || sim.release.drop)) rows.push(["Release", "none", ""]);
    return rows;
  },
};

// ---------------- sling ----------------
function drawSling(B, M, pose, tip, prongTip) {
  const r = M.ammo.radius;
  const st = M.state;
  const P = [0, pose.py, pose.pz];
  const L = M.ctrl.sling;
  const fixed = slingEye(pose.th);
  const dir = unit(sub(P, tip));
  const pr = Math.max(r, 0.075) * 1.08;
  const side = [1, 0, 0];
  if (pose.released) {
    const pouch = P;
    const d2 = unit(sub(pouch, fixed));
    B.rope("sling.fixed", [W(fixed), W(pouch)], 0.016 * S, { sys: "sling", maxLength: 40 });
    const loose = add(pouch, mul(unit(add(d2, [0, 0.25, -0.5])), Math.min(L * 0.4, 1.6)));
    if (loose[2] < 0.03) loose[2] = 0.03;
    // the loose end never trails off the plinth: it folds back alongside the pouch
    if (loose[1] > REAR_Y + 0.25) {
      loose[1] = 2 * pouch[1] - loose[1];
      loose[0] += 0.3;
    }
    const mid = lerp(pouch, loose, 0.5);
    mid[2] = Math.max(0.03, mid[2]);
    B.rope("sling.loose", [W(pouch), W(mid), W(loose)], 0.016 * S, { sys: "sling", maxLength: 40 });
    B.ball("sling.loopEnd", W(loose), 0.03 * S, { mat: "rope", sys: "sling" });
    pouchCup(B, "sling.pouch", W(pouch), d2, 0.075 * S, { sys: "sling" });
    return;
  }
  const leftEnd = add(P, mul(side, -pr * 0.9));
  const rightEnd = add(P, mul(side, pr * 0.9));
  B.rope("sling.fixed", [W(fixed), W(leftEnd)], 0.016 * S, { sys: "sling", maxLength: 40 });
  B.rope("sling.loop", [W(prongTip), W(rightEnd)], 0.016 * S, { sys: "sling", maxLength: 40 });
  B.raw("sling.ring", eyeSvg(B, W(prongTip), X, 0.03 * S, 0.055 * S, 0.04 * S), shapeOf([W(prongTip)], { r: 0.055 * S }), { sys: "sling", mat: "iron" });
  const toward = dot(B.V, dir);
  const Pw = W(P);
  pouchCup(B, "sling.pouch", Pw, dir, pr * S, { sys: "sling", key: dot(B.V, Pw) + (toward > 0 ? 0.6 : -0.6) * r * S });
  if (pose.proj) {
    let c = P;
    if (st.mode === "loading" && st.load < 1) c = M.def.projAt(M, pose);
    looks.draw(M.ammo.look, B, "proj", W(c), r * S, { seed: 5, sys: "sling", axis: [0, 0, 1], lit: false, wick: M.ammo.id === "fire" });
    if (M.ammo.id === "lime") {
      const pc = add(W(c), [0, 0, r * S * 0.95]);
      B.cyl("proj.plug", pc, add(pc, [0, 0, r * S * 0.16]), r * S * 0.42, { mat: "stone", tone: "hi", sys: "sling" });
    }
  }
}

// ---------------- ropes and toggles ----------------
function ropePoints(A, H, ell) {
  const D = len(sub(H, A));
  if (D >= ell - 0.01) return [A, H];
  const sag = Math.sqrt((3 * D * (ell - D)) / 8);
  const pts = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const p = lerp(A, H, u);
    p[2] = Math.max(0.03, p[2] - 4 * sag * u * (1 - u));
    pts.push(p);
  }
  return pts;
}
function drawRopes(B, M, pose, focused) {
  const states = M.def.ropeStates(M, pose);
  const V = B.V;
  for (const side of [-1, 1]) {
    const list = states.filter((s) => s.r.side === side);
    if (!list.length) continue;
    const items = [];
    const pts = [];
    for (const s of list) {
      const rp = ropePoints(s.A, s.H, s.r.ell);
      const d = k.pathOf(rp.map((p) => B.at(W(p))));
      const tone = s.active ? "hi" : s.taut ? "mid" : "lo";
      const style = s.active && focused ? "stroke:var(--accent);stroke-width:1.5px" : `stroke-width:${s.active ? 1.25 : 1.0}px`;
      const rope = `<g data-mat="rope"><path class="iso-line" data-tone="${tone}" style="vector-effect:none;${style}" d="${d}"/></g>`;
      // toggle: an oak handle across the rope's end
      const dirR = unit(sub(s.A, s.H));
      let ax = cross(dirR, Z);
      if (len(ax) < 0.2 || (s.hang && s.hang.lying)) ax = [1, 0.15 * side, 0];
      ax = unit(ax);
      const c = W(s.H);
      const e0 = B.at(sub(c, mul(ax, 0.15 * S)));
      const e1 = B.at(add(c, mul(ax, 0.15 * S)));
      const dd = `M${e0[0].toFixed(2)} ${e0[1].toFixed(2)}L${e1[0].toFixed(2)} ${e1[1].toFixed(2)}`;
      const tw = 0.05 * S * B.KS;
      const lit = s.active && focused;
      const tog = `<g data-mat="oak"><path d="${dd}" style="fill:none;stroke:${lit ? "var(--accent)" : "var(--anatomy-hi)"};stroke-width:${(tw + 1.3).toFixed(2)}px;stroke-linecap:round;vector-effect:none"/><path d="${dd}" style="fill:none;stroke:var(--anatomy-top);stroke-width:${tw.toFixed(2)}px;stroke-linecap:round;vector-effect:none"/></g>`;
      items.push({ depth: dot(c, V), svg: rope + tog });
      for (const p of rp) pts.push(W(p));
      pts.push(add(c, mul(ax, 0.16 * S)), sub(c, mul(ax, 0.16 * S)));
    }
    items.sort((a, b) => a.depth - b.depth);
    B.raw(`ropes${side}`, items.map((it) => it.svg).join(""), shapeOf(pts, { r: 0.03 * S }), { sys: "ropes" });
  }
}
// Each puller's station: a ground ring and a short stake at the bottom of the hands' path.
function drawStations(B, M) {
  const ropes = ropesFor(M.ctrl.crew);
  const rings = [];
  for (const r of ropes) {
    const f = r.foot;
    rings.push(G.circleOf(G.frameAlong(w(f[0], f[1], 0.004), Z), 0, 0.085 * S, B.P, 16));
  }
  B.marks("stations", B.L(rings.join(""), { tone: "lo" }), ropes.map((r) => w(r.foot[0], r.foot[1], 0)), { layer: -1, sys: "ropes" });
  const items = [];
  const V = B.V;
  for (const r of ropes) {
    const f = r.foot;
    const top = HAND_Z1 - 0.06;
    const F = { o: w(f[0], f[1], 0), a: Z, u: X, v: Y };
    const paths = extrudeAlong(F, polyCircle(0.028 * S, 10), 0, top * S, B.P);
    const cap = extrudeAlong(F, polyCircle(0.034 * S, 10), (top - 0.035) * S, top * S, B.P);
    const pts = [w(f[0] - 0.034, f[1] - 0.034, 0), w(f[0] + 0.034, f[1] + 0.034, top)];
    items.push({ depth: dot(w(f[0], f[1], 0), V), svg: `<g data-mat="oak">${B.S(paths, { tone: "mid" })}</g><g data-mat="iron">${B.S(cap, { tone: "hi", crease: "lo" })}</g>`, pts });
  }
  items.sort((a, b) => a.depth - b.depth);
  B.raw("stakes", items.map((it) => it.svg).join(""), shapeOf(items.flatMap((it) => it.pts)), { sys: "ropes", mat: "oak" });
}

// ---------------- pile ----------------
function drawPile(B, M, pose) {
  const id = M.ammo.id;
  const taken = pose.proj || M.state.mode === "loading";
  PILE.stone.forEach(([x, y, z], i) => {
    if (id === "stone" && taken && i === 4) return;
    looks.stone(B, `pile.s${i}`, w(x, y, z), 0.0766 * S, { mat: "stone", lit: id === "stone", seed: i + 2 });
  });
  PILE.fire.forEach(([x, y], i) => {
    if (id === "fire" && taken && i === 1) return;
    looks.pot(B, `pile.f${i}`, w(x, y, 0.02 + 0.09 * 0.95), 0.09 * S, { lit: id === "fire", axis: [0, 0, 1], wick: true });
  });
  PILE.lime.forEach(([x, y], i) => {
    if (id === "lime" && taken && i === 1) return;
    looks.pot(B, `pile.l${i}`, w(x, y, 0.02 + 0.098 * 0.95), 0.098 * S, { lit: id === "lime", axis: [0, 0, 1], wick: false });
    limePlug(B, `pile.lp${i}`, w(x, y, 0.02 + 0.098 * 0.95), 0.098 * S, { lit: id === "lime" });
  });
}

// ---------------- strobe ----------------
function drawStrobe(B, M, sim, now) {
  const lines = [];
  const pts = [];
  const until = Math.min(now, sim.release ? sim.release.t + 0.5 : sim.end);
  for (let t = PRE; t <= until; t += 0.07) {
    const f = sim.rec.at(t);
    lines.push(k.pathOf([B.at(W(onArm(f.th, -LS))), B.at(W(onArm(f.th, LL)))]));
    lines.push(k.pathOf([B.at(W(onArm(f.th, LL))), B.at(w(0, f.py, f.pz))]));
    pts.push(B.at(w(0, f.py, f.pz)));
  }
  const path = [];
  const pathEnd = Math.min(now, sim.release ? sim.release.t : sim.end);
  for (let t = PRE; t <= pathEnd; t += 1 / 120) {
    const f = sim.rec.at(t);
    path.push(B.at(w(0.01, f.py, f.pz)));
  }
  const svg = B.L(lines.join(""), { tone: "lo" }) + (path.length > 1 ? `<path class="iso-line" data-tone="lit" style="stroke:var(--accent);stroke-width:1.2px" d="${k.pathOf(path)}"/>` : "") + B.D(pts, { size: 1.4, tone: "mid" });
  B.marks("strobe", svg, [w(0, 0, 6)], { r: 400, layer: 6 });
}

// Onager (Ammianus Marcellinus XXIII.4, 4th c. AD): one stout arm thrust upward through a
// single horizontal skein of twisted sinew, drawn down by a ratchet windlass, held by a claw
// trigger that a mallet trips, and stopped by a stuffed buffer whose blow makes the frame kick.
// Authored in metres (S converts to world units); the machine shoots toward −y.
//
// TRUTH (metres, kilograms, seconds)
//   Frame: two oak side beams 4.45 × 0.28 × 0.40 on two ground sills, ~1000 kg; skein axis at
//   y −1.0, 0.44 above the ground; buffer frame 2.0 m tall with a chaff sack on its crossbeam.
//   Skein: sinew, Ø 0.26, two halves each side of the arm. Pre-twist φ (washers turned the same
//   way) plus the arm's wind Δ give the twist; torque on the arm = 2 · PH.skeinTorque(φ + Δ)
//   (k 850 N·m/rad per half, hardening 0.6) minus a little internal friction.
//   Arm: oak 2.45 m (2.2 m axis → tip), 70 kg, centre of mass 0.82 m up, I_cg 30 kg·m².
//   Buffer: Hunt–Crossley pad, F = 6·10⁶ δ^1.5 (1 + 0.375 δ̇) N, struck 1.43 m up the arm at 96°.
//   Sling: a one-sided stiff cord (6·10⁵ N/m, tension only) so it can go slack when the arm
//   stops; stone on a tray or hanging; the loop leaves the prong when the sling has swung to
//   the set angle behind the arm. After release the empty pouch (0.4 kg, drag) whips on.
//   Kick: the frame turns about the nose of its front sill; the moment it gets is −dL/dt of
//   the arm (and stone) about that edge plus their weight; gravity brings it down (bounce 0.15).
//   Default (φ 70°, wind 75°, sling 0.85 m, release 86°, 4 kg granite): 46 m/s at 36°,
//   182 m; stored 14 kJ (31 % reaches the stone); the arm hits the buffer with ~9 kJ, squashes
//   it ~5 cm, and the rear of the frame hops ~5 cm. Extremes: 32–62 m/s, 64–295 m.
//   The kick is drawn as one screen-space affine turn of the machine's parts (applyKick).
//
// PARTS (machine 148 drawn parts, pile 26): sills 2, side beams 6 + straps 4, through-tenons 8 + wedges 8,
//   crosspieces 4, tray planks 3, buffer uprights 2 (+ shoes and straps 4), braces 2,
//   crossbeam 1 (+ straps 2), cushion 1, lashings 2, bed plates 2, washers 2, cross-bars 6,
//   locking pegs 4, levers 2, skein halves 2, strand bundles 2, arm 9 (+ bands 6, shoe, strike
//   pad, tip cap, prong, prong knob, eye rings 3, lugs 2), sling cords 2 + ring + pouch,
//   windlass drum 2 + coil + axle stubs 4 + ratchet + pawl + pawl pin + hubs 2 + spikes 8,
//   rope + hook, trigger block, cheeks 2, claw, claw pin, release pin, mallet 2, strop + ring;
//   pile: 4 granite, 2 pitch balls on a mat, 2 pebble bags.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { add, sub, mul, dot, unit, len, lerp, clamp, rad, deg, ease, smoothstep, fmt, fmtInt, TAU, rng } from "../engine/vec.js";
import * as PH from "../engine/physics.js";
import * as looks from "../engine/looks.js";
import { frameFrom, framePoint, polyRect, polySaw, polyCircle, extrudeAlong } from "../engine/geo.js";
import { shapeOf } from "../engine/scene.js";

const U = 0.02;
const S = 1 / U;
const w = (x, y, z) => [x * S, y * S, z * S];

// ---------------- real proportions ----------------
const YS = -1.0; // skein axis y
const ZS = 0.44; // skein axis height
const L = 2.2; // skein axis → arm tip
const MA = 70;
const DCG = 0.82;
const IA = 30;
const TH_BUF = rad(96); // the arm's face meets the cushion
const SB = 1.43; // contact along the arm
const KB = 6e6;
const HC = 0.25;
const KSK = 850; // skein stiffness per half, N·m/rad
const HARD = 0.6;
const CSK = 40; // skein internal friction, N·m·s
const KSL = 6e5; // sling cord stiffness
const BX = 0.56; // side-beam centre x
const BW = 0.28;
const BZ0 = 0.24;
const BZ1 = 0.64;
const BY0 = -2.25;
const BY1 = 2.2;
const IN = BX - BW / 2; // inner face x (0.42)
const OUT = BX + BW / 2; // outer face x (0.70)
const SKR = 0.13; // skein radius
const YF = -2.1; // nose of the front sill: the kick pivot
const MF = 1000;
const YCF = -0.4;
const ZCF = 0.6;
const IFR = MF * ((4.45 * 4.45) / 12 + (YCF - YF) ** 2 + ZCF ** 2);
const ZTRAY = 0.545;
const TRAY = [1.0, 2.18];
const DRUM = { y: 0.3, z: 0.44, r: 0.1 };
const ROPE_ALL = 2.6;
const L_HANG = 0.3;
const EYE_S = 1.35;
const RING_S = 1.9;
const RING_X = 0.132;
const CLAW = { x: RING_X, y: 0.82, z: 0.64 };
const PIN_X = 0.03;
const TRIG = 0.42;
const UPY = -1.55; // buffer uprights
const XBZ = 1.88; // crossbeam centre height

// Stepped arm: [s0, s1, width (x), depth (n)] and iron bands at s.
const ARM = [[-0.25, 0.3, 0.18, 0.22], [0.3, 1.05, 0.17, 0.2], [1.05, 1.85, 0.16, 0.18], [1.85, 2.2, 0.14, 0.15]];
const BANDS = [-0.19, 0.2, 0.62, 1.05, 1.85, 2.06];
const sectionAt = (s) => ARM.find(([a, b]) => s >= a && s <= b) || ARM[ARM.length - 1];
const PAD = 0.012;
const CONTACT_OFF = sectionAt(SB)[3] / 2 + PAD;

const armDir = (th) => [0, Math.cos(th), Math.sin(th)];
const armNrm = (th) => [0, -Math.sin(th), Math.cos(th)];
const onArm = (th, s, off = 0, x = 0) => [x, YS + Math.cos(th) * s - Math.sin(th) * off, ZS + Math.sin(th) * s + Math.cos(th) * off];

// The frame's kick: a turn of HOP about the x-axis through the front sill's nose.
let HOP = 0;
const hopP = (p) => {
  if (!HOP) return p;
  const c = Math.cos(HOP), s = Math.sin(HOP);
  const dy = p[1] - YF, dz = p[2];
  return [p[0], YF + dy * c - dz * s, dy * s + dz * c];
};
const hopD = (d) => {
  if (!HOP) return d;
  const c = Math.cos(HOP), s = Math.sin(HOP);
  return [d[0], d[1] * c - d[2] * s, d[1] * s + d[2] * c];
};
const W = (p) => {
  const q = hopP(p);
  return [q[0] * S, q[1] * S, q[2] * S];
};
const Wd = hopD;
// A frame in metres (origin, axis, u, v) → world units, riding the kick.
const WF = (o, a, u, v) => ({ o: W(o), a: Wd(a), u: Wd(u), v: Wd(v) });

// Physics of one shot. Returns a record the drawing replays (scrubbable).
function simulate(ctrl, ammo) {
  const phi = rad(ctrl.pre);
  const th0 = TH_BUF - rad(ctrl.wind);
  const Ls = ctrl.sling;
  const beta = rad(ctrl.release);
  let mp = ammo.mass;
  const r = ammo.radius;
  const zc = ZTRAY + r;
  const IP = IA + MA * DCG * DCG;
  const tipOf = (th) => [YS + L * Math.cos(th), ZS + L * Math.sin(th)];
  const start = slingRest(th0, Ls, r);
  let free = false;
  let k2 = 0; // pouch drag after release
  const cs = () => 2 * 0.6 * Math.sqrt(KSL * mp);
  const deriv = (y) => {
    const [th, thd, py, pz, vy, vz] = y;
    let tq = 2 * PH.skeinTorque(phi + (TH_BUF - th), { stiffness: KSK, hardening: HARD }) - CSK * thd;
    const d = (th - TH_BUF) * SB;
    if (d > 0) tq -= KB * Math.pow(d, 1.5) * Math.max(0, 1 + 1.5 * HC * thd * SB) * SB;
    let ay = 0, az = -PH.GRAVITY;
    const tp = tipOf(th);
    const tv = [-L * Math.sin(th) * thd, L * Math.cos(th) * thd];
    const dy = py - tp[0], dz = pz - tp[1];
    const dist = Math.hypot(dy, dz) || 1e-9;
    const u = [dy / dist, dz / dist];
    const stretch = dist - Ls;
    const rate = (vy - tv[0]) * u[0] + (vz - tv[1]) * u[1];
    const T = stretch > 0 ? Math.max(0, KSL * stretch + cs() * rate) : 0;
    ay -= (T * u[0]) / mp;
    az -= (T * u[1]) / mp;
    const rr = [tp[0] - YS, tp[1] - ZS];
    tq += rr[0] * (T * u[1]) - rr[1] * (T * u[0]);
    if (!free && pz < zc && py > TRAY[0] && py < TRAY[1]) {
      const N = Math.max(0, 4e5 * (zc - pz) - 2 * Math.sqrt(4e5 * mp) * vz);
      az += N / mp;
      ay -= (0.35 * N * Math.tanh(vy / 0.05)) / mp;
    }
    if (free) {
      const sp = Math.hypot(vy, vz);
      ay -= (k2 * sp * vy) / mp;
      az -= (k2 * sp * vz) / mp;
    }
    return [thd, (tq - MA * PH.GRAVITY * DCG * Math.cos(th)) / IP, vy, vz, ay, az];
  };
  const rk = (y, h) => {
    const k1 = deriv(y);
    const k2_ = deriv(y.map((v, i) => v + (h / 2) * k1[i]));
    const k3 = deriv(y.map((v, i) => v + (h / 2) * k2_[i]));
    const k4 = deriv(y.map((v, i) => v + h * k3[i]));
    return y.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2_[i] + 2 * k3[i] + k4[i]));
  };
  const alphaOf = (y) => {
    const tp = tipOf(y[0]);
    let a = Math.atan2(y[3] - tp[1], y[2] - tp[0]) - y[0];
    while (a > Math.PI) a -= TAU;
    while (a < -Math.PI) a += TAU;
    return a;
  };
  // Angular momentum of the arm (and stone) about the kick pivot, and their weight's moment.
  const Lsys = (y, withStone) => {
    const [th, thd, py, pz, vy, vz] = y;
    const c = [YS + DCG * Math.cos(th), ZS + DCG * Math.sin(th)];
    const vc = [-DCG * Math.sin(th) * thd, DCG * Math.cos(th) * thd];
    let Lv = IA * thd + MA * ((c[0] - YF) * vc[1] - c[1] * vc[0]);
    let Mg = -MA * PH.GRAVITY * (c[0] - YF);
    if (withStone) {
      Lv += mp * ((py - YF) * vz - pz * vy);
      Mg -= mp * PH.GRAVITY * (py - YF);
    }
    return [Lv, Mg];
  };
  const rec = PH.timeline();
  const dt = 1 / 6000;
  let t = 0;
  let y = [th0, 0, start.p[0], start.p[1], 0, 0];
  let armed = false, aPrev = null, release = null, impact = null, lift = null, maxD = 0, maxW = 0;
  let Lprev = null, hop = 0, hopd = 0, maxHop = 0;
  const lands = [];
  let i = 0;
  const push = () => rec.push(TRIG + t, { th: y[0], py: y[2], pz: y[3], rel: free ? 1 : 0, buf: Math.max(0, (y[0] - TH_BUF) * SB), hop });
  push();
  while (t < 3) {
    y = rk(y, dt);
    t += dt;
    i++;
    const th = y[0];
    maxW = Math.max(maxW, y[1]);
    if (lift === null && y[3] > zc + 0.003) lift = t;
    if (!impact && th >= TH_BUF) impact = { t, thd: y[1], ke: 0.5 * IP * y[1] ** 2 };
    maxD = Math.max(maxD, (th - TH_BUF) * SB);
    if (!free) {
      const a = alphaOf(y);
      if (aPrev !== null && a > aPrev && lift !== null) armed = true;
      aPrev = a;
      if ((armed && a >= -beta) || t > 1.2) {
        release = { t, p: [y[2], y[3]], v: [y[4], y[5]], th, rs: ammo.mass };
        free = true;
        mp = 0.4;
        k2 = 0.5 * PH.AIR * 1.2 * 0.05;
        Lprev = null;
      }
    }
    const [Lv, Mg] = Lsys(y, !free);
    if (Lprev !== null) {
      const net = -(Lv - Lprev) / dt + Mg - MF * PH.GRAVITY * (YCF - YF);
      if (hop <= 0 && net <= 0 && hopd <= 0) {
        hop = 0;
        hopd = 0;
      } else {
        hopd += (net / IFR) * dt;
        hop += hopd * dt;
        if (hop < 0) {
          if (-hopd * 4.1 > 0.05) lands.push({ t: TRIG + t, v: -hopd * 4.1 });
          hop = 0;
          hopd = -hopd * 0.15;
        }
      }
      maxHop = Math.max(maxHop, hop);
    }
    Lprev = Lv;
    const fine = !impact || t < impact.t + 0.5;
    if (i % (fine ? 6 : 30) === 0) push();
    if (free && t > release.t + 1.6 && Math.abs(y[1]) < 0.05 && hop === 0) break;
  }
  push();
  const E = 2 * PH.skeinEnergy(phi, phi + rad(ctrl.wind), { stiffness: KSK, hardening: HARD });
  return {
    rec,
    release: { ...release, t: TRIG + release.t },
    impact: impact ? { ...impact, t: TRIG + impact.t } : null,
    lift: TRIG + (lift ?? 0),
    lands,
    end: TRIG + t,
    final: { th: y[0] },
    E,
    maxD,
    maxW,
    maxHop,
  };
}

// Where the loaded stone waits: hanging from the tip, or lying on the tray behind it.
function slingRest(th, Ls, r) {
  const tp = [YS + L * Math.cos(th), ZS + L * Math.sin(th)];
  const zc = ZTRAY + r;
  if (tp[1] - Ls >= zc) return { p: [tp[0], tp[1] - Ls], tray: false };
  return { p: [Math.min(TRAY[1] - r, tp[0] + Math.sqrt(Math.max(0, Ls * Ls - (tp[1] - zc) ** 2))), zc], tray: true };
}

// The empty pouch hung from the side eye: plumb, or lying on the tray when the cord reaches it.
function sideRest(eye, Ls) {
  const zc = ZTRAY + 0.03;
  const x = eye[0] - 0.04;
  if (eye[2] - Ls * 0.97 >= zc) return [x, eye[1], eye[2] - Ls * 0.97];
  return [x, Math.min(TRAY[1] - 0.05, eye[1] + Math.sqrt(Math.max(0, Ls * Ls - (eye[2] - zc) ** 2))), zc];
}

// Windlass rope from the drum's top to the arm's eye.
const eyeAt = (th) => onArm(th, EYE_S, -(sectionAt(EYE_S)[3] / 2 + 0.059));
const ringAt = (th) => onArm(th, RING_S, -sectionAt(RING_S)[3] / 2 + 0.025, RING_X);
const ropeLen = (th) => {
  const e = eyeAt(th);
  return Math.hypot(e[1] - DRUM.y, e[2] - (DRUM.z + DRUM.r));
};
const CLAW_TIP = [CLAW.x, CLAW.y - 0.035, CLAW.z + 0.07];
const stropLen = (wind) => len(sub(ringAt(TH_BUF - rad(wind)), CLAW_TIP));
const HANG_HOOK = [0, DRUM.y - DRUM.r - 0.01, DRUM.z - L_HANG];

const PILE = {
  granite: [[1.45, 1.62], [1.6, 1.62], [1.525, 1.75]],
  pitch: [[1.42, 0.98], [1.6, 1.04]],
  pebbles: [[1.42, 2.3], [1.66, 2.22]],
};
const PICK = { granite: [1.525, 1.67, 0.071 + 0.116], pitch: [1.42, 0.98, 0.096], pebbles: [1.42, 2.3, 0.1] };

export default {
  id: "onager",
  name: "Onager",
  short: "Onager",
  unit: U,
  view: { W: 1000, H: 640, azimuth: 22, elevation: 26, pad: 28, fit: [w(-1.3, -2.65, -0.36), w(2.25, -2.65, -0.36), w(-1.3, 2.6, -0.36), w(2.25, 2.6, -0.36), w(0, -1.25, 3.0), w(0, 0.2, 2.9)] },
  target: { kind: "wall", distance: 200, maxRange: 340, height: 8 },
  ammo: [
    { id: "granite", name: "Stone ball", look: "granite", mass: 4, radius: 0.071, cd: 0.47 },
    { id: "pitch", name: "Pitch ball", look: "lead", mass: 2.5, radius: 0.084, cd: 0.5, fire: true },
    { id: "pebbles", name: "Pebble bag", look: "cluster", mass: 3, radius: 0.1, cd: 0.9 },
  ],
  controls: [
    { id: "pre", name: "Skein pre-twist", min: 40, max: 100, step: 1, value: 70, unit: "°" },
    { id: "wind", name: "Wind (draw-down)", min: 55, max: 82, step: 1, value: 75, unit: "°" },
    { id: "sling", name: "Sling length", min: 0.6, max: 1.0, step: 0.01, value: 0.85, unit: "m", digits: 2 },
    { id: "release", name: "Release angle", min: 70, max: 106, step: 1, value: 86, unit: "°" },
    { id: "distance", name: "Wall distance", min: 100, max: 320, step: 10, value: 200, unit: "m" },
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
    { id: "skein", name: "Skein" },
    { id: "arm", name: "Arm" },
    { id: "sling", name: "Sling" },
    { id: "winch", name: "Windlass" },
    { id: "trigger", name: "Trigger" },
    { id: "buffer", name: "Buffer" },
  ],
  phases: ["rest", "winding", "loading", "armed", "loose", "flight", "impact"],
  hint: "Space · loose   W · wind",
  holdShot: true,

  build(B, M) {
    if (B.mini) return;
    B.plinth({ x: -1.3 * S, y: -2.65 * S, w: 3.55 * S, d: 5.25 * S, r: 10 }, { h: 12, foot: 6, ruler: "y", label: { x: 0.3 * S, y: -2.55 * S, w: 46, d: 22, r: 1.5 } });
    B.halo("frame.halo", [w(-0.95, -2.25, 0), w(0.95, -2.25, 0), w(0.95, 2.2, 0), w(-0.95, 2.2, 0)], 0, { blur: 5 });
    B.halo("pile.halo", [w(1.3, 0.85, 0), w(1.8, 0.85, 0), w(1.8, 2.42, 0), w(1.3, 2.42, 0)], 0, { blur: 3 });
  },

  init(M) {
    return { mode: "rest", wind: 0, load: 0, auto: false, rest: { th: TH_BUF, shot: false }, trig: { open: 0, pin: 0 }, sim: null, wash: rad(M.ctrl.pre), events: [], last: 0 };
  },

  act(M, id) {
    const st = M.state;
    const begin = () => {
      st.mode = "winding";
      st.wind = 0;
      st.from = { th: st.rest.th, open: st.trig.open, pin: st.trig.pin };
      st.hooked = false;
      st.tooth = undefined;
      M.setPhase("winding");
    };
    if (id === "wind" && st.mode === "rest") begin();
    if (id === "loose") {
      if (st.mode === "armed") return this.fire(M);
      if (st.mode === "rest") begin();
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
    const sim = simulate(M.ctrl, M.ammo);
    if (!sim) return;
    st.sim = sim;
    st.mode = "shot";
    st.auto = false;
    const rel = sim.release;
    const flight = M.launch({ p: w(0, rel.p[0], rel.p[1]), v: [0, rel.v[0], rel.v[1]], t0: rel.t, spin: 5 });
    st.flight = flight;
    st.events = [{ t: 0.3, kind: "mallet" }, { t: 0.335, kind: "claw" }, { t: TRIG + 0.04, kind: "swing" }];
    if (sim.impact) st.events.push({ t: sim.impact.t, kind: "buffer" });
    for (const l of sim.lands) st.events.push({ t: l.t, kind: "land", v: l.v });
    st.last = 0;
    const T = Math.max(sim.end, rel.t + flight.impact.t + 2.6);
    M.startShot(T, [[0.3, "trip"], [rel.t, "loose"], ...(sim.impact ? [[sim.impact.t + 0.02, "buffer"]] : []), [rel.t + flight.impact.t, "impact"]]);
    M.setPhase("loose");
  },

  endShot(M) {
    const st = M.state;
    st.rest = { th: st.sim ? st.sim.final.th : TH_BUF, shot: true };
    st.trig = { open: 1, pin: 1 };
    st.mode = "rest";
    M.setPhase("rest");
  },

  tour(M) {
    if (M.state.mode === "rest") this.act(M, "loose");
  },

  update(M, dt) {
    const st = M.state;
    let moving = false;
    const want = rad(M.ctrl.pre);
    if (Math.abs(st.wash - want) > 1e-4) {
      st.wash = M.calm ? want : st.wash + (want - st.wash) * (1 - Math.exp(-dt / 0.25));
      if (Math.abs(st.wash - want) < 1e-4) st.wash = want;
      moving = true;
    }
    if (st.mode === "winding") {
      st.wind = Math.min(1, st.wind + (M.calm ? 1 : dt / 5.2));
      if (st.wind > 0.12) {
        const tooth = Math.floor(Math.abs(st.drum || 0) / (TAU / 12));
        if (st.tooth !== undefined && tooth !== st.tooth) M.sfx?.("click", { pitch: 0.85 + Math.random() * 0.25 });
        st.tooth = tooth;
        if (!st.hooked) (st.hooked = true), M.sfx?.("clank", { pitch: 1.2 });
        if (Math.random() < dt * 1.2) M.sfx?.("creak", { pitch: 0.55 + (st.wind - 0.12) * 0.5 });
      }
      if (st.wind >= 1) {
        st.mode = "loading";
        st.load = 0;
        M.setPhase("loading");
      }
      return true;
    }
    if (st.mode === "loading") {
      const was = st.load;
      st.load = Math.min(1, st.load + (M.calm ? 1 : dt / 1.8));
      if (was < 0.05 && st.load >= 0.05) M.sfx?.("clank", { pitch: 1.4 });
      if (st.load >= 1) {
        M.sfx?.("thunk", { pitch: 1.3 });
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
      // One-off effects as the shot time passes them (scrubbing back re-arms them).
      if (!M.calm) {
        for (const ev of st.events) {
          if (st.last < ev.t && t >= ev.t && t - ev.t < 0.25) this.effect(M, ev);
        }
      }
      if (M.shot.playing && dt > 0) {
        for (const ev of st.events) {
          if (st.last < ev.t && t >= ev.t && t - ev.t < 0.25) this.sound(M, ev);
        }
      }
      st.last = t;
      return true;
    }
    if (st.mode === "armed" && M.ammo.fire) return true;
    return moving;
  },

  sound(M, ev) {
    const sfx = (n, o) => M.sfx?.(n, o);
    if (ev.kind === "mallet") sfx("thunk", { pitch: 1.1, gain: 0.8 });
    if (ev.kind === "claw") sfx("clank", { pitch: 0.9 });
    if (ev.kind === "swing") sfx("whoosh", { size: 0.7, gain: 0.8 });
    if (ev.kind === "buffer") sfx("thud", { pitch: 0.55, size: 1.8, gain: 1 }), sfx("crack", { pitch: 0.7, gain: 0.4 });
    if (ev.kind === "land") sfx("thud", { pitch: 0.8, size: 1.1, gain: clamp(ev.v, 0.2, 0.9) });
  },

  effect(M, ev) {
    const fx = M.fx;
    if (!fx || ev.kind === "mallet" || ev.kind === "claw" || ev.kind === "swing") return;
    if (ev.kind === "buffer") {
      const c = onArm(TH_BUF, SB, CONTACT_OFF);
      fx.emit("dust", w(0, c[1] - 0.05, c[2]), { n: 16, v: [0, -0.6 * S, 0.3 * S], spread: 0.9 * S, size: 0.05 * S, grow: 0.32 * S, life: 1.1, drag: 3, buoy: 0.15 * S, alpha: 0.8 });
      fx.emit("debris", w(0, c[1] - 0.05, c[2]), { n: 8, v: [0, -1.2 * S, 0.8 * S], spread: 1.2 * S, size: 0.012 * S, life: 0.9, grav: 1, drag: 1.5, bounce: 0.2 });
    }
    if (ev.kind === "land") {
      const n = Math.round(clamp(ev.v * 60, 6, 22));
      for (const x of [-0.82, 0.82]) {
        for (const y of [1.88, 2.1]) fx.emit("dust", w(x, y, 0.02), { n: Math.ceil(n / 2), v: [Math.sign(x) * 0.5 * S, 0.3 * S, 0.12 * S], spread: 0.5 * S, size: 0.06 * S, grow: 0.45 * S, life: 1.6, drag: 2.4, buoy: 0.08 * S, alpha: 0.75 });
      }
      fx.emit("dust", w(0, YF, 0.02), { n: 6, v: [0, -0.4 * S, 0.1 * S], spread: 0.4 * S, size: 0.05 * S, grow: 0.3 * S, life: 1.2, drag: 2.4, buoy: 0.05 * S, alpha: 0.6 });
    }
  },

  // The pose the machine is drawn in this frame.
  pose(M) {
    const st = M.state;
    const r = M.ammo.radius;
    const Ls = M.ctrl.sling;
    const th0 = TH_BUF - rad(M.ctrl.wind);
    const base = { wash: st.wash, hop: 0, mallet: 0, pin: st.trig.pin, claw: st.trig.open, Lout: L_HANG, hook: "hang", pawl: "rest", strop: "hang", proj: false, released: false };
    if (st.mode === "shot" && M.shot && st.sim) {
      const t = M.shot.t;
      const f = st.sim.rec.at(t);
      const lift = smoothstep(0.03, 0.22, t);
      const strike = smoothstep(0.22, 0.3, t);
      const mallet = lift - strike;
      const pin = smoothstep(0.29, 0.33, t);
      const claw = smoothstep(0.31, 0.4, t);
      const released = f.rel >= 0.5;
      const relT = st.sim.release.t;
      const side = released ? smoothstep(relT + 0.25, st.sim.end - 0.1, t) : 0;
      return { ...base, th: f.th, py: f.py, pz: f.pz, comp: f.buf, hop: f.hop, mallet, pin, claw, proj: !released, released, side, strop: t < TRIG ? "held" : "free", stropFree: smoothstep(TRIG, TRIG + 0.08, t), shot: true };
    }
    if (st.mode === "winding") {
      const u = st.wind;
      const u1 = smoothstep(0, 0.12, u);
      const u2 = clamp((u - 0.12) / 0.88, 0, 1);
      const th = st.from.th + (th0 - st.from.th) * ease(u2);
      const pin = st.from.pin * (1 - u1);
      const claw = st.from.open * (1 - u1);
      let hook, Lout, hookP;
      if (u < 0.12) {
        hookP = lerp(HANG_HOOK, eyeAt(st.from.th), ease(u1));
        hookP[2] += Math.sin(u1 * Math.PI) * 0.25;
        Lout = lerp([L_HANG, 0, 0], [ropeLen(st.from.th), 0, 0], ease(u1))[0];
        hook = "travel";
      } else {
        Lout = ropeLen(th);
        hook = "arm";
      }
      const sl = { ...this.slingIdle(th, Ls, r), side: 1 - smoothstep(0.9, 1, u) };
      const near = smoothstep(0.86, 1, u);
      return { ...base, th, comp: Math.max(0, (th - TH_BUF) * SB), pin, claw, hook, hookP, Lout, pawl: u < 0.12 ? "up" : "ride", ...sl, strop: near > 0 ? "reach" : "hang", stropReach: near };
    }
    if (st.mode === "loading" || st.mode === "armed") {
      const u = st.mode === "armed" ? 1 : st.load;
      const unhook = smoothstep(0, 0.3, u);
      const stone = smoothstep(0.3, 1, u);
      const rest = slingRest(th0, Ls, r);
      const hookP = lerp(eyeAt(th0), HANG_HOOK, ease(unhook));
      hookP[2] += Math.sin(unhook * Math.PI) * 0.06;
      return { ...base, th: th0, comp: 0, pin: 0, claw: 0, hook: unhook >= 1 ? "hang" : "travel", hookP, Lout: lerp([ropeLen(th0), 0, 0], [L_HANG, 0, 0], ease(unhook))[0], py: rest.p[0], pz: rest.p[1], tray: rest.tray, proj: stone > 0, loading: stone, strop: "held", pawl: "ride" };
    }
    const th = st.rest.th;
    return { ...base, th, comp: Math.max(0, (th - TH_BUF) * SB), ...this.slingIdle(th, Ls, r), strop: "hang" };
  },

  // The empty sling while the arm is not throwing: hangs from the tip, lies on the tray, or
  // (arm up at the buffer) hangs beside the arm from its side eye.
  slingIdle(th, Ls, r) {
    const rest = slingRest(th, Ls, Math.max(r, 0.05));
    return { py: rest.p[0], pz: rest.p[1], side: 1, proj: false, released: false, idle: true };
  },

  draw(B, M) {
    const st = M.state;
    const pose = this.pose(M);
    const mini = !!B.mini;
    // Parts are drawn at rest; the kick turns them as one rigid body (applyKick below).
    HOP = 0;
    const hk = 0;
    const cut = !!M.toggles.cut && !mini;
    B.keep("frame", [hk, cut, mini], () => drawFrame(B, mini));
    B.keep("buffer", [hk, mini], () => drawBuffer(B, 0, mini));
    B.keep("cushion", [hk, (pose.comp || 0).toFixed(4), mini], () => drawCushion(B, pose.comp || 0, mini));
    B.keep("skein", [hk, pose.wash.toFixed(4), pose.th.toFixed(5), cut, mini], () => drawSkein(B, pose.wash, pose.th, cut, mini));
    B.keep("arm", [hk, pose.th.toFixed(5), M.ctrl.release, mini], () => drawArm(B, pose.th, M.ctrl.release, mini));
    if (mini) return;
    B.keep("washers", [hk, pose.wash.toFixed(4)], () => drawWashers(B, pose.wash));
    drawSling(B, M, pose);
    const drumA = pose.Lout / DRUM.r;
    st.drum = drumA;
    const coilW = coilHalf(pose.Lout);
    const lift = pawlLift(pose, drumA);
    const hookP = hookAt(pose);
    B.keep("winchFixed", [hk], () => drawWinchFixed(B));
    B.keep("winchTurn", [hk, drumA.toFixed(4), coilW.toFixed(3)], () => drawWinchTurn(B, drumA, coilW));
    B.keep("pawl", [hk, lift.toFixed(4)], () => drawPawl(B, lift));
    B.keep("winchRope", [hk, hookP.map((v) => v.toFixed(4)).join()], () => drawWinchRope(B, hookP));
    B.keep("trigger", [hk, pose.mallet.toFixed(4), pose.pin.toFixed(3), pose.claw.toFixed(3), M.ctrl.wind], () => drawTrigger(B, M, pose));
    B.keep("strop", [hk, pose.claw.toFixed(3), pose.strop, pose.th.toFixed(4), (pose.stropReach || 0).toFixed(3), (pose.stropFree || 0).toFixed(3), M.ctrl.wind], () => drawStrop(B, M, pose));
    B.keep("pile", [M.ammo.id, !!pose.proj || !!pose.released || (pose.loading ?? 0) > 0], () => drawPile(B, M, pose));
    if (M.toggles.strobe && st.sim && M.shot) drawStrobe(B, M, st.sim, M.shot.t);
    if (!M.gallery) applyKick(M, B, pose.hop || 0);
    if (M.ammo.fire && pose.proj && !M.calm && pose.py !== undefined) {
      const P = w(0, pose.py, pose.pz);
      if (Math.random() < 0.7) M.fx.emit("fire", add(P, [0, 0, M.ammo.radius * S * 1.4]), { v: [0, 0, 0.5 * S], spread: 0.1 * S, size: 0.09 * S, grow: 0.05 * S, life: 0.4, heat: 1, buoy: 0.8 * S, drag: 2 });
      if (Math.random() < 0.25) M.fx.emit("smoke", add(P, [0, 0, M.ammo.radius * S * 2.4]), { v: [0, 0, 0.3 * S], spread: 0.06 * S, size: 0.08 * S, grow: 0.4 * S, life: 1.6, alpha: 0.5, buoy: 0.2 * S, drag: 1.2 });
    }
  },

  occluders(M) {
    return [
      { min: w(IN, BY0, BZ0), max: w(OUT, BY1, BZ1) },
      { min: w(-OUT, BY0, BZ0), max: w(-IN, BY1, BZ1) },
      { min: w(-0.88, -2.1, 0), max: w(0.88, -1.83, BZ0) },
      { min: w(-0.88, 1.85, 0), max: w(0.88, 2.12, BZ0) },
      { min: w(-0.7, UPY - 0.12, XBZ - 0.12), max: w(0.7, UPY + 0.12, XBZ + 0.12) },
    ];
  },

  readouts(M) {
    const st = M.state;
    const pose = this.pose(M);
    const phi = rad(M.ctrl.pre);
    const twist = phi + Math.max(0, TH_BUF - pose.th);
    const torque = 2 * PH.skeinTorque(twist, { stiffness: KSK, hardening: HARD });
    const stored = 2 * PH.skeinEnergy(phi, twist, { stiffness: KSK, hardening: HARD });
    // Rope pull: torque over the rope's lever about the skein (windlass while winding, strop when held).
    let pull = null;
    if (pose.hook === "arm" || pose.strop === "held") {
      const from = pose.hook === "arm" ? eyeAt(pose.th) : ringAt(pose.th);
      const to = pose.hook === "arm" ? [0, DRUM.y, DRUM.z + DRUM.r] : CLAW_TIP;
      const u = unit(sub(to, from));
      const rr = [from[1] - YS, from[2] - ZS];
      const arm = Math.abs(rr[0] * u[2] - rr[1] * u[1]);
      pull = (2 * PH.skeinTorque(twist, { stiffness: KSK, hardening: HARD }) - MA * PH.GRAVITY * DCG * Math.cos(pose.th)) / Math.max(0.2, arm);
    }
    const rows = [
      ["Arm", fmt(deg(pose.th), 1), "°"],
      ["Skein twist", fmtInt(deg(twist)), "°"],
      ["Skein torque", fmt(torque / 1000, 1), "kN·m"],
      ["Stored", fmt(stored / 1000, 1), "kJ"],
      ["Rope pull", pull === null ? "—" : fmt(Math.max(0, pull) / 1000, 1), pull === null ? "" : "kN"],
    ];
    if (st.sim && st.flight) {
      const v = st.sim.release.v;
      const ke = 0.5 * M.ammo.mass * (v[0] ** 2 + v[1] ** 2);
      rows.push(["Launch angle", fmt(deg(Math.atan2(v[1], -v[0])), 1), "°"], ["Efficiency", fmtInt((ke / st.sim.E) * 100), "%"], ["Buffer blow", st.sim.impact ? fmt(st.sim.impact.ke / 1000, 1) : "—", "kJ"], ["Kick", fmt(st.sim.maxHop * (BY1 - YF) * 100, 1), "cm"]);
    }
    return rows;
  },
};

// ---------------- the kick ----------------
// The frame turns by a few hundredths of a radian about its front sill. Rebuilding ~200 parts
// every frame of the hop would cost far more than the 8 ms budget, so the parts are drawn at
// rest and the turn is applied as one screen-space affine map: the least-squares fit of the
// true projected rotation over the machine's bounding box (error under ~1.5 px at the peak).
const NOKICK = /^(plinth|pile|free|strobe|proj|frame\.halo)/;
function kickMatrix(B, phi) {
  const rows = [];
  const tx = [], ty = [];
  for (const x of [-0.95, 0, 0.95]) for (const y of [-2.25, 0, 2.2]) for (const z of [0, 1.3, 2.7]) {
    const p = [x, y, z];
    const c = Math.cos(phi), sn = Math.sin(phi);
    const q = [x, YF + (y - YF) * c - z * sn, (y - YF) * sn + z * c];
    const a = B.at(w(...p)), b = B.at(w(...q));
    rows.push([a[0], a[1], 1]);
    tx.push(b[0]);
    ty.push(b[1]);
  }
  const fit = (t) => {
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const r = [0, 0, 0];
    rows.forEach((row, i) => {
      for (let m = 0; m < 3; m++) {
        r[m] += row[m] * t[i];
        for (let n = 0; n < 3; n++) A[m][n] += row[m] * row[n];
      }
    });
    return PH.solve(A, r);
  };
  const [a, c, e] = fit(tx);
  const [b, d, f] = fit(ty);
  return `matrix(${a.toFixed(6)} ${b.toFixed(6)} ${c.toFixed(6)} ${d.toFixed(6)} ${e.toFixed(3)} ${f.toFixed(3)})`;
}
function applyKick(M, B, phi) {
  const scene = M.scene;
  if (!scene || !scene.parts) return;
  const on = Math.abs(phi) > 2e-5;
  if (!on && !scene.__kicked) return;
  const mat = on ? kickMatrix(B, phi) : null;
  for (const [id, p] of scene.parts) {
    if (!p.el || NOKICK.test(id)) continue;
    if (on) p.el.setAttribute("transform", mat);
    else p.el.removeAttribute("transform");
  }
  scene.__kicked = on;
}

// ---------------- drawing ----------------
// A small iron eye: a short round bar with its bore drawn on both faces (cheaper than a lathe ring).
function eyeRing(B, id, p0, p1, rIn, rOut, o) {
  const L0 = len(sub(p1, p0));
  B.cyl(id, p0, p1, rOut, { ...o, tone: "hi", faceRing: [{ s: 0, r: rIn, tone: "lo" }, { s: L0, r: rIn, tone: "lo" }] });
}
const R3 = (v) => v.map((x) => x * S);
// A squared timber in metres, riding the kick.
function bm(B, id, a, b, wm, hm, up, o = {}) {
  const bands = (o.bands || []).map((band) => ({ at: band.at * S, w: (band.w ?? 0.06) * S, t: (band.t ?? 0.012) * S }));
  const nails = (o.nails || []).map((n) => ({ ...n, s: n.s * S }));
  const pegs = (o.pegs || []).map((n) => ({ ...n, s: n.s * S }));
  return B.beam(id, W(a), W(b), { ...o, w: wm * S, h: hm * S, up: Wd(up), bands, nails, pegs });
}
// An iron strap around a squared timber along `axis` at `c` (all metres).
function strap(B, id, c, axis, up, wm, hm, o = {}) {
  const ax = unit(axis);
  const half = (o.width ?? 0.06) / 2;
  const t = o.t ?? 0.012;
  bm(B, id, sub(c, mul(ax, half)), add(c, mul(ax, half)), wm + 2 * t, hm + 2 * t, up, { mat: "iron", tone: "hi", crease: "lo", sys: o.sys, cut: o.cut, nails: o.nails });
}
// Rounded convex polygon (quadratic corners).
function roundPoly(pts, rr, steps = 3) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const ra = Math.min(rr, da * 0.45), rb = Math.min(rr, db * 0.45);
    const p0 = [p[0] + ((a[0] - p[0]) * ra) / da, p[1] + ((a[1] - p[1]) * ra) / da];
    const p1 = [p[0] + ((b[0] - p[0]) * rb) / db, p[1] + ((b[1] - p[1]) * rb) / db];
    for (let j = 0; j <= steps; j++) {
      const u = j / steps;
      out.push([(1 - u) * (1 - u) * p0[0] + 2 * u * (1 - u) * p[0] + u * u * p1[0], (1 - u) * (1 - u) * p0[1] + 2 * u * (1 - u) * p[1] + u * u * p1[1]]);
    }
  }
  return out;
}

function drawFrame(B, mini) {
  const Z = [0, 0, 1], Y = [0, 1, 0], X = [1, 0, 0];
  const zc = (BZ0 + BZ1) / 2;
  // Ground sills with the side beams pegged on them.
  for (const [y0, y1] of [[-2.1, -1.83], [1.85, 2.12]]) {
    const y = (y0 + y1) / 2;
    bm(B, `sill${y0}`, [-0.88, y, BZ0 / 2], [0.88, y, BZ0 / 2], y1 - y0, BZ0, Z, { mat: "oak", tone: "mid", grain: mini ? 0 : 1, nails: mini ? [] : [{ s: 0.06, face: "v", x: [-0.5, 0.5] }, { s: 1.7, face: "v", x: [-0.5, 0.5] }] });
  }
  // Side beams. The near one is in three lengths so the cutaway can lift out the skein section.
  const CUTS = [-1.36, -0.64];
  for (const sgn of [-1, 1]) {
    const x = sgn * BX;
    const near = sgn > 0;
    const peg = near ? "-u" : "u";
    const nails = mini ? [] : [{ s: -1.965 - BY0, face: "v", x: [-0.45, 0.45] }, { s: 1.985 - BY0, face: "v", x: [-0.45, 0.45] }];
    const segs = [[BY0, CUTS[0] - 0.03], [CUTS[0] + 0.03, CUTS[1] - 0.03], [CUTS[1] + 0.03, BY1]];
    segs.forEach(([y0, y1], i) => {
      bm(B, `beam${sgn}.${i}`, [x, y0, zc], [x, y1, zc], BW, BZ1 - BZ0, Z, { mat: "oak", sys: undefined, grain: mini ? 0 : 2, cut: near && i === 1 ? true : undefined, nails: nails.filter((n) => n.s + BY0 >= y0 && n.s + BY0 <= y1).map((n) => ({ ...n, s: n.s + BY0 - y0 })) });
    });
    if (!mini) CUTS.forEach((y, i) => strap(B, `beamstrap${sgn}.${i}`, [x, y, zc], Y, Z, BW, BZ1 - BZ0, { cut: near ? true : undefined, nails: [{ s: 0.03, face: near ? "-u" : "u", x: 0 }] }));
  }
  // Crosspieces between the beams, through-tenoned and wedged on the outer faces.
  const XP = [["front", -2.12, 0.2, [0.32, 0.56]], ["transom", CLAW.y, 0.2, [0.3, 0.5]], ["bearer", 1.075, 0.15, [0.3, 0.5]], ["rear", 2.09, 0.18, [0.3, 0.5]]];
  for (const [id, y, d, [z0, z1]] of XP) {
    bm(B, `xp.${id}`, [-IN, y, (z0 + z1) / 2], [IN, y, (z0 + z1) / 2], d, z1 - z0, Z, { mat: "oak", tone: "mid", sys: id === "transom" ? "trigger" : undefined, grain: mini ? 0 : 1 });
    if (mini) continue;
    for (const sgn of [-1, 1]) {
      const xo = sgn * OUT;
      bm(B, `tenon.${id}${sgn}`, [xo, y, (z0 + z1) / 2], [xo + sgn * 0.05, y, (z0 + z1) / 2], d * 0.62, (z1 - z0) * 0.62, Z, { mat: "oak", tone: "mid" });
      bm(B, `wedge.${id}${sgn}`, [xo + sgn * 0.05, y, (z0 + z1) / 2], [xo + sgn * 0.075, y, (z0 + z1) / 2], d * 0.2, (z1 - z0) * 0.8, Z, { mat: "oak", tone: "hi" });
    }
  }
  if (mini) return;
  // The loading tray: three planks on the bearer and the rear crosspiece.
  [-0.28, 0, 0.28].forEach((x, i) =>
    bm(B, `tray${i}`, [x, TRAY[0], 0.5 + (ZTRAY - 0.5) / 2], [x, TRAY[1], 0.5 + (ZTRAY - 0.5) / 2], 0.265, ZTRAY - 0.5, Z, { mat: "wood", tone: "mid", sys: "sling", grain: 1, nails: [{ s: 0.075, face: "v", x: [-0.5, 0.5] }, { s: 1.09, face: "v", x: [-0.5, 0.5] }] }),
  );
}

function drawBuffer(B, comp, mini) {
  const Z = [0, 0, 1], Y = [0, 1, 0], X = [1, 0, 0];
  const top = XBZ - 0.12;
  // Uprights on the side beams, shod and strapped; braces forward to the beam ends.
  for (const sgn of [-1, 1]) {
    const x = sgn * BX;
    bm(B, `upright${sgn}`, [x, UPY, BZ1], [x, UPY, top], 0.24, 0.22, Y, { mat: "oak", sys: "buffer", grain: mini ? 0 : 1, bands: mini ? [] : [{ at: 0.12, w: 0.07 }, { at: top - BZ1 - 0.14, w: 0.07 }], pegs: mini ? [] : [{ s: 0.5, face: sgn > 0 ? "u" : "-u", x: 0 }] });
        // Brace cut to sit flat on the beam and flush against the upright's front face.
    const yF = UPY - 0.11;
    const bp = [[-2.21, BZ1], [-2.03, BZ1], [yF, 1.2], [yF, 1.4]].map(([yy, zz]) => [yy * S, zz * S]);
    const xf = x + sgn * 0.085;
    const grainB = mini ? "" : B.L([0.35, 0.65].map((f) => k.pathOf([W([xf, -2.21 + 0.18 * f, BZ1]), W([xf, yF, 1.2 + 0.2 * f])].map(B.at))).join(""), { tone: "faint" });
    B.prism(`brace${sgn}`, WF([x - 0.085, 0, 0], X, Y, Z), bp, 0, 0.17 * S, { mat: "oak", tone: "hi", sys: "buffer", inner: grainB, over: mini ? "" : B.D([W([xf, -2.1, BZ1 + 0.07]), W([xf, yF - 0.05, 1.3])].map(B.at), { size: 0.5, tone: "hi" }) });
  }
  bm(B, "crossbeam", [-0.7, UPY, XBZ], [0.7, UPY, XBZ], 0.24, 0.24, Z, { mat: "oak", sys: "buffer", grain: mini ? 0 : 2, bands: mini ? [] : [{ at: 0.38, w: 0.06 }, { at: 1.02, w: 0.06 }] });
}

function drawCushion(B, comp, mini) {
  const Z = [0, 0, 1], Y = [0, 1, 0], X = [1, 0, 0];
  // The cushion: a stuffed hide sack whose rear face lies along the arm at the stop.
  const d = armDir(TH_BUF), n = armNrm(TH_BUF);
  const face = (s) => add(onArm(TH_BUF, s, CONTACT_OFF), mul(n, -comp * 0.0)).slice(1);
  const back = UPY + 0.12;
  const sq = comp;
  const s0 = 1.16, s1 = 1.72;
  const f0 = face(s0), f1 = face(s1);
  const shift = [n[1] * sq, n[2] * sq];
  const bulge = sq * 0.9;
  const pts = [[back, f0[1] - bulge * 0.4], [f0[0] + shift[0], f0[1] + shift[1] - bulge * 0.3], [f1[0] + shift[0], f1[1] + shift[1] + bulge * 0.3], [back, f1[1] + bulge * 0.4]].map(([yy, zz]) => [yy * S, zz * S]);
  const poly = roundPoly(pts, 0.06 * S, 3);
  const F = WF([0, 0, 0], X, Y, Z);
  const half = 0.34 + bulge * 0.5;
  const seam = mini ? "" : B.L([0.42, 0.68].map((f) => k.pathOf([W([half + 0.001, back + 0.02, lerp(f0, f1, f)[1]]), W([half + 0.001, lerp(f0, f1, f)[0] + shift[0] - 0.02, lerp(f0, f1, f)[1] + shift[1]])].map(B.at))).join(""), { tone: "faint" });
  B.prism("cushion", F, poly, -half * S, half * S, { mat: "hide", tone: "hi", sys: "buffer", inner: seam });
  if (mini) return;
  // Two lashings round the crossbeam and the sack: the hull of both profiles, one rope out.
  const rr = 0.014;
  const prof = [[UPY - 0.12, XBZ - 0.12], [UPY - 0.12, XBZ + 0.12], ...pts.map(([yy, zz]) => [yy / S, zz / S])];
  const hull = G.hullOf(prof);
  const cy = hull.reduce((a, p) => a + p[0], 0) / hull.length, cz = hull.reduce((a, p) => a + p[1], 0) / hull.length;
  const ring = hull.map(([yy, zz]) => {
    const l = Math.hypot(yy - cy, zz - cz) || 1;
    return [yy + ((yy - cy) / l) * rr * 1.3, zz + ((zz - cz) / l) * rr * 1.3];
  });
  for (const x of [-0.17, 0.17]) {
    const loop = [...ring, ring[0]].map(([yy, zz]) => W([x, yy, zz]));
    for (let i = 0; i + 1 < loop.length; i++) B.rope(`lash${x}.${i}`, [loop[i], loop[i + 1]], rr * S, { sys: "buffer", maxLength: 40, twist: false });
  }
}

// Strand lines on a twisted half-skein: helices from the washer end (angle aOut) to the arm (aIn).
function helixLines(B, x0, x1, xIn, xOut, aIn, aOut, r, count) {
  const list = [];
  const segs = 7;
  for (let i = 0; i < count; i++) {
    const a0 = (i / count) * TAU;
    let prev = null;
    for (let j = 0; j <= segs; j++) {
      const x = x0 + ((x1 - x0) * j) / segs;
      const f = clamp((Math.abs(x) - xIn) / (xOut - xIn), 0, 1);
      const a = a0 + aIn + (aOut - aIn) * f;
      const p = [x, YS + r * Math.cos(a), ZS + r * Math.sin(a)];
      const nrm = Wd([0, Math.cos(a), Math.sin(a)]);
      const facing = dot(nrm, B.V);
      const sp = B.at(W(p));
      if (prev) {
        const fa = (facing + prev.facing) / 2;
        const alpha = smoothstep(0.08, 0.5, fa);
        if (alpha > 0.03) list.push({ d: k.pathOf([prev.sp, sp]), alpha });
      }
      prev = { sp, facing };
    }
  }
  return k.fadedSvg(list, { tone: "mid" });
}

function drawSkein(B, wash, th, cut, mini) {
  const rot = th - TH_BUF;
  for (const sgn of [-1, 1]) {
    const x0 = sgn * 0.1;
    const x1 = sgn * (sgn > 0 && cut ? OUT + 0.025 : IN);
    const inner = mini ? "" : helixLines(B, x0, x1, 0.1, OUT + 0.06, rot, wash, SKR, 14);
    const F = WF([x0, YS, ZS], [sgn, 0, 0], [0, 1, 0], [0, 0, sgn]);
    const body = cylFixed(B, `skein${sgn}${x1}`, W([x0, YS, ZS]), W([x1, YS, ZS]), SKR * S);
    const L0 = Math.abs(x1 - x0) * S;
    const face = sgn > 0 && cut ? B.L([0.66, 0.33].map((f) => G.circleOf(F, L0, SKR * f * S, B.P)).join(""), { tone: "lo" }) + B.D(G.dotsOf(F, L0, SKR * 0.5 * S, 9, B.P, { all: true, phase: wash }).concat(G.dotsOf(F, L0, SKR * 0.82 * S, 14, B.P, { all: true, phase: wash })), { size: 0.45, tone: "lo" }) : "";
    B.solid(`skein${sgn}`, body.paths, body.shape, { mat: "sinew", tone: "hi", sys: "skein", inner, over: face });
  }
  if (mini) return;
  // The strands split round the arm: one bundle each side of it, turning with it.
  const n = armNrm(th);
  const off = ARM[0][3] / 2 + 0.045;
  for (const side of [-1, 1]) {
    const c = [0, YS + n[1] * off * side, ZS + n[2] * off * side];
    B.cyl(`strands${side}`, W([-0.1, c[1], c[2]]), W([0.1, c[1], c[2]]), 0.045 * S, { mat: "sinew", tone: "hi", sys: "skein", ribs: { count: 10, twist: 0.6 * side, phase: rot } });
  }
}

function drawWashers(B, wash) {
  const X = [1, 0, 0];
  for (const sgn of [-1, 1]) {
    const near = sgn > 0;
    const o = { sys: "skein", cut: near ? true : undefined };
    const xf = sgn * OUT;
    // Bed plate (counterplate) on the beam's outer face.
    const F0 = WF([xf, YS, ZS], [sgn, 0, 0], [0, 1, 0], [0, 0, 1]);
    const plate = polyRect(0.42 * S, 0.42 * S);
    const corners = [[-0.17, -0.17], [0.17, -0.17], [0.17, 0.17], [-0.17, 0.17]].map(([u, v]) => B.at(W([xf + sgn * 0.025, YS + u, ZS + v])));
    B.prism(`bedplate${sgn}`, F0, plate, 0, 0.025 * S, { mat: "bronze", tone: "hi", ...o, over: B.D(corners, { size: 0.55, tone: "hi" }) });
    // The washer (modiolus), turned by the pre-twist, with its peg holes.
    const x1 = xf + sgn * 0.025, x2 = xf + sgn * 0.095;
    const FW = WF([x1, YS, ZS], [sgn, 0, 0], [0, Math.cos(wash), Math.sin(wash)], [0, -Math.sin(wash) * sgn, Math.cos(wash) * sgn]);
    B.cyl(`washer${sgn}`, W([x1, YS, ZS]), W([x2, YS, ZS]), 0.2 * S, { F: FW, mat: "bronze", tone: "hi", ...o, faceRing: [{ r: 0.135 * S, tone: "lo" }, { r: 0.185 * S, tone: "faint" }], bolts: [{ s: 0.07 * S, r: 0.162 * S, count: 8, phase: Math.PI / 8, size: 0.6, tone: "lo" }] });
    // Cross-bar (the lever bar the skein loops over), rope wrapped round its middle.
    const dir = [0, Math.cos(wash), Math.sin(wash)];
    const nb = [0, -Math.sin(wash), Math.cos(wash)];
    const xc = x2 + sgn * 0.035;
    const cpt = (t) => [xc, YS + dir[1] * t, ZS + dir[2] * t];
    bm(B, `xbar${sgn}.a`, cpt(-0.27), cpt(-0.14), 0.06, 0.07, X, { mat: "iron", tone: "hi", ...o });
    bm(B, `xbar${sgn}.b`, cpt(0.14), cpt(0.27), 0.06, 0.07, X, { mat: "iron", tone: "hi", ...o });
    const sleeve = (t) => [x2 + sgn * 0.0375, YS + dir[1] * t, ZS + dir[2] * t];
    bm(B, `xloop${sgn}`, sleeve(-0.14), sleeve(0.14), 0.1, 0.075, X, { mat: "sinew", tone: "hi", ...o, grain: 3 });
    // Lever on the rim, and the two locking pegs through the washer into the plate.
    const la = wash + Math.PI * 0.5;
    const ld = [0, Math.cos(la), Math.sin(la)];
    const xm = (x1 + x2) / 2;
    bm(B, `lever${sgn}`, [xm, YS + ld[1] * 0.2, ZS + ld[2] * 0.2], [xm, YS + ld[1] * 0.4, ZS + ld[2] * 0.4], 0.045, 0.05, X, { mat: "iron", tone: "hi", ...o });
    B.ball(`leverknob${sgn}`, W([xm, YS + ld[1] * 0.425, ZS + ld[2] * 0.425]), 0.03 * S, { mat: "iron", ...o });
    for (const pa of [wash + Math.PI / 8 + Math.PI / 4, wash + Math.PI / 8 + (5 * Math.PI) / 4]) {
      const pp = [0, YS + 0.162 * Math.cos(pa), ZS + 0.162 * Math.sin(pa)];
      B.cyl(`peg${sgn}${pa.toFixed(2)}`, W([x2, pp[1], pp[2]]), W([x2 + sgn * 0.045, pp[1], pp[2]]), 0.016 * S, { mat: "iron", tone: "hi", ...o, faceRing: [{ r: 0.008 * S, tone: "lo" }] });
    }
  }
}

function drawArm(B, th, release, mini) {
  const d = armDir(th);
  const n = armNrm(th);
  const cuts = [];
  for (const s of BANDS) cuts.push(s - 0.03, s + 0.03);
  const edges = [ARM[0][0], ...cuts, L];
  const o = { sys: "arm" };
  for (let i = 0; i < edges.length - 1; i++) {
    const s0 = edges[i], s1 = edges[i + 1];
    const isBand = i % 2 === 1;
    const sec = sectionAt((s0 + s1) / 2);
    const g = isBand ? 0.024 : 0;
    const opts = isBand ? { mat: "iron", tone: "hi", crease: "lo", ...o, nails: mini ? [] : [{ s: 0.03, face: "-u", x: 0 }] } : { mat: "oak", ...o, grain: !mini && s1 - s0 > 0.3 ? 2 : 0 };
    bm(B, `arm${i}`, onArm(th, s0), onArm(th, s1), sec[2] + g, sec[3] + g, n, opts);
  }
  if (mini) return;
  // Butt shoe, strike pad, tip cap.
  const sh = sectionAt(-0.24);
  bm(B, "arm.shoe", onArm(th, -0.26), onArm(th, -0.25), sh[2] + 0.02, sh[3] + 0.02, n, { mat: "iron", tone: "hi", ...o });
  const pad = sectionAt(SB);
  bm(B, "arm.pad", onArm(th, 1.16, pad[3] / 2 + PAD / 2), onArm(th, 1.72, pad[3] / 2 + PAD / 2), pad[2] - 0.02, PAD, n, { mat: "hide", tone: "hi", sys: "buffer", nails: [{ s: 0.04, face: "v", x: [-0.6, 0.6] }, { s: 0.28, face: "v", x: [-0.6, 0.6] }, { s: 0.52, face: "v", x: [-0.6, 0.6] }] });
  const tc = sectionAt(2.15);
  bm(B, "arm.tipcap", onArm(th, L), onArm(th, L + 0.04), tc[2] + 0.02, tc[3] + 0.02, n, { mat: "iron", tone: "hi", sys: "sling" });
  // Release prong: bent toward the throw by the release setting.
  const bend = rad(clamp(106 - release, 0, 40) * 0.9 + 6);
  const pd = [0, Math.cos(th + bend), Math.sin(th + bend)];
  const p0 = onArm(th, L + 0.04, 0.02);
  const p1 = add(p0, mul(pd, 0.16));
  B.cyl("arm.prong", W(p0), W(p1), 0.016 * S, { mat: "iron", tone: "hi", sys: "sling" });
  B.ball("arm.prongtip", W(p1), 0.024 * S, { mat: "iron", sys: "sling" });
  // Side eye for the sling's fixed cord.
  const se = onArm(th, 2.1, -0.05, -(tc[2] / 2 + 0.014));
  eyeRing(B, "arm.slingeye", W(sub(se, [0.012, 0, 0])), W(add(se, [0.012, 0, 0])), 0.016 * S, 0.03 * S, { mat: "iron", sys: "sling" });
  // Windlass eye under the arm, hanging from a lug.
  const eh = sectionAt(EYE_S)[3] / 2;
  bm(B, "arm.eyelug", onArm(th, EYE_S, -eh), onArm(th, EYE_S, -eh - 0.025), 0.05, 0.05, d, { mat: "iron", tone: "hi", sys: "winch" });
  const e = eyeAt(th);
  eyeRing(B, "arm.eye", W(sub(e, [0.012, 0, 0])), W(add(e, [0.012, 0, 0])), 0.016 * S, 0.034 * S, { mat: "iron", sys: "winch" });
  // Trigger ear on the far side face, with the strop ring through it.
  const rh = sectionAt(RING_S);
  const ex = rh[2] / 2;
  bm(B, "arm.triglug", onArm(th, RING_S, -rh[3] / 2 + 0.025, ex), onArm(th, RING_S, -rh[3] / 2 + 0.025, ex + 0.03), 0.05, 0.05, n, { mat: "iron", tone: "hi", sys: "trigger" });
  const rg = ringAt(th);
  eyeRing(B, "arm.trigring", W(add(rg, mul(d, -0.008))), W(add(rg, mul(d, 0.008))), 0.016 * S, 0.032 * S, { mat: "iron", sys: "trigger" });
}

function drawSling(B, M, pose) {
  const th = pose.th;
  const r = M.ammo.radius;
  const Ls = M.ctrl.sling;
  const tc = sectionAt(2.15);
  const bend = rad(clamp(106 - M.ctrl.release, 0, 40) * 0.9 + 6);
  const pd = [0, Math.cos(th + bend), Math.sin(th + bend)];
  const prongTip = add(onArm(th, L + 0.04, 0.02), mul(pd, 0.13));
  const eye = onArm(th, 2.1, -0.05, -(tc[2] / 2 + 0.014));
  const tip = onArm(th, L);
  // Pouch centre: the record (or rest layout); empty, it hangs beside the arm from the side eye.
  let P = [0, pose.py, pose.pz];
  const side = pose.side || 0;
  if (side > 0) P = lerp(P, sideRest(eye, Ls), side);
  // In the frame's kick, a pouch on the machine rides with it.
  const Pw = pose.proj ? w(...P) : W(P);
  const tipW = W(tip);
  const dir = unit(sub(Pw, tipW));
  const pr = Math.max(r, 0.06) * 1.06;
  const sideV = Wd([1, 0, 0]);
  const loaded = pose.proj && !(pose.loading !== undefined && pose.loading < 1);
  const dist = len(sub(Pw, tipW)) / S;
  const slack = clamp(1 - dist / Ls, 0, 0.6);
  // Cords sag sideways when slack.
  const cord = (from, to, id) => {
    const a = W(from);
    const mid = lerp(a, to, 0.5);
    const sag = slack * Ls * S * 0.45;
    const m2 = add(mid, mul([0, 0, -1], sag));
    B.rope(id, [a, m2, to], 0.011 * S, { sys: "sling", thin: 2 });
  };
  const ends = loaded || (pose.loading !== undefined && pose.loading > 0) ? [add(Pw, mul(sideV, -pr * S * 0.85)), add(Pw, mul(sideV, pr * S * 0.85))] : [add(Pw, mul(sideV, -0.03 * S)), add(Pw, mul(sideV, 0.03 * S))];
  cord(eye, ends[1], "sling.fixed");
  if (pose.released) {
    // The loop has left the prong: it trails from the pouch.
    const back = add(ends[0], mul(unit(add(mul(dir, -0.4), [0, 0, -1])), Ls * 0.4 * S));
    B.rope("sling.loose", [ends[0], lerp(ends[0], back, 0.5), back], 0.011 * S, { sys: "sling", thin: 2 });
  } else {
    cord(prongTip, ends[0], "sling.loop");
    eyeRing(B, "sling.ring", W(sub(prongTip, [0.01, 0, 0])), W(add(prongTip, [0.01, 0, 0])), 0.016 * S, 0.028 * S, { mat: "iron", sys: "sling" });
  }
  // Leather pouch: cupping the stone, or an empty fold.
  if (loaded || (pose.loading !== undefined && pose.loading > 0.7)) {
    const toward = dot(B.V, dir);
    B.turned("sling.pouch", G.frameAlong(Pw, dir), [[-0.25 * pr * S, pr * S], [0.25 * pr * S, pr * 0.97 * S, 1], [0.7 * pr * S, pr * 0.72 * S, 1], [1.05 * pr * S, pr * 0.2 * S]], { mat: "hide", sys: "sling", smooth: false, bias: toward > 0 ? r * S : -r * S, key: dot(B.V, Pw) + (toward > 0 ? 0.6 : -0.6) * r * S });
  } else {
    B.ball("sling.pouch", add(Pw, mul(dir, 0.012 * S)), 0.045 * S, { mat: "hide", sys: "sling", steps: 16 });
  }
  if (pose.proj) {
    let c = Pw;
    if (pose.loading !== undefined && pose.loading < 1) {
      const from = w(...PICK[M.ammo.id]);
      const u = ease(pose.loading);
      c = lerp(from, Pw, u);
      c[2] += Math.sin(u * Math.PI) * 0.9 * S;
    }
    drawAmmo(B, M.ammo, "proj", c, r * S, { seed: 5, sys: "sling" });
  }
}

function drawAmmo(B, ammo, id, c, rr, o = {}) {
  if (ammo.id === "pitch") {
    // A ball of pitch bound with tow.
    B.ball(id, c, rr, { mat: "pitch", tone: "hi", lit: o.lit, sys: o.sys, over: B.L([0, 1].map((i) => G.arcOf(G.frameAlong(c, i ? [1, 0.3, 0.2] : [0.2, 1, 0.5]), 0, rr * 1.005, B.P)).join(""), { tone: "mid" }) });
  } else looks.draw(ammo.look, B, id, c, rr, o);
}

// The windlass in four memo blocks: what never moves, what turns with the drum, the pawl
// riding the ratchet, and the rope with its hook.
function drawWinchFixed(B) {
  const o = { sys: "winch" };
  B.cyl("winch.stubN", W([OUT, DRUM.y, DRUM.z]), W([OUT + 0.012, DRUM.y, DRUM.z]), 0.05 * S, { mat: "iron", ...o });
  for (const sgn of [-1, 1]) {
    const xs = sgn * OUT;
    const near = sgn > 0;
    const h0 = xs + sgn * (near ? 0.072 : 0.012);
    B.cyl(`winch.stub${sgn}`, W([near ? xs + 0.062 : xs, DRUM.y, DRUM.z]), W([h0, DRUM.y, DRUM.z]), 0.05 * S, { mat: "iron", ...o });
  }
  const piv = PAWL_PIV;
  B.cyl("winch.pawlpin", W([OUT, piv[1], piv[2]]), W([OUT + 0.0195, piv[1], piv[2]]), 0.018 * S, { mat: "iron", ...o });
  B.cyl("winch.pawlhead", W([OUT + 0.0545, piv[1], piv[2]]), W([OUT + 0.068, piv[1], piv[2]]), 0.026 * S, { mat: "iron", tone: "hi", ...o, faceRing: [{ r: 0.012 * S, tone: "lo" }] });
}
const PAWL_PIV = [OUT + 0.037, DRUM.y + 0.27, DRUM.z + 0.16];
const coilHalf = (Lout) => clamp((Math.max(0, ROPE_ALL - Lout) / (TAU * DRUM.r)) * 0.028, 0.03, 0.3) / 2;

function drawWinchTurn(B, drumA, coilW) {
  const X = [1, 0, 0];
  const o = { sys: "winch" };
  const rot = (a) => WF([0, DRUM.y, DRUM.z], X, [0, Math.cos(a), Math.sin(a)], [0, -Math.sin(a), Math.cos(a)]);
  // Drum in two lengths either side of the coiled rope: fixed bodies, turning stave lines.
  const ribs = (c, r, count, twist) => k.fadedSvg(G.ribsOf(c.F, 0, c.L0, r, count, B.P, { fade: [0.1, 0.55], twist, phase: drumA }), { tone: "lo" });
  const cw = coilW.toFixed(3);
  const dl = cylFixed(B, `drumL${cw}`, W([-IN, DRUM.y, DRUM.z]), W([-coilW, DRUM.y, DRUM.z]), DRUM.r * S);
  B.solid("winch.drumL", dl.paths, dl.shape, { mat: "oak", tone: "hi", ...o, inner: ribs(dl, DRUM.r * S, 14, 0) });
  const dr = cylFixed(B, `drumR${cw}`, W([coilW, DRUM.y, DRUM.z]), W([IN, DRUM.y, DRUM.z]), DRUM.r * S);
  B.solid("winch.drumR", dr.paths, dr.shape, { mat: "oak", tone: "hi", ...o, inner: ribs(dr, DRUM.r * S, 14, 0) });
  const co = cylFixed(B, `coil${cw}`, W([-coilW, DRUM.y, DRUM.z]), W([coilW, DRUM.y, DRUM.z]), (DRUM.r + 0.022) * S);
  B.solid("winch.coil", co.paths, co.shape, { mat: "rope", tone: "hi", ...o, inner: ribs(co, (DRUM.r + 0.022) * S, 26, 0.5) });
  // Ratchet, capstan heads and hand-spikes outside the beams.
  B.toothed("winch.ratchet", { ...rot(drumA), o: W([OUT + 0.012, DRUM.y, DRUM.z]) }, polySaw(0.13 * S, 0.17 * S, 12, 0), 0, 0.05 * S, { mat: "iron", ...o, tone: "hi" });
  for (const sgn of [-1, 1]) {
    const near = sgn > 0;
    const h0 = sgn * OUT + sgn * (near ? 0.072 : 0.012);
    const R = rot(drumA);
    const hubLen = 0.17;
    B.prism(`winch.hub${sgn}`, { o: W([Math.min(h0, h0 + sgn * hubLen), DRUM.y, DRUM.z]), a: Wd(X), u: R.u, v: R.v }, polyRect(0.2 * S, 0.2 * S), 0, hubLen * S, { mat: "oak", ...o });
    const xm = h0 + (sgn * hubLen) / 2;
    for (let i = 0; i < 4; i++) {
      const a = drumA + (i * Math.PI) / 2;
      const dv = [0, Math.cos(a), Math.sin(a)];
      bm(B, `winch.spike${sgn}.${i}`, [xm, DRUM.y + dv[1] * 0.1, DRUM.z + dv[2] * 0.1], [xm, DRUM.y + dv[1] * 0.42, DRUM.z + dv[2] * 0.42], 0.045, 0.045, X, { mat: "oak", tone: "hi", ...o });
    }
  }
}

// The pawl rides the ratchet: it climbs each tooth's slope and drops off its face (a click).
function pawlLift(pose, drumA) {
  const tooth = (((-drumA / (TAU / 12)) % 1) + 1) % 1;
  return pose.pawl === "up" ? 0.05 : pose.pawl === "ride" ? 0.026 * (1 - tooth) : 0;
}
function drawPawl(B, lift) {
  const piv = PAWL_PIV;
  const cy = 0.17 * Math.cos(rad(62)) - 0.27, cz = 0.17 * Math.sin(rad(62)) - 0.16;
  const plen = Math.hypot(cy, cz);
  const ang = Math.atan2(cz, cy) - lift / plen;
  const tipP = [piv[0], piv[1] + Math.cos(ang) * plen, piv[2] + Math.sin(ang) * plen];
  bm(B, "winch.pawl", piv, tipP, 0.035, 0.045, [0, -Math.sin(ang), Math.cos(ang)], { mat: "iron", tone: "hi", sys: "winch" });
}

function hookAt(pose) {
  if (pose.hook === "arm") return eyeAt(pose.th);
  if (pose.hook === "travel") return pose.hookP;
  return HANG_HOOK;
}
function drawWinchRope(B, hookP) {
  const o = { sys: "winch" };
  const top = [0, DRUM.y, DRUM.z + DRUM.r];
  const start = hookP[2] < DRUM.z ? [0, DRUM.y - DRUM.r, DRUM.z] : hookP[1] < DRUM.y - 0.05 ? add([0, DRUM.y, DRUM.z], mul(unit(sub(hookP, [0, DRUM.y, DRUM.z])), DRUM.r)) : top;
  B.rope("winch.rope", [W(start), W(add(hookP, [0, 0, 0.03]))], 0.014 * S, { ...o, thin: 3 });
  bm(B, "winch.hook", add(hookP, [0, 0, 0.03]), add(hookP, [0, 0, -0.035]), 0.022, 0.03, [0, 1, 0], { mat: "iron", tone: "hi", ...o });
}

// Turned bodies whose outline never changes are built once per builder (a camera change
// brings a new builder) and re-emitted with fresh line work.
const PATHS = new WeakMap();
function cylFixed(B, key, p0, p1, r) {
  let m = PATHS.get(B);
  if (!m) PATHS.set(B, (m = new Map()));
  let c = m.get(key);
  if (!c) {
    const L0 = len(sub(p1, p0));
    const F = G.frameAlong(p0, sub(p1, p0));
    const paths = r * B.KS < 6 ? extrudeAlong(F, polyCircle(r, 16), 0, L0, B.P) : G.disc(0, L0, r, F, B.P, {});
    const R = r / Math.cos(Math.PI / 12);
    const ring = (sv) => Array.from({ length: 12 }, (_, i) => framePoint(F, sv, R * Math.cos((i / 12) * TAU), R * Math.sin((i / 12) * TAU)));
    c = { F, L0, paths, shape: shapeOf([...ring(0), ...ring(L0)], { axes: [F.a], edges: [F.a, F.u, F.v] }) };
    m.set(key, c);
  }
  return c;
}

function drawTrigger(B, M, pose) {
  const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
  const o = { sys: "trigger" };
  const cz = CLAW.z;
  // Bronze block bolted on the transom; claw between two cheeks.
  bm(B, "trig.block", [-0.04, CLAW.y, 0.545], [0.22, CLAW.y, 0.545], 0.14, 0.09, Z, { mat: "bronze", tone: "hi", ...o, nails: [{ s: 0.03, face: "v", x: [-0.6, 0.6] }, { s: 0.23, face: "v", x: [-0.6, 0.6] }] });
  for (const dx of [-0.045, 0.045]) bm(B, `trig.cheek${dx}`, [CLAW.x + dx - 0.007, CLAW.y, 0.64], [CLAW.x + dx + 0.007, CLAW.y, 0.64], 0.09, 0.1, Z, { mat: "iron", tone: "hi", ...o });
  B.cyl("trig.clawpin", W([CLAW.x - 0.06, CLAW.y, cz]), W([CLAW.x + 0.06, CLAW.y, cz]), 0.012 * S, { mat: "iron", ...o, faceRing: [{ r: 0.006 * S, tone: "lo" }] });
  // Claw: shank up from the pin, hook bent forward over the strop ring; opens backward.
  const a = rad(-75) * pose.claw;
  const up = [0, -Math.sin(a), Math.cos(a)];
  const fw = [0, -Math.cos(a), -Math.sin(a)];
  const top = add([CLAW.x, CLAW.y, cz], mul(up, 0.1));
  bm(B, "trig.claw", add([CLAW.x, CLAW.y, cz], mul(up, -0.02)), top, 0.035, 0.032, fw, { mat: "iron", tone: "hi", ...o });
  bm(B, "trig.clawhook", add(top, mul(up, -0.013)), add(add(top, mul(up, -0.013)), mul(fw, 0.06)), 0.035, 0.026, up, { mat: "iron", tone: "hi", ...o });
  // Release pin: its head stands on the block until the mallet drives it down.
  const pz = 0.59 + 0.03 * (1 - pose.pin);
  B.cyl("trig.pin", W([PIN_X, CLAW.y, 0.59]), W([PIN_X, CLAW.y, pz + 0.001]), 0.014 * S, { mat: "iron", ...o });
  B.cyl("trig.pinhead", W([PIN_X, CLAW.y, pz]), W([PIN_X, CLAW.y, pz + 0.018]), 0.026 * S, { mat: "iron", tone: "hi", ...o, faceRing: [{ r: 0.014 * S, tone: "lo" }] });
  // Mallet: butt on the near beam, head resting on the pin; lifts and strikes.
  const butt = [-BX - 0.05, CLAW.y, BZ1 + 0.022];
  // The swing stays under the cocked arm: the head may rise only to just below it.
  const th0 = TH_BUF - rad(M.ctrl.wind);
  const sArm = (CLAW.y - YS) / Math.cos(th0);
  const under = ZS + sArm * Math.sin(th0) - sectionAt(sArm)[3] / 2 / Math.cos(th0);
  const rise = clamp(under - 0.04 - 0.776, 0.05, 0.3);
  const swing = Math.asin(rise / 0.66) * pose.mallet;
  const headC = [PIN_X, CLAW.y, 0.59 + 0.03 * (1 - pose.pin) + 0.018 + 0.07];
  const rotM = (p) => {
    const dx = p[0] - butt[0], dz = p[2] - butt[2];
    const c = Math.cos(-swing), s = Math.sin(-swing);
    return [butt[0] + dx * c + dz * s, p[1], butt[2] - dx * s + dz * c];
  };
  const hc = rotM(headC);
  const hAxis = unit(sub(rotM(add(headC, [0, 0, 0.07])), hc));
  B.cyl("trig.malletHead", W(sub(hc, mul(hAxis, 0.07))), W(add(hc, mul(hAxis, 0.07))), 0.045 * S, { mat: "oak", tone: "hi", ...o, faceRing: [{ r: 0.03 * S, tone: "faint" }] });
  const hs = rotM(add(headC, [-0.045, 0, 0]));
  bm(B, "trig.malletHandle", hs, rotM(butt), 0.028, 0.03, Y, { mat: "oak", tone: "hi", ...o });
}

function drawStrop(B, M, pose) {
  const o = { sys: "trigger" };
  const a = rad(-75) * pose.claw;
  const up = [0, -Math.sin(a), Math.cos(a)];
  const fw = [0, -Math.cos(a), -Math.sin(a)];
  const cz = CLAW.z;
  // The strop from the arm's trigger ring.
  const ring = ringAt(pose.th);
  const hookTip = add([CLAW.x, CLAW.y, cz], add(mul(up, 0.07), mul(fw, 0.035)));
  const ell = stropLen(M.ctrl.wind);
  let pts;
  if (pose.strop === "held") pts = [ring, lerp(ring, hookTip, 0.5), hookTip];
  else if (pose.strop === "free") {
    const d = armDir(pose.th), n = armNrm(pose.th);
    const fr = pose.stropFree ?? 1;
    const end = lerp(hookTip, add(ring, add(mul(d, -ell * 0.7), mul(n, -ell * 0.5))), fr);
    pts = [ring, lerp(ring, end, 0.5), end];
  } else {
    const hang = add(ring, [0, 0, -ell]);
    hang[2] = Math.max(hang[2], 0.6);
    const end = pose.strop === "reach" ? lerp(hang, hookTip, ease(pose.stropReach)) : hang;
    const mid = lerp(ring, end, 0.5);
    const sag = Math.max(0, ell - len(sub(end, ring))) * 0.5;
    pts = [ring, add(mid, [0, sag * 0.4, -sag]), end];
  }
  B.rope("trig.strop", pts.map(W), 0.013 * S, { ...o, thin: 2 });
  eyeRing(B, "trig.stropring", W(sub(pts[2], [0.008, 0, 0])), W(add(pts[2], [0.008, 0, 0])), 0.012 * S, 0.026 * S, { mat: "iron", ...o });
}

function drawPile(B, M, pose) {
  const id = M.ammo.id;
  const taken = !!pose.proj || !!pose.released || (pose.loading ?? 0) > 0;
  // Granite: three on the ground, one on top.
  PILE.granite.forEach(([x, y], i) => {
    looks.stone(B, `pile.g${i}`, w(x, y, 0.071), 0.071 * S, { mat: "granite", lit: id === "granite", seed: i + 2 });
  });
  if (!(id === "granite" && taken)) looks.stone(B, "pile.g3", w(...PICK.granite), 0.071 * S, { mat: "granite", lit: id === "granite", seed: 9 });
  // Pitch balls on a straw mat.
  B.slab("pile.mat", { x: 1.31 * S, y: 0.86 * S, w: 0.42 * S, d: 0.3 * S, r: 2 }, 0, 0.012 * S, { mat: "rope", tone: "mid", steps: 2 });
  PILE.pitch.forEach(([x, y], i) => {
    if (id === "pitch" && taken && i === 0) return;
    drawAmmo(B, M.def.ammo[1], `pile.p${i}`, w(x, y, 0.012 + 0.084), 0.084 * S, { lit: id === "pitch" });
  });
  PILE.pebbles.forEach(([x, y], i) => {
    if (id === "pebbles" && taken && i === 0) return;
    looks.cluster(B, `pile.b${i}`, w(x, y, 0.1), 0.1 * S, { lit: id === "pebbles", seed: 4 + i });
  });
}

function drawStrobe(B, M, sim, now) {
  const lines = [];
  const pts = [];
  const step = 0.012;
  const t1 = Math.min(now, (sim.impact ? sim.impact.t : sim.release.t) + 0.04);
  for (let t = TRIG; t <= t1; t += step) {
    const f = sim.rec.at(t);
    const tip = onArm(f.th, L);
    lines.push(k.pathOf([B.at(w(...onArm(f.th, -0.2))), B.at(w(...tip))]));
    if (!f.rel) {
      lines.push(k.pathOf([B.at(w(...tip)), B.at(w(0, f.py, f.pz))]));
      pts.push(B.at(w(0, f.py, f.pz)));
    }
  }
  const path = [];
  for (let t = TRIG; t <= Math.min(now, sim.release.t); t += 1 / 1500) {
    const f = sim.rec.at(t);
    path.push(B.at(w(0.01, f.py, f.pz)));
  }
  const svg = B.L(lines.join(""), { tone: "lo" }) + (path.length > 1 ? `<path class="iso-line" data-tone="lit" style="stroke:var(--accent);stroke-width:1.2px" d="${k.pathOf(path)}"/>` : "") + B.D(pts, { size: 1.4, tone: "mid" });
  B.marks("strobe", svg, [w(0, 0, 4)], { r: 300, layer: 6 });
}

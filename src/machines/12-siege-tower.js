// Siege tower (helepolis): a five-storey tapering timber tower on eight iron-tyred solid wheels,
// hauled to a city wall by two capstans, with shuttered ports, scorpios behind the top-storey ports,
// a small stone-thrower on the roof and a boarding bridge that drops onto the battlements.
// Authored in metres (S converts to world units). Sources: Diodorus XX.91 (the helepolis at Rhodes,
// 305 BC: square base, nine storeys, front and sides plated with iron, ports with shutters raised by
// machinery, eight wheels, moved by men), Vitruvius X.13 (towers tapering by a fifth, storeys, hides),
// Roman practice (boarding bridge, capstans and rope drives).
//
// TRUTH
//   Tower 8.4 m square at the sills, 6.0 m at the roof deck (17.0 m), gallows to 19.4 m; 5 storeys.
//   Mass from its timbers (seasoned fir, 480 kg/m³), oak wheels, iron tyres and plate, hides, engines
//   and bridge: 65.2 t, plus 75 kg for every man of the capstan crew (68 t with 40 men).
//   Rolling resistance R = μr m g with μr = 0.03 on a planked, levelled track (20 kN with 40 men).
//   Drive: two capstans (hands at r 1.45 m, drum r 0.24 m) each wind a rope that runs over a sheave to
//   a drum (r 0.30 m) on a driven axle; wheels r 0.70 m. Tower speed / hand speed k = 0.386, so the
//   rope drive multiplies the crew's push by 1/k ≈ 2.6 (η 0.85).
//   A man on a bar pushes F = F0 (1 − v_hand / v_max), F0 400 N, v_max 3.0 m/s.
//   m_eff dv/dt = n F η / k − R: below ~24 men the tower will not move; 40 men → 0.5 m/s, 64 → 0.7 m/s.
//   The crew stops pushing in time to coast to the stop 0.8 m from the wall face.
//   Sway: the tower pitches on its wheels (0.9 Hz, ζ 0.07), driven by acceleration and track bumps.
//   Bridge 3.6 × 2.4 m, 900 kg, hinged at the top-storey floor, held at 80° by two ropes over the
//   gallows pulleys to a braked windlass:  (I + I_d ℓ'²/r²) θ'' = −m g L/2 cos θ − β ℓ'² θ'  (β the rope
//   brake on the payout ℓ), slamming onto the merlon at −4° with restitution 0.25:
//   brake 0 % → 2.3 s, tip 6.9 m/s;  60 % → 4.5 s, 3.1 m/s;  100 % → 7.3 s, 2.0 m/s.
//   Scorpios (3-span, 0.69 m 0.2 kg bolts): two sinew skeins, τ = k t (1 + 0.6 t²), k 600 N·m/rad,
//   arms 0.5 m swing 62° → 20° (1170 J stored): (2I + m b'²) φ'' + m b' b'' φ'² = −2τ(φ) → 68.7 m/s.
//   Roof palintone (1.8 kg stones, 2.4 kg fire pots): arms 0.6 m, k 900 N·m/rad → 28.8 / 26.8 m/s.
//   Ports: a top-hinged shutter clears a shot only if it opens past the line of fire (the scorpios,
//   aimed 28° down, need 21°; below that the bolt strikes the shutter).
//
// PARTS (≈ 150 tower + wall and ground)
//   base: 2 sole beams, 3 cross sills, 3 deck boards, 4 axles (2 split at their rope drums),
//         8 wheels (4 near with iron hubs, axle caps, studs and battens), track with kerbs
//   frame: 20 corner posts, 15 floor boards (with ladder hatches), 10 braces, 5 ladders, 5 water casks
//   skin: 5 hide-covered near panels with iron leading plates and port frames, 5 far panels,
//         10 front panels (door and two ports in the top storey), roof parapet screens
//   drive: 2 capstans (drum, head, 4 bars, spindle, socket, bearing beam), 2 sheaves in cheeks,
//         2 hauling ropes, 2 axle drums
//   ports: 4 side and 2 front shutters with lifting ropes; 2 scorpios (stand, joint, stock, slider,
//         frame, washers, arms, string, windlass); a bolt rack
//   bridge: deck, iron-shod lip, hinge sill with iron eyes, 2 ropes, gallows (2 posts, beam, 2 blocks,
//         2 pulleys), windlass (drum, cheeks, spike hub, 2 spikes, brake lever)
//   roof: palintone (base, post, joint, stock, slider, frame, washers, arms, string), pots, stones
//   wall: footing, body with coursing, string course, breastwork, 4 merlons, inner parapet,
//         2 mantlets, stuck bolts, fallen stones, scorch
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { add, sub, mul, dot, cross, unit, len, lerp, clamp, rad, deg, ease, smoothstep, fmt, fmtInt, TAU, rng } from "../engine/vec.js";
import * as PH from "../engine/physics.js";
import * as looks from "../engine/looks.js";
import { polyRect, frameFrom, extrudeAlong } from "../engine/geo.js";
import { shapeOf } from "../engine/scene.js";

const U = 0.1;
const S = 1 / U;
const w = (x, y, z) => [x * S, y * S, z * S];
const W = (p) => [p[0] * S, p[1] * S, p[2] * S];
const G9 = PH.GRAVITY;

// ---------------- the tower (local metres; world at the stop by the wall) ----------------
const HB = 4.2; // half-size of the base frame
const ZS0 = 0.42, ZS1 = 1.02; // sole beams
const RW = 0.7, ZA = 0.71, RA = 0.13; // wheel radius, axle height, axle radius
const AXY = [-3.1, -1.05, 1.05, 3.1];
const XW0 = 4.33, XW1 = 4.83, XHUB = 4.95, XEND = 5.05;
const LV = [1.42, 5.0, 8.2, 11.3, 14.3, 17.0]; // floor tops: deck, storeys 1–4, roof
const FT = 0.3, POST = 0.36, CLAD = 0.1;
const ZROOF = LV[5];
const TAPER = 1.2 / (ZROOF - ZS1);
const SL = Math.hypot(1, TAPER);
const hw = (z) => HB - TAPER * (Math.max(z, ZS1) - ZS1);
const floorHalf = (i) => (i === 0 ? HB : hw(LV[i] - FT) + CLAD + 0.1);
const LADX = [-1.7, 1.3, -1.7, 1.3, -1.0]; // ladder in each storey (rises into the floor above)
const DECK = HB + 0.12; // the deck boards overhang the sills, like every floor band
const GAP = 0.8; // front sill to the wall face at the stop
const DMAX = 12;

// ---------------- the wall ----------------
const WY = -(HB + GAP);
const WX0 = -6.0, WX1 = 3.4, WT = 3.4;
const ZWALK = 12.3, ZBREAST = 13.25, ZMER = 14.15, ZINNER = 13.05;
const MERLONS = [-4.7, -2.1, 0.5, 3.1].map((c) => [Math.max(WX0, c - 0.8), Math.min(WX1, c + 0.8)]);
const MANTLETS = [{ id: "a", x: 1.8, y: WY - 2.25 }, { id: "b", x: -1.6, y: WY - 2.0 }];
const PL = { x0: -7.0, x1: 7.2, y0: -10.6, y1: HB + DMAX - GAP + 1.6 };

// ---------------- drive ----------------
const DRV = { hand: 1.45, bar: 1.62, rCap: 0.24, rDrum: 0.3, F0: 400, vMax: 3.0, eta: 0.85, mu: 0.03 };
const KDRV = (DRV.rCap / DRV.hand) * (RW / DRV.rDrum);
const CAPS = [
  { x: 0.76, y: -2.05, ax: 1, side: 1, spin: -1 },
  { x: 0.76, y: 2.05, ax: 2, side: -1, spin: 1 },
];
const ZCAP0 = LV[0] + 0.15, ZCAPD = 2.55, ZHEAD = 2.95, ZBAR = 2.76;
const RSHV = 0.2, ZSHV = 1.62, ZROPE = ZSHV + RSHV, XROPE = 1.0;
// each rope leaves its axle drum on the +y side (pull up → the axle turns the tower toward the wall)
for (const c of CAPS) {
  c.yd = AXY[c.ax] + DRV.rDrum;
  c.sy = c.yd - c.side * RSHV;
}
const DRUMX = [0.6, 1.4];

// ---------------- bridge ----------------
const BR = { L: 3.6, W: 2.4, T: 0.2, m: 900, y: -3.6, z: LV[4], sa: 3.3, th0: rad(80), e: 0.25 };
const PUL = { y: -2.4, z: 19.27, x: 1.15, r: 0.15 };
const BWIN = { y: -1.3, z: 17.5, r: 0.2 };
const CONTACT = [WY - 0.7, ZMER];
const TH_C = Math.atan2(CONTACT[1] - BR.z, BR.y - CONTACT[0]);

// ---------------- ports ----------------
const ZD = 16.1, ZP0 = 14.8; // top storey door head and port sill
const SIDE_PORTS = [
  { st: 1, y: -1.4 },
  { st: 2, y: 0.9 },
  { st: 3, y: -1.4 },
  { st: 4, y: 0.9 },
].map((p) => ({ ...p, z0: LV[p.st] + 1.05, z1: LV[p.st] + 1.65, w: 0.62 }));
const FRONT_PORTS = [2.2, -1.55].map((x) => ({ x, z0: ZP0, z1: ZD, w: 0.6 }));

// ---------------- engines ----------------
const SCORP = {
  a: 0.2, La: 0.5, Ls2: 0.72, k: 600, h: 0.6, tw0: 0.5, ph0: rad(20), ph1: rad(62), Ia: 0.12, sk: 0.61,
  stock: [-0.85, 0.5, 0.07, 0.12], slider: [-0.12, 0.3, 0.05, 0.05], frame: [0.5, 0.72, 0.34, -0.2, 0.26], wash: [0.075, 0.05], arm: [0.06, 0.07], win: [-0.78, 0.24, -0.2, 0.05], line: 0.065,
};
const PALIN = {
  a: 0.25, La: 0.6, Ls2: 0.85, k: 900, h: 0.6, tw0: 0.5, ph0: rad(20), ph1: rad(60), Ia: 1.4, sk: 0.75,
  stock: [-1.05, 0.62, 0.09, 0.15], slider: [-0.15, 0.3, 0.07, 0.06], frame: [0.62, 0.88, 0.42, -0.25, 0.33], wash: [0.095, 0.06], arm: [0.08, 0.09], win: [-0.95, 0.3, -0.25, 0.065], line: 0.085,
};
const ENGINES = {
  scA: { E: SCORP, P0: [2.2, -2.15, 15.65], target: [1.9, MANTLETS[0].y + 0.02, 13.0], port: 0, rest: [0, 0] },
  scB: { E: SCORP, P0: [-1.55, -2.15, 15.65], target: [-1.0, MANTLETS[1].y + 0.02, 13.1], port: 1, rest: [0, 0] },
  pa: { E: PALIN, P0: [2.05, -2.55, 17.95], targets: { pots: [1.75, WY - 1.7, ZWALK], stones: [2.85, WY - 0.45, ZMER] }, rest: [rad(-20), 0] },
};
const TRIG = 0.14;
const bOf = (E, ph) => E.La * Math.sin(ph) + Math.sqrt(Math.max(1e-6, E.Ls2 ** 2 - (E.a + E.La * Math.cos(ph)) ** 2));

// ---------------- mass ----------------
const MASS = (() => {
  let V = 2 * 2 * HB * 0.36 + 3 * 2 * (HB - 0.6) * 0.36;
  for (let i = 0; i <= 5; i++) V += (2 * floorHalf(i)) ** 2 * 0.17;
  for (let i = 0; i < 5; i++) {
    const zb = LV[i], zt = LV[i + 1] - FT, h = zt - zb, hm = hw((zb + zt) / 2);
    V += 4 * POST * POST * h * SL + 3 * 2 * hm * h * CLAD + 2 * 0.18 * 0.12 * Math.hypot(2 * hm, h);
  }
  const timber = V * 480;
  const wheels = 8 * Math.PI * RW * RW * (XW1 - XW0) * 650;
  const iron = 8 * TAU * RW * (XW1 - XW0) * 0.012 * 7800 + 1500;
  const other = 300 + 1000 + BR.m + 800 + 400 + 4 * Math.PI * RA * RA * 9.6 * 650;
  return { timber, wheels, iron, total: timber + wheels + iron + other, wheel: wheels / 8 };
})();
const massOf = (M) => MASS.total + M.ctrl.crew * 75;
const resistOf = (M) => DRV.mu * massOf(M) * G9;
const towerForce = (n, v) => (n * DRV.F0 * Math.max(0, 1 - Math.abs(v) / KDRV / DRV.vMax) * DRV.eta) / KDRV;

// ---------------- wall hit boxes (metres) ----------------
const BOXES = (() => {
  const b = [];
  b.push({ kind: "wall", body: true, min: [WX0, WY - WT, 0.6], max: [WX1, WY, ZWALK] });
  b.push({ kind: "footing", min: [WX0, WY - WT - 0.4, 0], max: [WX1, WY + 0.4, 0.6] });
  b.push({ kind: "parapet", min: [WX0, WY - 0.7, ZWALK], max: [WX1, WY, ZBREAST] });
  MERLONS.forEach(([x0, x1]) => b.push({ kind: "merlon", min: [x0, WY - 0.7, ZBREAST], max: [x1, WY, ZMER] }));
  b.push({ kind: "parapet", min: [WX0, WY - WT, ZWALK], max: [WX1, WY - WT + 0.4, ZINNER] });
  MANTLETS.forEach((m) => b.push({ kind: "mantlet", wood: true, id: m.id, min: [m.x - 0.75, m.y - 0.08, ZWALK], max: [m.x + 0.75, m.y, ZWALK + 1.3] }));
  return b;
})();
const floorUnder = (q) => {
  if (q[0] < WX0 || q[0] > WX1) return 0;
  if (q[1] > WY + 0.4 || q[1] < WY - WT - 0.4) return 0;
  if (q[1] > WY) return 0.6;
  if (q[1] > WY - 0.7) return ZBREAST;
  if (q[1] > WY - WT + 0.4) return ZWALK;
  return ZINNER;
};

// ---------------- small helpers ----------------
const approach = (x, to, step) => (x < to ? Math.min(to, x + step) : Math.max(to, x - step));
function panelFrame(face, zb) {
  const h = hw(zb);
  if (face === "+x") return { o: [h, 0, zb], a: unit([1, 0, TAPER]), u: [0, 1, 0], v: unit([-TAPER, 0, 1]) };
  if (face === "-x") return { o: [-h, 0, zb], a: unit([-1, 0, TAPER]), u: [0, -1, 0], v: unit([TAPER, 0, 1]) };
  return { o: [0, -h, zb], a: unit([0, -1, TAPER]), u: [1, 0, 0], v: unit([0, TAPER, 1]) };
}
const facePt = (F, lat, z, s = 0) => add(add(add(F.o, mul(F.u, lat)), mul(F.v, (z - F.o[2]) * SL)), mul(F.a, s));
const panelLat = (face, z) => (face === "+x" ? [-(hw(z) + CLAD), hw(z)] : face === "-x" ? [-hw(z), hw(z) + CLAD] : [-hw(z), hw(z)]);
const ln = (B, pts) => k.pathOf(pts.map((p) => B.at(W(p))));

// A tangent route over a pulley in the y–z plane: from A, over the top of circle (C, r), to Bp.
function overPulley(A, C, r, Bp, x) {
  const tan = (P, sign) => {
    const dy = P[1] - C[1], dz = P[2] - C[2];
    const d = Math.hypot(dy, dz);
    const base = Math.atan2(dz, dy);
    const beta = Math.acos(clamp(r / d, -1, 1));
    return base + sign * beta;
  };
  const a0 = tan(A, -1);
  const a1 = tan(Bp, 1);
  const pts = [A];
  const steps = 5;
  let from = a0, to = a1;
  if (to > from) to -= TAU;
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    pts.push([x, C[1] + r * Math.cos(a), C[2] + r * Math.sin(a)]);
  }
  pts.push(Bp);
  return pts;
}

// ---------------- physics ----------------
function simBridge(brake) {
  const I = (BR.m * BR.L * BR.L) / 3 + 60 * BR.L * BR.L;
  const Id = 26;
  const beta = 5200 * (brake / 100) ** 1.3;
  const Pp = [PUL.y, PUL.z];
  const ell = (th) => Math.hypot(BR.y - BR.sa * Math.cos(th) - Pp[0], BR.z + BR.sa * Math.sin(th) - Pp[1]);
  const dl = (th) => (ell(th + 1e-5) - ell(th - 1e-5)) / 2e-5;
  const torqueG = (th) => (BR.m + 120) * G9 * (BR.L / 2) * Math.cos(th);
  const f = (t, y) => {
    const [th, om] = y;
    const l1 = dl(th);
    const ldot = l1 * om;
    const rope = ldot > 0 ? beta * l1 * l1 * om : 0;
    const Ieff = I + Id * (l1 / BWIN.r) ** 2 * (ldot > 0 ? 1 : 0);
    return [om, (-torqueG(th) - rope - 25 * om) / Ieff];
  };
  const rec = PH.timeline();
  let y = [BR.th0, 0];
  let t = 0;
  const dt = 1 / 1200;
  let impact = null, rest = null, bounces = 0, i = 0;
  rec.push(0, { th: y[0], om: 0 });
  while (t < 30) {
    y = PH.rk4(f, t, y, dt);
    t += dt;
    if (y[0] <= TH_C && y[1] < 0) {
      if (!impact) impact = { t, om: y[1], tip: Math.abs(y[1]) * BR.L, at: Math.abs(y[1]) * Math.hypot(BR.y - CONTACT[0], BR.z - CONTACT[1]) };
      bounces++;
      y = [TH_C, -BR.e * y[1]];
      if (Math.abs(y[1]) < 0.03 || bounces > 6) {
        y = [TH_C, 0];
        rest = t;
        rec.push(t, { th: TH_C, om: 0 });
        break;
      }
      rec.push(t, { th: TH_C, om: y[1] });
    }
    if (i++ % 5 === 0) rec.push(t, { th: y[0], om: y[1] });
  }
  if (!rest) rest = t;
  rec.push(rest + 1.4, { th: TH_C, om: 0 });
  return { rec, impact, rest, T: rest + 1.4, ell };
}

// One torsion engine's release: arms from drawn φ1 to braced φ0 with the projectile on the string.
const engineCache = new Map();
function simEngine(E, m) {
  const key = `${E.k}:${m}`;
  if (engineCache.has(key)) return engineCache.get(key);
  const tau = (ph) => PH.skeinTorque(E.tw0 + (ph - E.ph0), { stiffness: E.k, hardening: E.h });
  const db = (ph) => (bOf(E, ph + 1e-5) - bOf(E, ph - 1e-5)) / 2e-5;
  const ddb = (ph) => (bOf(E, ph + 1e-4) - 2 * bOf(E, ph) + bOf(E, ph - 1e-4)) / 1e-8;
  const f = (t, y) => {
    const [ph, om] = y;
    const b1 = db(ph), b2 = ddb(ph);
    return [om, (-2 * tau(ph) - m * b1 * b2 * om * om) / (2 * E.Ia + m * b1 * b1)];
  };
  const rec = PH.timeline();
  let y = [E.ph1, 0];
  let t = 0;
  const dt = 1 / 40000;
  let i = 0;
  rec.push(0, { ph: E.ph1 });
  while (y[0] > E.ph0 + 0.004 && t < 0.6) {
    y = PH.rk4(f, t, y, dt);
    t += dt;
    if (i++ % 20 === 0) rec.push(t, { ph: y[0] });
  }
  const v = Math.abs(db(y[0]) * y[1]);
  const tRel = t;
  const om = y[1];
  for (let j = 1; j <= 40; j++) {
    const tt = j / 400;
    rec.push(tRel + tt, { ph: E.ph0 + (om * 0.006) * Math.exp(-tt / 0.02) * Math.sin(tt * 160) });
  }
  let stored = 0;
  for (let j = 0; j < 64; j++) stored += 2 * tau(E.ph0 + ((E.ph1 - E.ph0) * (j + 0.5)) / 64) * ((E.ph1 - E.ph0) / 64);
  const out = { rec, tRel, v, stored, eff: (0.5 * m * v * v) / stored };
  engineCache.set(key, out);
  return out;
}

// Engine frame: f fires, l is lateral, n is up for a level stock.
function engineFrame(P0, gamma, psi) {
  const f = [Math.sin(psi) * Math.cos(gamma), -Math.cos(psi) * Math.cos(gamma), Math.sin(gamma)];
  const l = [Math.cos(psi), Math.sin(psi), 0];
  const n = cross(f, l);
  const at = (s, lat = 0, up = 0) => add(add(add(P0, mul(f, s)), mul(l, lat)), mul(n, up));
  return { f, l, n, at };
}
const projMass = (ammo) => ammo.mass + (ammo.look === "bolt" ? 0 : 0.25);
const releaseOf = (eng, gamma, psi, ammo) => {
  const E = eng.E;
  const Fr = engineFrame(eng.P0, gamma, psi);
  const sN = E.sk - bOf(E, E.ph0);
  return ammo.look === "bolt" ? Fr.at(sN + ammo.length, 0, E.line) : Fr.at(sN + ammo.radius, 0, E.line + ammo.radius);
};
function aimAt(eng, ammo, target) {
  const sim = simEngine(eng.E, projMass(ammo));
  let psi = Math.atan2(target[0] - eng.P0[0], eng.P0[1] - target[1]);
  let gamma = Math.atan2(target[2] - eng.P0[2], Math.hypot(target[0] - eng.P0[0], target[1] - eng.P0[1]));
  for (let i = 0; i < 5; i++) {
    const r = releaseOf(eng, gamma, psi, ammo);
    const dh = Math.hypot(target[0] - r[0], target[1] - r[1]);
    const dz = target[2] - r[2];
    const t = Math.hypot(dh, dz) / sim.v;
    gamma = Math.atan2(dz + 0.5 * G9 * t * t, dh);
    psi = Math.atan2(target[0] - r[0], r[1] - target[1]) * 0.5 + psi * 0.5;
  }
  return { gamma, psi, v: sim.v };
}

// Shutter of a front port in the y–z plane at angle alpha: hinge and lower edge.
function frontShutter(port, alpha) {
  const F = panelFrame("-y", LV[4]);
  const H = facePt(F, port.x, port.z1 + 0.05, CLAD);
  const down = mul(F.v, -1);
  const d = add(mul(down, Math.cos(alpha)), mul(F.a, Math.sin(alpha)));
  const Ls = port.z1 - port.z0 + 0.12;
  return { H, end: add(H, mul(d, Ls)), d, Ls, F };
}
// Smallest opening that clears a line of fire through a front port.
function clearance(port, p0, dir) {
  for (let a = 0; a <= 90; a += 1) {
    const sh = frontShutter(port, rad(a));
    if (!segHitsShutter(p0, add(p0, mul(dir, 3)), sh, port)) return rad(a);
  }
  return rad(91);
}
// The opening the near scorpio's line of fire needs at its usual aim (fixed by the geometry).
let PORT_NEED = null;
function portNeed(M) {
  if (PORT_NEED === null) {
    const eng = ENGINES.scA, bolt = M.def.ammo[0];
    const aim = aimAt(eng, bolt, eng.target);
    PORT_NEED = clearance(FRONT_PORTS[eng.port], releaseOf(eng, aim.gamma, aim.psi, bolt), engineFrame(eng.P0, aim.gamma, aim.psi).f);
  }
  return PORT_NEED;
}
function segHitsShutter(p0, p1, sh, port) {
  const ay = sh.H[1], az = sh.H[2], by = sh.end[1], bz = sh.end[2];
  const ry = p1[1] - p0[1], rz = p1[2] - p0[2];
  const sy = by - ay, sz = bz - az;
  const den = ry * sz - rz * sy;
  if (Math.abs(den) < 1e-9) return null;
  const qy = ay - p0[1], qz = az - p0[2];
  const u = (qy * sz - qz * sy) / den;
  const v = (qy * rz - qz * ry) / den;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  const x = p0[0] + (p1[0] - p0[0]) * u;
  if (Math.abs(x - port.x) > port.w / 2 + 0.06) return null;
  return { u };
}

function segBox(p0, p1, b) {
  let t0 = 0, t1 = 1, axis = -1, sign = 0;
  for (let c = 0; c < 3; c++) {
    const d = p1[c] - p0[c];
    if (Math.abs(d) < 1e-12) {
      if (p0[c] < b.min[c] || p0[c] > b.max[c]) return null;
      continue;
    }
    let ta = (b.min[c] - p0[c]) / d, tb = (b.max[c] - p0[c]) / d;
    let sg = -1;
    if (ta > tb) {
      [ta, tb] = [tb, ta];
      sg = 1;
    }
    if (ta > t0) {
      t0 = ta;
      axis = c;
      sign = sg;
    }
    if (tb < t1) t1 = tb;
    if (t0 > t1) return null;
  }
  if (axis < 0) return null;
  const n = [0, 0, 0];
  n[axis] = sign;
  return { u: t0, n };
}

// The first thing a recorded flight strikes: a shutter, the wall, a mantlet or the ground.
function strikeOf(flight, shutter, extra = []) {
  const ts = flight.track.ts, fr = flight.track.frames;
  for (let i = 0; i + 1 < fr.length; i++) {
    const p0 = fr[i].p, p1 = fr[i + 1].p;
    let best = null;
    if (shutter) {
      const h = segHitsShutter(p0, p1, shutter.sh, shutter.port);
      if (h) best = { u: h.u, n: [0, 1, 0], kind: "shutter", wood: true };
    }
    for (const b of extra.length ? BOXES.concat(extra) : BOXES) {
      const h = segBox(p0, p1, b);
      if (h && (!best || h.u < best.u)) best = { u: h.u, n: h.n, kind: b.body && h.n[2] > 0.5 ? "wall walk" : b.kind, wood: !!b.wood, id: b.id };
    }
    if (best) {
      const t = ts[i] + (ts[i + 1] - ts[i]) * best.u;
      return { t, p: lerp(p0, p1, best.u), v: lerp(fr[i].v, fr[i + 1].v, best.u), n: best.n, what: { kind: best.kind, material: best.wood ? "wood" : "stone", id: best.id } };
    }
  }
  const imp = flight.impact;
  return { t: imp.t, p: imp.p, v: imp.v, n: [0, 0, 1], what: { kind: "ground", material: "earth" } };
}

// ---------------- the machine ----------------
export default {
  id: "siege-tower",
  name: "Siege Tower",
  short: "Tower",
  unit: U,
  view: {
    W: 1000,
    H: 640,
    azimuth: 20,
    elevation: 24,
    pad: 22,
    fit: [w(PL.x0, PL.y0, -1.4), w(PL.x1, PL.y0, -1.4), w(PL.x0, PL.y1, -1.4), w(PL.x1, PL.y1, -1.4), w(0, PUL.y, PUL.z + 0.3), w(0, PUL.y + DMAX - GAP, PUL.z + 0.3), w(WX0, WY, ZMER)],
  },
  target: null,
  ammo: [
    { id: "bolts", name: "Bolt volley", look: "bolt", mass: 0.2, radius: 0.012, cd: 1.6, length: 0.69, shaft: 0.012 },
    { id: "pots", name: "Fire pots", look: "pot", mass: 2.4, radius: 0.085, cd: 0.6, fire: true },
    { id: "stones", name: "Stones", look: "stone", mass: 1.8, radius: 0.055, cd: 0.47 },
  ],
  controls: [
    { id: "crew", name: "Crew on capstans", min: 8, max: 64, step: 4, value: 40, unit: "men" },
    { id: "distance", name: "Start distance", min: 3, max: DMAX, step: 1, value: 8, unit: "m" },
    { id: "brake", name: "Bridge brake", min: 0, max: 100, step: 5, value: 60, unit: "%" },
    { id: "ports", name: "Ports open", min: 0, max: 100, step: 5, value: 80, unit: "%" },
  ],
  actions: [
    { id: "advance", name: "Advance", key: "a", hold: true },
    { id: "ports", name: "Open ports", key: "o" },
    { id: "loose", name: "Loose", key: " ", primary: true },
    { id: "bridge", name: "Drop bridge", key: "b" },
  ],
  toggles: [
    { id: "cut", name: "Cutaway" },
    { id: "strobe", name: "Strobe" },
  ],
  focus: [
    { id: "wheels", name: "Wheels & axles" },
    { id: "capstans", name: "Capstans" },
    { id: "floors", name: "Floors & ladders" },
    { id: "ports", name: "Ports & shutters" },
    { id: "bridge", name: "Drawbridge" },
    { id: "cladding", name: "Cladding" },
  ],
  phases: ["rest", "roll", "halt", "ports", "draw", "loose", "impact", "drop", "board"],
  hint: "A · advance   O · ports   Space · loose   B · bridge",
  tourGap: 7,

  build(B, M) {
    B.plinth({ x: PL.x0 * S, y: PL.y0 * S, w: (PL.x1 - PL.x0) * S, d: (PL.y1 - PL.y0) * S, r: 10 }, { h: 9, foot: 5, ruler: "y", label: { x: (PL.x1 - 7.4) * S, y: (PL.y1 - 3.4) * S, w: 46, d: 20, r: 1.5 } });
    buildTrack(B);
    buildWall(B);
    buildTower(B);
  },

  init(M) {
    const d = clamp(M.ctrl.distance, 3, DMAX);
    return {
      d, v: 0, acc: 0, s: 0, drive: 0, dir: 1, goal: GAP, holding: false, holdAt: 0, stalled: false, push: 0,
      sway: 0, swayV: 0,
      openGoal: 0, alpha: 0,
      queue: [], mode: "idle", drawT: 0, plan: null,
      eng: { scA: { gamma: 0, psi: 0, slider: "fwd", drawn: false, loaded: null }, scB: { gamma: 0, psi: 0, slider: "fwd", drawn: false, loaded: null }, pa: { gamma: ENGINES.pa.rest[0], psi: 0, slider: "fwd", drawn: false, loaded: null } },
      bridge: { th: BR.th0, down: false, raise: null },
      bsim: null, vsim: null, last: null, bridgeImpact: null,
      hits: [], stones: [], scorch: [], fires: [], charred: {},
      volley: 0, tour: 0, prevD: d,
    };
  },

  act(M, id, down) {
    const st = M.state;
    if (id === "advance") {
      if (down) {
        if (this.busy(st)) return;
        if (st.drive && st.dir > 0 && !st.holding) {
          st.drive = 0;
          st.queue = [];
          return;
        }
        if (st.d <= GAP + 0.005 || st.bridge.down) return;
        st.queue = [];
        Object.assign(st, { drive: 1, dir: 1, goal: GAP, holding: true, holdAt: performance.now() });
      } else if (st.holding) {
        st.holding = false;
        if (performance.now() - st.holdAt > 350) st.drive = 0;
      }
      return;
    }
    if (!down || this.busy(st)) return;
    if (id === "ports") {
      st.openGoal = st.openGoal > 0.5 ? 0 : 1;
      M.sfx?.("creak", { pitch: 1.4, gain: 0.5 });
      return;
    }
    if (id === "loose") {
      if (st.queue.length) return;
      const q = [];
      if (st.d > GAP + 0.005) q.push("advance");
      if (st.openGoal < 0.5 && M.ammo.id === "bolts") q.push("ports");
      q.push("draw", "fire");
      st.queue = q;
      return;
    }
    if (id === "bridge") {
      if (st.queue.length) return;
      if (st.bridge.down) {
        st.bridge.raise = { t: 0, from: st.bridge.th, dur: 5.5 };
        st.bridge.down = false;
        return;
      }
      const q = [];
      if (st.d > GAP + 0.005) q.push("advance");
      q.push("drop");
      st.queue = q;
    }
  },

  busy(st) {
    return st.mode === "shot" || st.mode === "bridge" || !!st.bridge.raise;
  },

  onControl(M, id) {
    const st = M.state;
    if (id === "distance" && st && st.mode === "idle" && !st.drive && st.v === 0 && !st.queue.length && !st.bridge.down && !st.bridge.raise) {
      st.d = clamp(M.ctrl.distance, 3, DMAX);
      M.fx.setOccluders(this.occluders(M));
    }
  },

  onAmmo(M) {
    M.dirty = true;
  },

  // ---- shots ----
  planShots(M) {
    const st = M.state;
    const ammo = M.ammo;
    const R = rng(st.volley * 13 + 7 + M.ammoIndex * 101);
    const jit = (p, a, b) => [p[0] + (R() - 0.5) * a, p[1] + (R() - 0.5) * b, p[2] + (R() - 0.5) * 0.25];
    const shots = [];
    if (ammo.id === "bolts") {
      for (const name of ["scA", "scB"]) {
        const eng = ENGINES[name];
        // with the bridge down, the far engine keeps its bolts clear of it and works the merlon
        const base = name === "scB" && st.bridge.down ? [-1.95, MANTLETS[1].y + 0.02, 13.1] : eng.target;
        const tgt = jit(base, 0.35, 0.05);
        shots.push({ name, tgt, ...aimAt(eng, ammo, tgt) });
      }
    } else {
      const eng = ENGINES.pa;
      const tgt = jit(eng.targets[ammo.id], 0.3, 0.3);
      shots.push({ name: "pa", tgt, ...aimAt(eng, ammo, tgt) });
    }
    st.plan = { ammo: ammo.id, shots, from: Object.fromEntries(shots.map((s) => [s.name, { gamma: st.eng[s.name].gamma, psi: st.eng[s.name].psi, slider: st.eng[s.name].slider }])) };
  },

  fire(M) {
    const st = M.state;
    const ammo = M.ammo;
    if (!st.plan) this.planShots(M);
    st.volley++;
    const shots = [];
    st.plan.shots.forEach((pl, i) => {
      const eng = ENGINES[pl.name];
      const sim = simEngine(eng.E, projMass(ammo));
      const t0 = i * 0.24;
      const tRel = t0 + TRIG + sim.tRel;
      const Fr = engineFrame(eng.P0, pl.gamma, pl.psi);
      const p = releaseOf(eng, pl.gamma, pl.psi, ammo);
      const v = mul(Fr.f, sim.v);
      const flight = M.launch ? M.launch({ p: W(p), v, t0: tRel, ammo, spin: 5 }) : null;
      if (!flight) return;
      let shutter = null;
      if (eng.port !== undefined) {
        const port = FRONT_PORTS[eng.port];
        shutter = { port, sh: frontShutter(port, st.alpha) };
      }
      const hit = strikeOf(flight, shutter, st.bridge.down ? [{ kind: "bridge", wood: true, min: [-BR.W / 2, BR.y - BR.L * Math.cos(TH_C), BR.z - 0.3], max: [BR.W / 2, BR.y, BR.z + BR.T + 0.05] }] : []);
      flight.impact = { t: hit.t, p: hit.p, v: hit.v, what: hit.what };
      flight.energyHit = 0.5 * ammo.mass * Math.hypot(...hit.v) ** 2;
      const shot = { name: pl.name, eng, sim, t0, tRel, tImp: tRel + hit.t, flight, hit, gamma: pl.gamma, psi: pl.psi, dir: unit(hit.v), ammo, inside: hit.what.kind === "shutter" };
      if (ammo.id === "stones") {
        const n = hit.n;
        const vn = dot(hit.v, n);
        const vr = sub(mul(sub(hit.v, mul(n, vn)), 0.1), mul(n, vn * 0.15));
        shot.fall = PH.flight({ p: add(hit.p, mul(n, ammo.radius * 1.05)), v: vr, mass: ammo.mass, area: Math.PI * ammo.radius ** 2, cd: 0.47, ground: (q) => floorUnder(q) + ammo.radius });
      }
      shots.push(shot);
    });
    M.flight = null;
    if (!shots.length) return;
    M.lastFlight = shots[0].flight;
    for (const s of shots) {
      const e = st.eng[s.name];
      Object.assign(e, { gamma: s.gamma, psi: s.psi, slider: "back", drawn: false, loaded: null });
    }
    const end = Math.max(...shots.map((s) => s.tImp + (s.fall ? s.fall.impact.t : 0)));
    st.vsim = { shots, T: end + (ammo.fire ? 2.6 : 1.8), fired: {} };
    st.last = "volley";
    st.mode = "shot";
    st.plan = null;
    M.startShot(st.vsim.T, [[0, "trip"], [shots[0].tRel, "loose"], [Math.min(...shots.map((s) => s.tImp)), "impact"]]);
    M.setPhase("loose");
  },

  dropBridge(M) {
    const st = M.state;
    const sim = simBridge(M.ctrl.brake);
    st.bsim = sim;
    st.last = "bridge";
    st.mode = "bridge";
    st.bridgeImpact = sim.impact ? sim.impact.tip : null;
    M.startShot(sim.T, [[0, "release"], [sim.impact ? sim.impact.t : sim.rest, "slam"], [sim.rest, "rest"]]);
    M.setPhase("drop");
    M.sfx?.("creak", { pitch: 0.7, gain: 0.6 });
  },

  endShot(M) {
    const st = M.state;
    if (st.mode === "bridge") {
      st.bridge.th = TH_C;
      st.bridge.down = true;
    }
    if (st.mode === "shot" && st.vsim) {
      for (const s of st.vsim.shots) this.keepHit(st, s);
      st.vsim.done = true;
    }
    st.mode = "idle";
  },

  keepHit(st, s) {
    if (s.ammo.look === "bolt") {
      st.hits.push({ p: s.hit.p, dir: s.dir, inside: s.inside, alpha: st.alpha, kind: s.hit.what.kind, port: s.eng.port });
      while (st.hits.length > 6) st.hits.shift();
    } else if (s.ammo.id === "stones") {
      st.stones.push(s.fall ? s.fall.impact.p : s.hit.p);
      while (st.stones.length > 4) st.stones.shift();
    } else {
      st.scorch.push({ p: s.hit.p, n: s.hit.n });
      while (st.scorch.length > 4) st.scorch.shift();
      if (s.hit.what.id) st.charred[s.hit.what.id] = true;
    }
  },

  tour(M) {
    const st = M.state;
    if (this.busy(st) || st.queue.length || st.drive || st.v > 0) return;
    const step = st.tour++ % 4;
    if (step === 0) {
      this.act(M, "loose", true);
    } else if (step === 1) {
      this.act(M, "loose", true);
    } else if (step === 2) {
      if (!st.bridge.down) this.act(M, "bridge", true);
    } else {
      if (st.bridge.down) this.act(M, "bridge", true);
      st.queue = ["withdraw"];
    }
  },

  // ---- motion ----
  update(M, dt) {
    const st = M.state;
    let moving = false;
    // the queue of steps behind Loose and Drop bridge
    const head = st.queue[0];
    if (head === "advance") {
      if (st.d > GAP + 0.005) {
        if (!st.drive) Object.assign(st, { drive: 1, dir: 1, goal: GAP, holding: false });
      } else if (st.v === 0) st.queue.shift();
    } else if (head === "withdraw") {
      if (!st.bridge.raise && !st.bridge.down) {
        const goal = clamp(M.ctrl.distance, 3, DMAX);
        if (st.d < goal - 1e-3) {
          if (!st.drive) Object.assign(st, { drive: 1, dir: -1, goal, holding: false });
        } else if (st.v === 0) {
          st.queue.shift();
          st.drive = 0;
        }
      }
    } else if (head === "ports") {
      st.openGoal = 1;
      const goal = rad(90) * (M.ctrl.ports / 100);
      if (Math.abs(st.alpha - goal) < 1e-3) st.queue.shift();
    } else if (head === "draw") {
      if (!st.plan || st.plan.ammo !== M.ammo.id) {
        this.planShots(M);
        st.drawT = 0;
        const need = st.plan.shots.some((s) => !(st.eng[s.name].drawn && st.eng[s.name].loaded === M.ammo.id));
        if (!need) st.drawT = 1;
        else M.sfx?.("creak", { pitch: 1.1, gain: 0.5 });
      }
      st.drawT = Math.min(1, st.drawT + dt / 1.7);
      moving = true;
      if (st.drawT >= 1) {
        for (const s of st.plan.shots) Object.assign(st.eng[s.name], { gamma: s.gamma, psi: s.psi, drawn: true, slider: "drawn", loaded: M.ammo.id });
        st.queue.shift();
      }
    } else if (head === "fire") {
      st.queue.shift();
      this.fire(M);
    } else if (head === "drop") {
      st.queue.shift();
      this.dropBridge(M);
    }

    // tower: crew force against rolling resistance
    if (st.drive || st.v > 0) {
      this.stepTower(M, dt);
      moving = true;
      // a pawl clicks at every quarter turn of the capstans; the axles creak
      if (Math.abs(st.s - (st.sndS ?? 0)) > (Math.PI / 2) * DRV.rCap * (RW / DRV.rDrum)) {
        st.sndS = st.s;
        M.sfx?.("click", { gain: 0.4 });
      }
      if (Math.abs(st.s - (st.sndW ?? 0)) > 1.7) {
        st.sndW = st.s;
        M.sfx?.("creak", { pitch: 0.55, gain: 0.35 });
      }
    }
    // sway on the wheels
    const om = TAU * 0.9;
    const bump = st.v * 0.05 * Math.sin((st.s * TAU) / 1.15) + st.v * 0.025 * Math.sin((st.s * TAU) / 0.43 + 1.3);
    if (st.v > 0 || Math.abs(st.sway) > 2e-5 || Math.abs(st.swayV) > 2e-5) {
      const n = Math.max(1, Math.ceil(dt / (1 / 240)));
      for (let i = 0; i < n; i++) {
        const h = dt / n;
        const a = -om * om * (st.sway - bump * 0.12) - 2 * 0.07 * om * st.swayV + 0.004 * st.acc * st.dir;
        st.swayV += a * h;
        st.sway += st.swayV * h;
      }
      moving = true;
    }
    // shutters swing to the set opening
    const goal = st.openGoal * rad(90) * (M.ctrl.ports / 100);
    if (Math.abs(st.alpha - goal) > 1e-4) {
      st.alpha = approach(st.alpha, goal, rad(55) * dt);
      if (Math.abs(st.alpha - goal) < 1e-4) M.sfx?.("clank", { gain: 0.3 });
      moving = true;
    }
    // bridge hauled back up by the windlass
    if (st.bridge.raise) {
      const r = st.bridge.raise;
      r.t += dt;
      st.bridge.th = r.from + (BR.th0 - r.from) * ease(Math.min(1, r.t / r.dur));
      if (r.t >= r.dur) {
        st.bridge.th = BR.th0;
        st.bridge.raise = null;
      }
      moving = true;
    }
    // shot effects
    if (M.shot && st.mode === "shot" && st.vsim) this.shotFx(M);
    if (M.shot && st.mode === "bridge" && st.bsim) {
      const t = M.shot.t;
      const imp = st.bsim.impact;
      M.setPhase(imp && t >= imp.t ? "board" : "drop");
      if (imp && t >= imp.t && !st.bsim.slammed && M.shot.playing) {
        st.bsim.slammed = true;
        st.swayV += 0.004 + 0.0015 * imp.tip;
        M.sfx?.("boom", { gain: clamp(imp.tip / 8, 0.25, 1), size: 1.2 });
        M.sfx?.("thud", { gain: 0.8 });
        if (!M.calm) {
          const p = W([0, CONTACT[0], ZMER + 0.02]);
          const sz = clamp(imp.tip / 3, 0.4, 2.6);
          for (const x of [-1.1, -0.4, 0.4, 1.1]) M.fx.emit("dust", add(p, [x * S, 0, 0]), { n: Math.round(6 + 6 * sz), v: [0, 8, 6], spread: 9 * sz, size: 4 * sz, grow: 16 * sz, life: 2.6, alpha: 0.9, drag: 1.5, buoy: 2 });
          M.fx.emit("debris", p, { n: Math.round(3 + 4 * sz), v: [0, 8, 10], spread: 10, size: 0.9, life: 1.8, grav: 1, drag: 0.2, bounce: 0.3 });
        }
      }
      if (imp && t < imp.t) st.bsim.slammed = false;
    }
    // fires burning on the wall
    if (st.fires.length && !M.calm) {
      for (const f of st.fires) {
        const life = f.until - M.time;
        if (life <= 0) continue;
        const k2 = clamp(life / 2, 0, 1) * f.power;
        if (Math.random() < 0.9 * k2) M.fx.emit("fire", add(W(f.p), [(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, 1]), { n: 2, v: [0, 0, 12], spread: 4, size: 6 * k2 + 2, grow: 3, life: 0.6, heat: 1, buoy: 24, drag: 2 });
        if (Math.random() < 0.35 * k2) M.fx.emit("smoke", add(W(f.p), [0, 0, 6]), { n: 1, v: [0, 2, 8], spread: 2, size: 5, grow: 22, life: 2.6, alpha: 0.55, buoy: 6, drag: 1 });
      }
      st.fires = st.fires.filter((f) => f.until > M.time);
    }
    // dust under the wheels
    if (st.v > 0.04 && !M.calm && Math.random() < st.v * 0.9) {
      const off = st.d - GAP;
      const i = Math.floor(Math.random() * 4);
      M.fx.emit("dust", w(XW0 + 0.25, AXY[i] + off + 0.5, 0.08), { n: 1, v: [0, 2, 1.5], spread: 1.5, size: 2, grow: 7, life: 1.4, alpha: 0.5, drag: 2, buoy: 0.8 });
    }
    if (Math.abs(st.d - st.prevD) > 0.02) {
      st.prevD = st.d;
      M.fx.setOccluders(this.occluders(M));
    }
    // phase strip
    if (st.mode === "idle") {
      const head2 = st.queue[0];
      const ph = head2 === "draw" ? "draw" : head2 === "ports" || (st.queue.length && Math.abs(st.alpha - goal) > 1e-3) ? "ports" : st.drive || st.v > 0 ? "roll" : st.bridge.down || st.bridge.raise ? "board" : st.d <= GAP + 0.005 ? "halt" : "rest";
      M.setPhase(ph);
    }
    return moving || st.mode !== "idle";
  },

  stepTower(M, dt) {
    const st = M.state;
    const n = Math.max(1, Math.ceil(dt / (1 / 240)));
    const R = resistOf(M);
    const m = massOf(M) + 4 * MASS.wheel + 300;
    const decel = R / m;
    for (let i = 0; i < n; i++) {
      const h = dt / n;
      const remain = st.dir > 0 ? st.d - st.goal : st.goal - st.d;
      let F = st.drive ? towerForce(M.ctrl.crew, st.v) : 0;
      if (remain <= (st.v * st.v) / (2 * decel) + 0.004) {
        F = 0;
        if (st.queue[0] === "advance" || st.queue[0] === "withdraw" || !st.holding) st.drive = 0;
      }
      st.push = F;
      let a;
      if (st.v <= 0 && F <= R) {
        a = 0;
        st.v = 0;
        st.stalled = !!st.drive && remain > 0.01;
      } else {
        a = (F - R) / m;
        st.stalled = false;
      }
      st.v = Math.max(0, st.v + a * h);
      let move = st.v * h;
      if (move >= remain) {
        move = Math.max(0, remain);
        st.v = 0;
        st.drive = 0;
      }
      st.acc = a;
      st.d -= st.dir * move;
      st.s += st.dir * move;
    }
    // the crew walks the last few centimetres up to the stop
    const left = st.dir > 0 ? st.d - st.goal : st.goal - st.d;
    if (st.v === 0 && left > 0 && left < 0.06) {
      st.s += st.dir * left;
      st.d = st.goal;
      st.drive = 0;
      st.stalled = false;
    }
  },

  shotFx(M) {
    const st = M.state;
    const t = M.shot.t;
    const sim = st.vsim;
    const firstImp = Math.min(...sim.shots.map((s) => s.tImp));
    M.setPhase(t < firstImp ? "loose" : "impact");
    for (const s of sim.shots) {
      const key = s.name;
      if (t >= s.tRel && !sim.fired[key + "r"] && M.shot.playing) {
        sim.fired[key + "r"] = true;
        M.sfx?.(s.ammo.look === "bolt" ? "twang" : "whoosh", { pitch: s.ammo.look === "bolt" ? 1.25 : 0.9, gain: 0.7 });
      }
      if (t < s.tRel) sim.fired[key + "r"] = false;
      if (t >= s.tImp && !sim.fired[key] && M.shot.playing) {
        sim.fired[key] = true;
        this.impactFx(M, s);
      }
      if (t < s.tImp) sim.fired[key] = false;
      if (s.ammo.fire && t >= s.tRel && t < s.tImp && !M.calm && M.shot.playing) {
        const f = s.flight.track.at(t - s.tRel);
        M.fx.emit("fire", W(f.p), { n: 2, v: mul(f.v, -0.12 * S), spread: 2, size: 2.4, grow: 1, life: 0.3, heat: 1, buoy: 8, drag: 3 });
      }
    }
  },

  impactFx(M, s) {
    const st = M.state;
    const p = W(s.hit.p);
    const n = s.hit.n;
    const out = mul(n, 1);
    const wood = s.hit.what.material === "wood";
    if (s.ammo.look === "bolt") {
      M.sfx?.(wood ? "thunk" : "crack", { gain: 0.6, pitch: 1.3 });
      if (M.calm) return;
      if (wood) M.fx.emit("splinter", p, { n: 9, v: mul(add(out, [0, 0, 0.6]), 12), spread: 14, size: 0.7, life: 0.9, grav: 1, drag: 1.2, bounce: 0.2 });
      else {
        M.fx.emit("spark", p, { n: 7, v: mul(add(out, [0, 0, 0.4]), 30), spread: 26, size: 0.5, life: 0.35, heat: 0.9, grav: 0.4, drag: 1 });
        M.fx.emit("dust", p, { n: 5, v: mul(out, 6), spread: 5, size: 1.6, grow: 6, life: 1.3, drag: 2, buoy: 1 });
      }
      return;
    }
    if (s.ammo.id === "stones") {
      M.sfx?.("crack", { gain: 0.8 });
      if (M.calm) return;
      M.fx.emit("dust", p, { n: 10, v: mul(add(out, [0, 0, 0.5]), 9), spread: 9, size: 2.5, grow: 10, life: 2, drag: 1.5, buoy: 1.5 });
      M.fx.emit("debris", p, { n: 8, v: mul(add(out, [0, 0, 0.8]), 14), spread: 12, size: 0.7, life: 1.5, grav: 1, drag: 0.3, bounce: 0.3 });
      M.fx.emit("spark", p, { n: 3, v: mul(out, 20), spread: 20, size: 0.4, life: 0.25, heat: 0.7, grav: 0.4 });
      return;
    }
    M.sfx?.("whump", { gain: 0.8 });
    st.fires.push({ p: add(s.hit.p, mul(n, 0.05)), until: M.time + 7.5, power: 1 });
    if (M.calm) return;
    M.fx.emit("debris", p, { n: 10, v: mul(add(out, [0, 0, 0.7]), 10), spread: 12, size: 0.6, life: 1.2, grav: 1, drag: 0.4, bounce: 0.2, heat: 0.3 });
    M.fx.emit("fire", p, { n: 22, v: mul(add(out, [0, 0, 1]), 8), spread: 16, size: 5, grow: 3, life: 0.7, heat: 1, buoy: 18, drag: 2.4 });
    M.fx.emit("liquid", p, { n: 10, v: mul(add(out, [0, 0, 0.4]), 9), spread: 10, size: 1.1, life: 0.9, heat: 1, grav: 1, drag: 0.6 });
    M.fx.emit("smoke", p, { n: 6, v: [0, 3, 8], spread: 4, size: 5, grow: 24, life: 2.8, alpha: 0.6, buoy: 6, drag: 1 });
  },

  // ---- the pose of everything that moves ----
  pose(M) {
    const st = M.state;
    const wheel = st.s / RW;
    const rope = wheel * DRV.rDrum;
    let th = st.bridge.th;
    if (st.mode === "bridge" && M.shot && st.bsim) th = st.bsim.rec.at(M.shot.t).th;
    return { off: st.d - GAP, wheel, rope, sheave: rope / RSHV, th, alpha: st.alpha, sway: st.sway };
  },

  // Engine pose: aim, arm angle, string nock, slider claw and windlass turn, plus what it holds.
  enginePose(M, name) {
    const st = M.state;
    const eng = ENGINES[name];
    const E = eng.E;
    const e = st.eng[name];
    const sFwd = E.sk - bOf(E, E.ph0);
    const sBack = E.sk - bOf(E, E.ph1);
    let { gamma, psi } = e;
    let ph = e.drawn ? E.ph1 : E.ph0;
    let sN = E.sk - bOf(E, ph);
    let sS = e.slider === "back" ? sBack : sN;
    let load = e.drawn && e.loaded ? 1 : 0;
    let loading = null;
    const plan = st.plan && st.queue[0] === "draw" ? st.plan.shots.find((s) => s.name === name) : null;
    if (plan) {
      const from = st.plan.from[name];
      const u = st.drawT;
      const a = ease(clamp(u / 0.45, 0, 1));
      gamma = from.gamma + (plan.gamma - from.gamma) * a;
      psi = from.psi + (plan.psi - from.psi) * a;
      if (!e.drawn) {
        const startS = from.slider === "back" ? sBack : sFwd;
        const fwd = smoothstep(0, 0.25, u);
        const wind = ease(clamp((u - 0.25) / 0.7, 0, 1));
        ph = E.ph0 + (E.ph1 - E.ph0) * wind;
        sN = E.sk - bOf(E, ph);
        sS = u < 0.25 ? startS + (sFwd - startS) * fwd : sN;
      }
      if (e.loaded !== M.ammo.id) {
        load = smoothstep(0.55, 0.95, u);
        loading = load > 0 && load < 1 ? load : null;
      }
    }
    let rel = false;
    let shot = null;
    if (st.mode === "shot" && M.shot && st.vsim) {
      shot = st.vsim.shots.find((s) => s.name === name);
      if (shot) {
        gamma = shot.gamma;
        psi = shot.psi;
        const local = M.shot.t - shot.t0 - TRIG;
        ph = local <= 0 ? E.ph1 : shot.sim.rec.at(local).ph;
        sN = E.sk - bOf(E, Math.max(ph, E.ph0));
        sS = sBack;
        load = M.shot.t < shot.tRel ? 1 : 0;
        rel = M.shot.t >= shot.tRel;
      }
    }
    const wind = (sFwd - sS) / E.win[3];
    return { eng, E, gamma, psi, ph, sN, sS, load, loading, rel, shot, wind, ammo: shot ? shot.ammo : M.ammo };
  },

  draw(B, M) {
    const st = M.state;
    const pose = this.pose(M);
    // running gear: every frame while the tower rolls
    B.keep("tw.gear", [pose.wheel.toFixed(4)], () => drawGear(B, pose));
    B.keep("tw.drive", [pose.rope.toFixed(4), st.stalled && st.drive ? (M.time * 20) | 0 : 0], () => drawDrive(B, pose, st));
    B.keep("tw.shutters", [pose.alpha.toFixed(4), M.toggles.cut ? 1 : 0], () => drawShutters(B, pose.alpha));
    for (const name of ["scA", "scB", "pa"]) {
      const ep = this.enginePose(M, name);
      const sig = [ep.gamma.toFixed(4), ep.psi.toFixed(4), ep.ph.toFixed(4), ep.sS.toFixed(4), ep.load.toFixed(3), ep.rel, ep.ammo.id, M.ammo.id];
      B.keep(`tw.eng.${name}`, sig, () => drawEngine(B, name, ep, M));
    }
    B.keep("tw.bridge", [pose.th.toFixed(4), M.ctrl.brake], () => drawBridge(B, pose.th, M.ctrl.brake));
    const pileSig = [M.ammo.id, inUse(st, "bolts"), inUse(st, "pots"), inUse(st, "stones")];
    B.keep("tw.pile", pileSig, () => drawPile(B, M));
    B.keep("wall.mantlets", [st.charred.a ? 1 : 0, st.charred.b ? 1 : 0], () => drawMantlets(B, st));
    drawFlights(B, M);
    B.keep("wall.marks", [st.alpha.toFixed(2), st.hits.length, st.stones.length, st.scorch.length, st.hits.map((h) => h.p[0].toFixed(2)).join()], () => drawMarks(B, st));
    if (M.toggles.strobe) drawStrobe(B, M);
    placeTower(B, M, pose);

  },

  occluders(M) {
    const off = M.state ? M.state.d - GAP : 0;
    return [
      { min: w(WX0, WY - WT, 0), max: w(WX1, WY, ZWALK) },
      { min: w(WX0, WY - 0.7, ZWALK), max: w(WX1, WY, ZBREAST) },
      ...MERLONS.map(([x0, x1]) => ({ min: w(x0, WY - 0.7, ZBREAST), max: w(x1, WY, ZMER) })),
      { min: w(-HB, -HB + off, 0.45), max: w(HB, HB + off, ZROOF) },
    ];
  },

  corner(M) {
    const st = M.state;
    return `${M.phase} · ${fmt(st.d, 1)} m · ${fmt(st.v, 2)} m/s`;
  },

  readouts(M) {
    const st = M.state;
    const R = resistOf(M);
    const Fmax = towerForce(M.ctrl.crew, 0);
    const pose = this.pose(M);
    const rows = [
      ["Tower mass", fmt(massOf(M) / 1000, 1), "t"],
      ["Crew", fmtInt(M.ctrl.crew), "men"],
      ["Push force", fmt((st.drive || st.v > 0 ? st.push : Fmax) / 1000, 1), "kN"],
      ["Rolling resist.", fmt(R / 1000, 1), "kN"],
      ["Speed", fmt(st.v, 2), "m/s"],
      ["To wall", fmt(st.d, 1), "m"],
      ["Ports", fmtInt(deg(st.alpha)), "°"],
      ["Ports need", fmtInt(deg(portNeed(M))), "°"],
      ["Bridge", fmt(deg(pose.th), 1), "°"],
      ["Bridge at impact", st.bridgeImpact ? fmt(st.bridgeImpact, 1) : "—", "m/s"],
    ];
    if (st.stalled) rows.splice(3, 0, ["Short by", fmt((R - Fmax) / 1000, 1), "kN"]);
    return rows;
  },
};

// ======================================================================================
// static geometry
// ======================================================================================
function buildTrack(B) {
  const x0 = -5.4, x1 = 5.4, y0 = WY + 0.55, y1 = PL.y1 - 0.9;
  const lines = [];
  for (let y = y0 + 0.55; y < y1 - 0.2; y += 0.55) lines.push(k.lineOnTop([x0 * S, y * S], [x1 * S, y * S], 0.25, B.P));
  B.slab("ground.track", { x: x0 * S, y: y0 * S, w: (x1 - x0) * S, d: (y1 - y0) * S, r: 1 }, 0, 0.25, { layer: -2, tone: "lo", mat: "wood", steps: 2, inner: B.L(lines.join(""), { tone: "faint" }) });
  for (const x of [-5.3, 5.3]) B.beam(`ground.kerb${x}`, w(x, y0 + 0.1, 0.085), w(x, y1 - 0.1, 0.085), { w: 0.2 * S, h: 0.12 * S, up: [0, 0, 1], mat: "oak", tone: "mid", layer: -1, nails: [1.5, 6, 10.5, 15, 19.5].filter((s) => s < y1 - y0).map((s) => ({ s: s * S, face: "v", x: 0 })) });
}

function buildWall(B) {
  const o = { mat: "stone", tone: "mid", steps: 1 };
  const P = B.P;
  const seg = (a, b) => k.pathOf([B.at(W(a)), B.at(W(b))]);
  B.slab("wall.footing", { x: WX0 * S, y: (WY - WT - 0.4) * S, w: (WX1 - WX0) * S, d: (WT + 0.8) * S, r: 0.4 }, 0, 0.6 * S, { ...o, bevel: 0.6, seams: [0.3 * S] });
  // body: courses 0.5 m high, joints staggered, on the outer face and the near end
  const course = [], joint = [], end = [];
  const zs = [];
  for (let z = 0.6 + 0.5; z < 11.9; z += 0.5) zs.push(z);
  const levels = [0.6, ...zs, 11.95];
  for (const z of zs) {
    course.push(seg([WX0, WY, z], [WX1, WY, z]));
    end.push(seg([WX1, WY - WT, z], [WX1, WY, z]));
  }
  for (let i = 0; i + 1 < levels.length; i++) {
    const shift = i % 2 ? 0.55 : 0;
    for (let x = WX0 + 0.6 + shift; x < WX1 - 0.2; x += 1.1) joint.push(seg([x, WY, levels[i]], [x, WY, levels[i + 1]]));
    for (let y = WY - WT + 0.5 + shift * 0.6; y < WY - 0.2; y += 1.1) joint.push(seg([WX1, y, levels[i]], [WX1, y, levels[i + 1]]));
  }
  const paving = [];
  for (let x = WX0 + 0.9; x < WX1 - 0.2; x += 0.95) paving.push(seg([x, WY - WT + 0.4, ZWALK], [x, WY - 0.7, ZWALK]));
  paving.push(seg([WX0, WY - WT + 1.55, ZWALK], [WX1, WY - WT + 1.55, ZWALK]));
  B.slab("wall.body", { x: WX0 * S, y: (WY - WT) * S, w: (WX1 - WX0) * S, d: WT * S, r: 0.2 }, 0.6 * S, (ZWALK - 0.6) * S, { ...o, inner: B.L(course.join("") + end.join(""), { tone: "lo" }) + B.L(joint.join(""), { tone: "faint" }), over: B.L(paving.join(""), { tone: "faint" }) });
  B.slab("wall.string", { x: WX0 * S, y: WY * S, w: (WX1 - WX0) * S, d: 0.16 * S, r: 0.1 }, 11.95 * S, 0.3 * S, { ...o, tone: "hi" });
  const bj = [];
  for (let x = WX0 + 0.7; x < WX1 - 0.2; x += 1.3) bj.push(seg([x, WY, ZWALK], [x, WY, ZBREAST]));
  B.slab("wall.breast", { x: WX0 * S, y: (WY - 0.7) * S, w: (WX1 - WX0) * S, d: 0.7 * S, r: 0.1 }, ZWALK * S, (ZBREAST - ZWALK) * S, { ...o, tone: "hi", inner: B.L(seg([WX0, WY, ZWALK + 0.48], [WX1, WY, ZWALK + 0.48]) + seg([WX1, WY - 0.7, ZWALK + 0.48], [WX1, WY, ZWALK + 0.48]), { tone: "lo" }) + B.L(bj.join(""), { tone: "faint" }) });
  MERLONS.forEach(([x0, x1], i) => {
    const m = (x0 + x1) / 2;
    const inner = B.L(seg([x0, WY, ZBREAST + 0.45], [x1, WY, ZBREAST + 0.45]) + (x1 >= WX1 - 1e-6 ? seg([x1, WY - 0.7, ZBREAST + 0.45], [x1, WY, ZBREAST + 0.45]) : ""), { tone: "lo" }) + B.L(seg([m, WY, ZBREAST], [m, WY, ZBREAST + 0.45]) + seg([m - 0.4, WY, ZBREAST + 0.45], [m - 0.4, WY, ZMER]), { tone: "faint" });
    B.slab(`wall.merlon${i}`, { x: x0 * S, y: (WY - 0.7) * S, w: (x1 - x0) * S, d: 0.7 * S, r: 0.1 }, ZBREAST * S, (ZMER - ZBREAST) * S, { ...o, tone: "hi", bevel: 0.4, inner });
  });
  B.slab("wall.inner", { x: WX0 * S, y: (WY - WT) * S, w: (WX1 - WX0) * S, d: 0.4 * S, r: 0.1 }, ZWALK * S, (ZINNER - ZWALK) * S, { ...o, tone: "mid" });
  // the defenders' pile of throwing stones on the wall walk
  [[-4.1, WY - 2.6, 0.2], [-3.75, WY - 2.65, 0.18], [-3.95, WY - 2.35, 0.17], [-3.92, WY - 2.55, 0.16, 0.3]].forEach(([x, y, r, up = 0], i) => looks.stone(B, `wall.heap${i}`, w(x, y, ZWALK + r + up), r * S, { mat: "stone", seed: i + 3 }));
  void P;
}

function buildTower(B) {
  const oak = { mat: "oak", tone: "mid" };
  B.halo("tw.halo", [w(-HB - 0.6, -HB - 0.4, 0), w(HB + 0.9, -HB - 0.4, 0), w(HB + 0.9, HB + 0.5, 0), w(-HB - 0.6, HB + 0.5, 0)], 0.4, { blur: 6 });
  // ---- base frame ----
  for (const sx of [-1, 1]) {
    const x = sx * (HB - 0.3);
    B.beam(`tw.sole${sx}`, w(x, -HB, ZA), w(x, HB, ZA), { w: 0.6 * S, h: 0.62 * S, up: [0, 0, 1], ...oak, sys: "wheels", grain: 2, nails: AXY.map((y) => ({ s: (y + HB) * S, face: sx > 0 ? "-u" : "u", x: [-0.62, 0.62] })), nailSize: 0.55 });
  }
  for (const [y, wd] of [[-HB + 0.3, 0.6], [0, 0.5], [HB - 0.3, 0.6]]) B.beam(`tw.cross${y}`, w(-HB + 0.6, y, ZA + (0.6 - wd) / 2), w(HB - 0.6, y, ZA + (0.6 - wd) / 2), { w: wd * S, h: wd * S, up: [0, 0, 1], ...oak, sys: "wheels", grain: 1 });
  // axles between the sole beams; the driven ones stop at their rope drums
  AXY.forEach((y, i) => {
    const driven = i === 1 || i === 2;
    const spans = driven ? [[-HB + 0.6, DRUMX[0]], [DRUMX[1], HB - 0.6]] : [[-HB + 0.6, HB - 0.6]];
    spans.forEach(([a, b], j) => B.cyl(`tw.axle${i}.${j}`, w(a, y, ZA), w(b, y, ZA), RA * S, { mat: "oak", tone: "hi", sys: "wheels" }));
    B.cyl(`tw.fwheel${i}`, w(-XW1, y, ZA), w(-XW0, y, ZA), RW * S, { mat: "oak", tone: "mid", sys: "wheels" });
  });
  // deck: far boards, near boards (cut away to show the drums), sill plate over the near sole
  const deckLines = (x0, x1) => {
    const out = [];
    for (let x = x0 + 0.42; x < x1 - 0.1; x += 0.42) out.push(k.lineOnTop([x * S, -DECK * S], [x * S, DECK * S], LV[0] * S, B.P));
    return B.L(out.join(""), { tone: "faint" });
  };
  const deck = (id, x0, x1, cut) => B.slab(id, { x: x0 * S, y: -DECK * S, w: (x1 - x0) * S, d: 2 * DECK * S, r: 0.2 }, ZS1 * S, (LV[0] - ZS1) * S, { ...oak, sys: "floors", cut, steps: 1, inner: deckLines(x0, x1), seams: [(LV[0] - 0.07) * S] });
  deck("tw.deck", -DECK, 1.6, undefined);
  deck("tw.deck.near", 1.6, HB - 0.6, true);
  deck("tw.deck.sill", HB - 0.6, DECK, undefined);
  // ---- floors with ladder hatches at the rear ----
  for (let i = 1; i <= 5; i++) {
    const h = floorHalf(i);
    const z0 = LV[i] - FT;
    const lx = LADX[i - 1];
    const ny = h - 1.0;
    const pieces = [
      [-h, -h, h, ny],
      [-h, ny, lx - 0.45, h],
      [lx + 0.45, ny, h, h],
    ];
    pieces.forEach(([x0, y0, x1, y1], j) => {
      const lines = [];
      for (let x = Math.ceil((x0 + 0.1) / 0.45) * 0.45; x < x1 - 0.1; x += 0.45) lines.push(k.lineOnTop([x * S, y0 * S], [x * S, y1 * S], LV[i] * S, B.P));
      B.slab(`tw.floor${i}.${j}`, { x: x0 * S, y: y0 * S, w: (x1 - x0) * S, d: (y1 - y0) * S, r: 0.15 }, z0 * S, FT * S, { mat: "oak", tone: i === 5 ? "hi" : "mid", sys: "floors", steps: 1, inner: B.L(lines.join(""), { tone: "faint" }), seams: [(LV[i] - 0.08) * S] });
    });
  }
  // ---- corner posts, braces, ladders ----
  for (let i = 0; i < 5; i++) {
    const zb = LV[i], zt = LV[i + 1] - FT;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const c = (z) => w(sx * (hw(z) - POST / 2), sy * (hw(z) - POST / 2), z);
      B.beam(`tw.post${i}${sx}${sy}`, c(zb), c(zt), { w: POST * S, h: POST * S, up: [1, 0, 0], ...oak, sys: "floors", grain: 1, nails: [{ s: 0.3 * S, face: "v", x: [-0.4, 0.4] }, { s: (zt - zb - 0.3) * S, face: "v", x: [-0.4, 0.4] }] });
    }
    // near face brace, alternating, lying against the cladding
    const z0 = zb + 0.14, z1 = zt - 0.14;
    const yA = -(hw(z0) - POST), yB = hw(z1) - POST;
    const flip = i % 2 === 1;
    const nb = [hw(z0) - 0.07, flip ? -yA : yA, z0];
    const nt = [hw(z1) - 0.07, flip ? -yB : yB, z1];
    B.beam(`tw.brace.n${i}`, W(nb), W(nt), { w: 0.18 * S, h: 0.12 * S, up: [1, 0, 0], ...oak, sys: "floors", grain: 1 });
    // rear face brace (the rear is open)
    const rb = [flip ? hw(z0) - POST : -(hw(z0) - POST), hw(z0) - 0.07, z0];
    const rt = [flip ? -(hw(z1) - POST) : hw(z1) - POST, hw(z1) - 0.07, z1];
    B.beam(`tw.brace.r${i}`, W(rb), W(rt), { w: 0.18 * S, h: 0.12 * S, up: [0, 1, 0], ...oak, sys: "floors", grain: 1 });
    // ladder from this floor up through the hatch in the next
    const lx = LADX[i];
    const yTop = floorHalf(i + 1) - 0.55;
    const ztop = LV[i + 1] + 0.55;
    const bot = (x) => [x, yTop - 1.2, LV[i]];
    const top = (x) => [x, yTop, ztop];
    const L = ztop - LV[i];
    // in two lengths, below and above the floor it passes through (each storey is painted in turn)
    const uCut = (LV[i + 1] - FT - LV[i]) / L;
    [[0, uCut, "lo"], [uCut, 1, "up"]].forEach(([u0, u1, tag]) => {
      const rungs = [];
      for (let s = 0.3; s < L - 0.1; s += 0.32) {
        const u = s / L;
        if (u < u0 || u >= u1) continue;
        rungs.push(k.pathOf([B.at(W(lerp(bot(lx - 0.205), top(lx - 0.205), u))), B.at(W(lerp(bot(lx + 0.205), top(lx + 0.205), u)))]));
      }
      const rungSvg = rungs.length ? `<path class="iso-line" data-tone="mid" style="stroke-width:1.4px" d="${rungs.join("")}"/>` : "";
      const seg = (x) => [W(lerp(bot(x), top(x), u0)), W(lerp(bot(x), top(x), u1))];
      B.beam(`tw.ladder${i}${tag}.f`, ...seg(lx - 0.24), { w: 0.1 * S, h: 0.07 * S, up: [1, 0, 0], mat: "oak", tone: "hi", sys: "floors", over: rungSvg });
      B.beam(`tw.ladder${i}${tag}.n`, ...seg(lx + 0.24), { w: 0.1 * S, h: 0.07 * S, up: [1, 0, 0], mat: "oak", tone: "hi", sys: "floors" });
    });
  }
  // ---- cladding ----
  for (let i = 0; i < 5; i++) {
    const zb = LV[i], zt = LV[i + 1] - FT;
    nearPanel(B, i, zb, zt);
    flatPanel(B, `tw.clad.far${i}`, "-x", zb, zt, { mat: "wood", tone: "mid", sys: "cladding" });
    if (i < 4) flatPanel(B, `tw.clad.front${i}`, "-y", zb, zt, { mat: "wood", tone: "mid", sys: "cladding" });
  }
  // top storey front: a door for the bridge and two ports for the scorpios
  {
    const zb = LV[4], zt = LV[5] - FT;
    const o = { mat: "wood", tone: "mid", sys: "cladding" };
    flatPanel(B, "tw.clad.front4a", "-y", zb, zt, o, [[-hw(zb), zb], [-1.85, zb], [-1.85, zt], [-hw(zt), zt]]);
    flatPanel(B, "tw.clad.front4b", "-y", zb, zt, o, [[-1.85, zb], [-1.25, zb], [-1.25, ZP0], [-1.85, ZP0]]);
    flatPanel(B, "tw.clad.front4c", "-y", zb, zt, o, [[-1.85, ZD], [2.5, ZD], [2.5, zt], [-1.85, zt]], { eyes: true });
    flatPanel(B, "tw.clad.front4d", "-y", zb, zt, o, [[1.25, zb], [1.9, zb], [1.9, ZD], [1.25, ZD]]);
    flatPanel(B, "tw.clad.front4e", "-y", zb, zt, o, [[1.9, zb], [2.5, zb], [2.5, ZP0], [1.9, ZP0]]);
    flatPanel(B, "tw.clad.front4f", "-y", zb, zt, o, [[2.5, zb], [hw(zb), zb], [hw(zt), zt], [2.5, zt]]);
  }
  // roof parapet of hide screens; an embrasure for the palintone
  {
    const zb = LV[5], zt = LV[5] + 1.0;
    const o = { mat: "hide", tone: "hi", sys: "cladding" };
    flatPanel(B, "tw.roof.near", "+x", zb, zt, { ...o, cut: true }, null, { outer: true });
    flatPanel(B, "tw.roof.far", "-x", zb, zt, o);
    flatPanel(B, "tw.roof.fronta", "-y", zb, zt, o, [[-hw(zb), zb], [1.45, zb], [1.45, zt], [-hw(zt), zt]]);
    flatPanel(B, "tw.roof.frontb", "-y", zb, zt, o, [[2.65, zb], [hw(zb), zb], [hw(zt), zt], [2.65, zt]]);
  }
  // ---- capstan housings ----
  CAPS.forEach((c, j) => {
    B.slab(`tw.cap.socket${j}`, { x: (c.x - 0.34) * S, y: (c.y - 0.34) * S, w: 0.68 * S, d: 0.68 * S, r: 0.08 * S }, LV[0] * S, 0.15 * S, { ...oak, sys: "capstans", bevel: 0.5, over: B.D([[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].map(([dx, dy]) => B.at(w(c.x + dx, c.y + dy, ZCAP0))), { size: 0.55, tone: "hi" }) });
    const zb = LV[1] - FT - 0.26;
    B.cyl(`tw.cap.spindle${j}`, w(c.x, c.y, ZHEAD), w(c.x, c.y, zb), 0.11 * S, { mat: "oak", tone: "hi", sys: "capstans", seams: [0.2 * S] });
    const xe = hw(zb + 0.13) - 0.13;
    B.beam(`tw.cap.beam${j}`, w(-xe, c.y, zb + 0.13), w(xe, c.y, zb + 0.13), { w: 0.26 * S, h: 0.26 * S, up: [0, 0, 1], ...oak, sys: "capstans", grain: 1, nails: [{ s: (xe + c.x) * S, face: "v", x: [-0.6, 0.6] }] });
    for (const sx of [-1, 1]) {
      const x0 = sx < 0 ? XROPE - 0.22 : XROPE + 0.08;
      B.slab(`tw.shv.cheek${j}${sx}`, { x: x0 * S, y: (c.sy - 0.26) * S, w: 0.14 * S, d: 0.52 * S, r: 0.04 * S }, LV[0] * S, 0.3 * S, { ...oak, sys: "capstans", bevel: 0.4, over: B.D([B.at(w(x0 + 0.07, c.sy, ZSHV))].filter(() => sx > 0), { size: 0.7, tone: "hi" }) });
    }
  });
  // ---- bridge hinge, gallows and windlass housing ----
  B.slab("tw.br.sill", { x: -1.2 * S, y: BR.y * S, w: 2.4 * S, d: (-floorHalf(4) - BR.y) * S, r: 0.03 * S }, (LV[4] - FT) * S, FT * S, { ...oak, sys: "bridge", bevel: 0.3, over: B.D([-0.85, -0.55, 0.55, 0.85].map((x) => B.at(w(x, BR.y, LV[4] - 0.08))), { size: 0.7, tone: "hi" }) });
  for (const sx of [-1, 1]) {
    B.beam(`tw.gal.post${sx}`, w(sx * 1.3, PUL.y, LV[5]), w(sx * 1.3, PUL.y, 18.85), { w: 0.2 * S, h: 0.2 * S, up: [0, 1, 0], ...oak, sys: "bridge", grain: 1, nails: [{ s: 0.25 * S, face: "v", x: [-0.5, 0.5] }] });
    B.slab(`tw.gal.block${sx}`, { x: (sx > 0 ? 1.21 : -1.33) * S, y: (PUL.y - 0.12) * S, w: 0.12 * S, d: 0.24 * S, r: 0.03 * S }, 19.1 * S, 0.36 * S, { mat: "iron", tone: "hi", sys: "bridge", bevel: 0.3 });
    B.slab(`tw.win.cheek${sx}`, { x: (sx > 0 ? 1.3 : -1.48) * S, y: (BWIN.y - 0.25) * S, w: 0.18 * S, d: 0.5 * S, r: 0.04 * S }, LV[5] * S, 0.75 * S, { ...oak, sys: "bridge", bevel: 0.4, over: B.D([B.at(w(sx > 0 ? 1.48 : -1.48, BWIN.y, BWIN.z))], { size: 0.6, tone: "hi" }) });
  }
  B.beam("tw.gal.beam", w(-1.55, PUL.y, 18.975), w(1.55, PUL.y, 18.975), { w: 0.22 * S, h: 0.25 * S, up: [0, 0, 1], ...oak, sys: "bridge", grain: 1, nails: [-1.3, 1.3].map((x) => ({ s: (x + 1.55) * S, face: "v", x: [-0.5, 0.5] })) });

  // water casks on the storeys (the hides are kept wet against fire), a coil of spare rope
  [[1, -2.3, -2.5], [2, 2.35, -2.2], [2, -2.4, 1.3], [3, 2.3, 1.2], [3, -2.3, -2.4]].forEach(([s, x, y], j) => looks.barrel(B, `tw.cask${j}`, w(x, y, LV[s] + 0.3 * 1.15), 0.3 * S, { sys: "floors" }));
  B.cyl("tw.coil", w(-2.4, 2.0, LV[1]), w(-2.4, 2.0, LV[1] + 0.16), 0.32 * S, { mat: "rope", tone: "hi", sys: "floors", ribs: { count: 26, twist: 0.4 }, faceRing: [{ s: 0.16 * S, r: 0.22 * S }, { s: 0.16 * S, r: 0.12 * S }] });
  // ---- engine stands and the bolt rack ----
  for (const name of ["scA", "scB", "pa"]) {
    const P0 = ENGINES[name].P0;
    const zf = name === "pa" ? LV[5] : LV[4];
    B.slab(`tw.stand.foot${name}`, { x: (P0[0] - 0.32) * S, y: (P0[1] - 0.32) * S, w: 0.64 * S, d: 0.64 * S, r: 0.06 * S }, zf * S, 0.1 * S, { ...oak, sys: "ports", bevel: 0.4 });
    B.beam(`tw.stand.post${name}`, w(P0[0], P0[1], zf + 0.1), w(P0[0], P0[1], P0[2] - 0.2), { w: 0.16 * S, h: 0.16 * S, up: [1, 0, 0], ...oak, sys: "ports", grain: 1 });
    B.ball(`tw.stand.joint${name}`, w(P0[0], P0[1], P0[2] - 0.15), 0.07 * S, { mat: "iron", tone: "hi", sys: "ports" });
  }
  B.slab("tw.rack", { x: 2.22 * S, y: -1.05 * S, w: 0.5 * S, d: 0.9 * S, r: 0.04 * S }, LV[4] * S, 0.6 * S, { ...oak, sys: "ports", bevel: 0.4, seams: [(LV[4] + 0.15) * S] });
}

// A flat cladding panel on a tapering face. poly: [[lateral, z]] (defaults to the full storey).
function flatPanel(B, id, face, zb, zt, o, poly = null, extra = {}) {
  const F = panelFrame(face, zb);
  const full = poly || [[panelLat(face, zb)[0], zb], [panelLat(face, zb)[1], zb], [panelLat(face, zt)[1], zt], [panelLat(face, zt)[0], zt]];
  const toUV = ([lat, z]) => [lat * S, (z - zb) * SL * S];
  // planks seen from inside (or out, for the roof screen)
  const sFace = extra.outer ? CLAD : 0;
  const lats = full.map(([l]) => l);
  const lo = Math.min(...lats), hi = Math.max(...lats);
  const zs = full.map(([, z]) => z);
  const zlo = Math.min(...zs), zhi = Math.max(...zs);
  const seams = [];
  const latAt = (z, side) => {
    // the piece's lateral bound at height z (pieces are trapezoids with vertical or tapering sides)
    const edge = side < 0 ? [full[0], full[3]] : [full[1], full[2]];
    const [a, b] = edge;
    const u = (z - a[1]) / (b[1] - a[1] || 1);
    return a[0] + (b[0] - a[0]) * u;
  };
  for (let l = Math.ceil((lo + 0.15) / 0.42) * 0.42; l < hi - 0.12; l += 0.42) {
    const okB = l > latAt(zlo, -1) + 0.08 && l < latAt(zlo, 1) - 0.08;
    const okT = l > latAt(zhi, -1) + 0.08 && l < latAt(zhi, 1) - 0.08;
    if (!okB || !okT) continue;
    seams.push(k.pathOf([B.at(W(facePt(F, l, zlo, sFace))), B.at(W(facePt(F, l, zhi, sFace)))]));
  }
  let over = "";
  if (extra.eyes) for (const p of FRONT_PORTS) over += B.D([B.at(W(facePt(F, p.x, ZD + 0.42, CLAD)))], { size: 0.65, tone: "hi" });
  B.prism(id, { o: W(F.o), a: F.a, u: F.u, v: F.v }, full.map(toUV), 0, CLAD * S, { ...o, inner: B.L(seams.join(""), { tone: "faint" }), over });
}

// The near (+x) panel of a storey: hides laced over planks, an iron plate along the leading edge,
// a port with its frame. Cut away by the Cutaway toggle.
function nearPanel(B, i, zb, zt) {
  const F = panelFrame("+x", zb);
  const FW = { o: W(F.o), a: F.a, u: F.u, v: F.v };
  const [l0b, l1b] = panelLat("+x", zb), [l0t, l1t] = panelLat("+x", zt);
  const poly = [[l0b, zb], [l1b, zb], [l1t, zt], [l0t, zt]].map(([l, z]) => [l * S, (z - zb) * SL * S]);
  const pt = (l, z) => B.at(W(facePt(F, l, z, CLAD)));
  const port = SIDE_PORTS.find((p) => p.st === i);
  const plate = 0.95;
  const seams = [], stitches = [];
  const lFront = (z) => panelLat("+x", z)[0] + plate;
  // vertical hide seams, skipping the port
  for (let l = lFront(zb) + 1.5; l < l1t - 0.4; l += 1.5) {
    if (port && Math.abs(l - port.y) < port.w / 2 + 0.12) continue;
    seams.push(k.pathOf([pt(l, zb), pt(l, zt)]));
    for (let z = zb + 0.25; z < zt - 0.1; z += 0.3) stitches.push(pt(l, z));
  }
  // horizontal seam at mid-height, broken by the port
  const zm = (zb + zt) / 2 + (port ? 0 : 0.2);
  const segs = port && zm > port.z0 - 0.05 && zm < port.z1 + 0.05 ? [[lFront(zm), port.y - port.w / 2 - 0.06], [port.y + port.w / 2 + 0.06, panelLat("+x", zm)[1]]] : [[lFront(zm), panelLat("+x", zm)[1]]];
  for (const [a, b] of segs) {
    seams.push(k.pathOf([pt(a, zm), pt(b, zm)]));
    for (let l = a + 0.2; l < b - 0.1; l += 0.32) stitches.push(pt(l, zm));
  }
  let over = B.L(seams.join(""), { tone: "lo" }) + B.D(stitches, { size: 0.4, tone: "mid" });
  if (port) {
    const a = port.y - port.w / 2, b = port.y + port.w / 2;
    const hole = [pt(a, port.z0), pt(b, port.z0), pt(b, port.z1), pt(a, port.z1)];
    const frame = [pt(a - 0.07, port.z0 - 0.07), pt(b + 0.07, port.z0 - 0.07), pt(b + 0.07, port.z1 + 0.07), pt(a - 0.07, port.z1 + 0.07)];
    over += `<path class="iso-shade" data-shade="0" d="${k.pathOf(hole, true)}"/>` + B.L(k.pathOf(hole, true), { tone: "hi" }) + B.L(k.pathOf(frame, true), { tone: "lo" });
    over += B.D([pt(port.y, port.z1 + 0.5)], { size: 0.7, tone: "hi" }) + B.L(G.circleOf({ o: W(facePt(F, port.y, port.z1 + 0.5, CLAD)), a: F.a, u: F.u, v: F.v }, 0, 0.05 * S, B.P, 10), { tone: "hi" });
  }
  B.prism(`tw.clad.near${i}`, FW, poly, 0, CLAD * S, { mat: "hide", tone: "hi", sys: "cladding", cut: true, over });
  // iron plate along the leading edge
  const pp = [[l0b, zb], [l0b + plate, zb], [l0t + plate, zt], [l0t, zt]].map(([l, z]) => [l * S, (z - zb) * SL * S]);
  const rows = [];
  const rivets = [];
  for (let z = zb + 0.6; z < zt - 0.2; z += 0.6) rows.push(k.pathOf([pt(panelLat("+x", z)[0], z), pt(lFront(z), z)]).replace(/^/, ""));
  for (let z = zb + 0.15; z < zt; z += 0.3) for (const f of [0.12, plate - 0.12]) rivets.push(B.at(W(facePt(F, panelLat("+x", z)[0] + f, z, CLAD + 0.025))));
  const plateRows = [];
  for (let z = zb + 0.6; z < zt - 0.2; z += 0.6) plateRows.push(k.pathOf([B.at(W(facePt(F, panelLat("+x", z)[0], z, CLAD + 0.025))), B.at(W(facePt(F, lFront(z), z, CLAD + 0.025)))]));
  void rows;
  B.prism(`tw.plate.near${i}`, FW, pp, CLAD * S, (CLAD + 0.025) * S, { mat: "iron", tone: "hi", sys: "cladding", cut: true, crease: "lo", inner: B.L(plateRows.join(""), { tone: "lo" }), over: B.D(rivets, { size: 0.45, tone: "hi" }) });
}

// ======================================================================================
// moving geometry
// ======================================================================================
// Parts whose outline never changes while the tower rolls (wheels, drums, capstans, hauling ropes):
// each is one fixed svg template with empty slots, built once per camera and cached on the builder.
// Only the slots — seams, studs, bolts, rope wraps, capstan bars, rope marks — are refilled, so the
// solid is never re-parsed and the painter keeps its cached order.
const solidCache = new WeakMap();
const SLOT = '<g data-decal=""></g>';
const DECALS = [];
function cacheOf(B) {
  let m = solidCache.get(B);
  if (!m) solidCache.set(B, (m = new Map()));
  return m;
}
function turnedSolid(B, p0, p1, r) {
  const a = W(p0), b = W(p1);
  const F = G.frameAlong(a, sub(b, a));
  const L0 = len(sub(b, a));
  const R = r * S;
  const paths = G.disc(0, L0, R, F, B.P, {});
  const ring = (s, rr = R) => Array.from({ length: 12 }, (_, i) => G.pointOf(F, s, rr / Math.cos(Math.PI / 12), (i / 12) * TAU));
  return { F, L0, R, paths, ring, pts: [...ring(0), ...ring(L0)] };
}
function livePart(B, id, build, slots, o) {
  const m = cacheOf(B);
  let t = m.get(id);
  if (!t) m.set(id, (t = build()));
  B.raw(id, t.svg, t.shape, o);
  DECALS.push([id, slots]);
}
function flushDecals(M) {
  const parts = M.scene && M.scene.parts;
  while (DECALS.length) {
    const [id, html] = DECALS.shift();
    const el = parts && parts.get(id) && parts.get(id).el;
    if (!el) continue;
    if (!el.__slots || el.__slots.some((g) => !el.contains(g))) el.__slots = [...el.querySelectorAll("[data-decal]")];
    el.__slots.forEach((g, i) => {
      const h = html[i] || "";
      if (g.__html !== h) {
        g.innerHTML = h;
        g.__html = h;
      }
    });
  }
}
const ringOn = (B, c, s, r, tone = "faint") => (B.visibleFace(s > c.L0 / 2 ? c.F.a : mul(c.F.a, -1)) ? B.L(G.circleOf(c.F, s, r, B.P), { tone }) : "");
const arcsOn = (B, c, list, tone = "lo") => B.L(list.map((s) => G.arcOf(c.F, s, c.R, B.P)).join(""), { tone });
const solidSvg = (B, c, inner = "", tone = "hi") => B.S(c.paths, { tone, inner });
// A squared bar as svg only (for bars that live inside another part's slot).
function barSvg(B, a, b, wd, ht, up, over = "") {
  const F = frameFrom(a, b, up);
  return B.S(extrudeAlong(F, polyRect(wd, ht), 0, len(sub(b, a)), B.P), { tone: "hi", over });
}

const ROPE_W = (B) => Math.max(1, 2 * 0.04 * S * B.KS);
const ropePath = (B, pts) => `<path class="iso-line" data-tone="hi" style="stroke-width:${ROPE_W(B).toFixed(2)}px" d="${k.pathOf(pts.map((p) => B.at(W(p))))}"/>`;

function drawGear(B, pose) {
  const ph = pose.wheel;
  const u = [0, Math.cos(ph), Math.sin(ph)], v = [0, -Math.sin(ph), Math.cos(ph)];
  const rIn = RW - 0.07;
  AXY.forEach((y, i) => {
    const Pv = (du, dv, x = XW1) => B.at(W([x, y + du * u[1] + dv * v[1], ZA + du * u[2] + dv * v[2]]));
    // three planks with two seams, a batten across them, studs in the iron tyre
    const lines = [];
    for (const dv of [-0.24, 0.24]) {
      const hl = Math.sqrt(rIn * rIn - dv * dv);
      lines.push(k.pathOf([Pv(-hl, dv), Pv(hl, dv)]));
    }
    const bw = 0.075;
    const hb = Math.sqrt(rIn * rIn - bw * bw);
    const batten = k.pathOf([Pv(-bw, -hb), Pv(-bw, hb)]) + k.pathOf([Pv(bw, -hb), Pv(bw, hb)]);
    const studs = [];
    for (let j = 0; j < 16; j++) studs.push(Pv((RW - 0.035) * Math.cos((j / 16) * TAU), (RW - 0.035) * Math.sin((j / 16) * TAU)));
    const nails = [-0.5, -0.36, 0.36, 0.5].map((dv) => Pv(0, dv));
    const face = B.L(lines.join(""), { tone: "lo" }) + B.L(batten, { tone: "mid" }) + B.D(studs, { size: 0.55, tone: "hi" }) + B.D(nails, { size: 0.45, tone: "mid" });
    // iron hub and axle end: bolts turn with the wheel, the linchpin with the axle
    const bolts = [];
    for (let j = 0; j < 6; j++) bolts.push(Pv(0.205 * Math.cos((j / 6) * TAU + 0.3), 0.205 * Math.sin((j / 6) * TAU + 0.3), XHUB));
    const pin = k.pathOf([Pv(0, -0.1, XEND), Pv(0, 0.1, XEND)]);
    const hub = B.D(bolts, { size: 0.55, tone: "hi" }) + `<path class="iso-line" data-tone="hi" style="stroke-width:1.2px" d="${pin}"/>`;
    // wheel, hub and axle end are one part: drawn in that order, never split by the painter
    livePart(B, `tw.wheel${i}`, () => {
      const c = turnedSolid(B, [XW0, y, ZA], [XW1, y, ZA], RW);
      const h = turnedSolid(B, [XW1, y, ZA], [XHUB, y, ZA], 0.27);
      const e = turnedSolid(B, [XHUB, y, ZA], [XEND, y, ZA], RA);
      const iron = (s) => `<g data-mat="iron">${s}</g>`;
      const svg = solidSvg(B, c, ringOn(B, c, c.L0, rIn * S, "lo") + arcsOn(B, c, [0.05 * S, c.L0 - 0.05 * S])) + SLOT + iron(solidSvg(B, h, ringOn(B, h, h.L0, 0.25 * S, "lo")) + solidSvg(B, e)) + `<g data-mat="iron" data-decal=""></g>`;
      return { svg, shape: shapeOf([...c.pts, ...h.pts, ...e.pts], { axes: [c.F.a], edges: [c.F.a, c.F.u, c.F.v] }) };
    }, [face, hub], { mat: "oak", sys: "wheels" });
  });
  // rope wrapped on the driven axles' drums, and its run up to the deck
  CAPS.forEach((c, j) => {
    const y = AXY[c.ax];
    const F = { o: w(DRUMX[0], y, ZA), a: [1, 0, 0], u, v };
    const ribs = k.fadedSvg(G.ribsOf(F, 0.08 * S, (DRUMX[1] - DRUMX[0] - 0.08) * S, DRV.rDrum * S, 20, B.P, { fade: [0.1, 0.55], twist: 0.5 }), { tone: "lo" });
    const run = [[XROPE, c.yd, ZS1], [XROPE, c.yd, ZA]];
    livePart(B, `tw.adrum${j}`, () => {
      const d = turnedSolid(B, [DRUMX[0], y, ZA], [DRUMX[1], y, ZA], DRV.rDrum);
      return { svg: solidSvg(B, d, arcsOn(B, d, [0.08 * S, d.L0 - 0.08 * S]) + ringOn(B, d, d.L0, (DRV.rDrum - 0.05) * S)) + SLOT + `<g data-mat="rope">${ropePath(B, run)}<g data-decal=""></g></g>`, shape: shapeOf(d.pts, { axes: [d.F.a], edges: [d.F.a, d.F.u, d.F.v] }) };
    }, [ribs, ropeMarks(B, run, -pose.rope, ROPE_W(B))], { mat: "oak", sys: "capstans" });
  });
}

function drawDrive(B, pose, st) {
  CAPS.forEach((c, j) => {
    const psi = (c.spin * pose.rope) / DRV.rCap + (st.stalled && st.drive ? Math.sin(performance.now() / 70) * 0.004 : 0);
    const F = { o: w(c.x, c.y, ZCAP0), a: [0, 0, 1], u: [Math.cos(psi), Math.sin(psi), 0], v: [-Math.sin(psi), Math.cos(psi), 0] };
    const s0 = (ZROPE - 0.14 - ZCAP0) * S, s1 = (ZROPE + 0.14 - ZCAP0) * S;
    const coil = k.fadedSvg(G.ribsOf(F, s0, s1, DRV.rCap * S, 14, B.P, { fade: [0.1, 0.55], twist: 0.6 }), { tone: "lo" });
    const FH = { o: w(c.x, c.y, ZHEAD), a: [0, 0, 1], u: F.u, v: F.v };
    const holes = B.D(G.dotsOf(FH, 0, 0.22 * S, 4, B.P, { all: true, phase: Math.PI / 4 }), { size: 0.6, tone: "hi" });
    // four bars through the head: the ones turned away from us are drawn behind it
    const far = [], near = [];
    for (let a = 0; a < 4; a++) {
      const ang = psi + (a * Math.PI) / 2;
      const d = [Math.cos(ang), Math.sin(ang), 0];
      const p0 = W(add([c.x, c.y, ZBAR], mul(d, 0.34))), p1 = W(add([c.x, c.y, ZBAR], mul(d, DRV.bar)));
      const grip = B.D([B.at(W(add([c.x, c.y, ZBAR + 0.055], mul(d, DRV.hand))))], { size: 0.5, tone: "hi" });
      const item = [dot(d, B.V), barSvg(B, p0, p1, 0.11 * S, 0.11 * S, [0, 0, 1], grip)];
      (item[0] < 0 ? far : near).push(item);
    }
    const order = (list) => list.sort((p, q) => p[0] - q[0]).map((x) => x[1]).join("");
    // the painter sees the capstan as the disc its bars sweep; drum and head sit inside it
    livePart(B, `tw.cap${j}`, () => {
      const dr = turnedSolid(B, [c.x, c.y, ZCAP0], [c.x, c.y, ZCAPD], DRV.rCap);
      const hd = turnedSolid(B, [c.x, c.y, ZCAPD], [c.x, c.y, ZHEAD], 0.34);
      const disc = (z) => Array.from({ length: 16 }, (_, i) => W([c.x + DRV.bar * 1.04 * Math.cos((i / 16) * TAU), c.y + DRV.bar * 1.04 * Math.sin((i / 16) * TAU), z]));
      const svg = solidSvg(B, dr, arcsOn(B, dr, [s0, s1])) + SLOT + SLOT + solidSvg(B, hd, arcsOn(B, hd, [0.06 * S, hd.L0 - 0.06 * S])) + SLOT;
      return { svg, shape: shapeOf([...disc(ZBAR - 0.06), ...disc(ZBAR + 0.06)], { axes: [[0, 0, 1]], edges: [[0, 0, 1], [1, 0, 0], [0, 1, 0]] }) };
    }, [coil, order(far), holes + order(near)], { mat: "oak", sys: "capstans" });
    // hauling rope from the capstan drum to the top of the sheave
    const run = [[XROPE, c.y, ZROPE], [XROPE, c.sy, ZROPE]];
    livePart(B, `tw.rope${j}`, () => ({ svg: ropePath(B, run) + SLOT, shape: shapeOf(run.map(W), { r: 0.03 * S, edges: [unit(sub(run[1], run[0]))] }) }), [ropeMarks(B, run, -pose.rope, ROPE_W(B))], { mat: "rope", sys: "capstans" });
    // the sheave turns it down through the deck; the wrap is drawn with the sheave
    const wrap = [];
    for (let i = 0; i <= 5; i++) {
      const a = Math.PI / 2 - (i / 5) * (Math.PI / 2);
      wrap.push([XROPE, c.sy + c.side * RSHV * Math.cos(a), ZSHV + RSHV * Math.sin(a)]);
    }
    wrap.push([XROPE, c.yd, LV[0]]);
    const turn = c.side * pose.sheave;
    const Fs = { o: w(XROPE + 0.07, c.sy, ZSHV), a: [1, 0, 0], u: [0, Math.cos(turn), Math.sin(turn)], v: [0, -Math.sin(turn), Math.cos(turn)] };
    livePart(B, `tw.shv${j}`, () => {
      const sv = turnedSolid(B, [XROPE - 0.07, c.sy, ZSHV], [XROPE + 0.07, c.sy, ZSHV], RSHV);
      return { svg: solidSvg(B, sv, ringOn(B, sv, sv.L0, 0.04 * S) + ringOn(B, sv, sv.L0, (RSHV - 0.03) * S)) + SLOT + `<g data-mat="rope">${ropePath(B, wrap)}<g data-decal=""></g></g>`, shape: shapeOf([...sv.pts, W(wrap[wrap.length - 1])], { axes: [sv.F.a], edges: [sv.F.a, sv.F.u, sv.F.v] }) };
    }, [B.L(G.spokesOf(Fs, 0, 0.04 * S, (RSHV - 0.03) * S, 4, B.P), { tone: "lo" }), ropeMarks(B, wrap, -pose.rope + 0.0, ROPE_W(B))], { mat: "oak", sys: "capstans" });
  });
}

// Tar marks every 0.42 m along a running rope, shifted by how far it has run.
function ropeMarks(B, pts, travel, width) {
  const step = 0.42;
  const marks = [];
  let acc = 0;
  let next = ((travel % step) + step) % step;
  for (let i = 0; i + 1 < pts.length; i++) {
    const L = len(sub(pts[i + 1], pts[i]));
    while (next <= acc + L) {
      marks.push(B.at(W(lerp(pts[i], pts[i + 1], (next - acc) / (L || 1)))));
      next += step;
    }
    acc += L;
  }
  return B.D(marks, { size: Math.max(0.6, width * 0.6), tone: "lo" });
}
// A rope whose route changes (the bridge ropes): drawn whole each time.
function ropeRun(B, id, pts, travel, o = {}) {
  const width = ROPE_W(B);
  const svg = `<path class="iso-line" data-tone="hi" style="stroke-width:${width.toFixed(2)}px" d="${k.pathOf(pts.map((p) => B.at(W(p))))}"/>` + ropeMarks(B, pts, travel, width);
  B.raw(id, svg, shapeOf(pts.map(W), { r: 0.03 * S, edges: [unit(sub(pts[pts.length - 1], pts[0]))] }), { mat: "rope", ...o });
}

function drawShutters(B, alpha) {
  const all = [];
  for (const p of SIDE_PORTS) {
    const F = panelFrame("+x", LV[p.st]);
    all.push({ id: `tw.shut.s${p.st}`, F, lat: p.y, z1: p.z1, Ls: p.z1 - p.z0 + 0.12, wd: p.w + 0.12, cut: true });
  }
  FRONT_PORTS.forEach((p, i) => all.push({ id: `tw.shut.f${i}`, F: panelFrame("-y", LV[4]), lat: p.x, z1: p.z1, Ls: p.z1 - p.z0 + 0.12, wd: p.w + 0.12, cut: undefined, eye: ZD + 0.42 }));
  for (const sh of all) {
    const F = sh.F;
    const H = facePt(F, sh.lat, sh.z1 + 0.05, CLAD);
    const down = mul(F.v, -1);
    const d = add(mul(down, Math.cos(alpha)), mul(F.a, Math.sin(alpha)));
    const t = add(mul(F.a, Math.cos(alpha)), mul(F.v, Math.sin(alpha)));
    const th = 0.06;
    const SF = { o: W(H), a: F.u, u: d, v: t };
    const at = (s, along, up = th) => B.at(W(add(add(H, mul(d, along)), add(mul(F.u, s), mul(t, up)))));
    const straps = [0.2, sh.Ls - 0.2].map((a) => k.pathOf([at(-sh.wd / 2, a), at(sh.wd / 2, a)])).join("");
    const rivets = [0.2, sh.Ls - 0.2].flatMap((a) => [at(-sh.wd / 2 + 0.08, a), at(sh.wd / 2 - 0.08, a)]);
    B.prism(sh.id, SF, [[0, 0], [sh.Ls * S, 0], [sh.Ls * S, th * S], [0, th * S]], (-sh.wd / 2) * S, (sh.wd / 2) * S, { mat: "oak", tone: "hi", sys: "ports", cut: sh.cut, over: B.L(straps, { tone: "lo" }) + B.D(rivets, { size: 0.45, tone: "hi" }) });
    const eye = facePt(F, sh.lat, sh.eye ?? sh.z1 + 0.5, CLAD);
    const tip = add(add(H, mul(d, sh.Ls)), mul(t, th));
    B.cord(`${sh.id}.rope`, [W(tip), W(eye)], { width: 0.9, tone: "hi", sys: "ports", cut: sh.cut, mat: "rope" });
  }
}

function drawEngine(B, name, ep, M) {
  const { E, eng } = ep;
  const Fr = engineFrame(eng.P0, ep.gamma, ep.psi);
  const at = (s, lat, up) => W(Fr.at(s, lat, up));
  const o = { sys: "ports" };
  const base = `tw.${name}.`;
  const box = (id, s0, s1, lat, up0, up1, extra = {}) => B.prism(base + id, { o: W(eng.P0), a: Fr.f, u: Fr.l, v: Fr.n }, [[-lat * S, up0 * S], [lat * S, up0 * S], [lat * S, up1 * S], [-lat * S, up1 * S]], s0 * S, s1 * S, { mat: "oak", tone: "hi", ...o, ...extra });
  const [st0, st1, stW, stH] = E.stock;
  box("stock", st0, st1, stW, -stH, 0, { inner: B.L(k.pathOf([B.at(at(st0, 0, 0)), B.at(at(st1, 0, 0))]), { tone: "faint" }) });
  const [sl0, sl1, slW, slH] = E.slider;
  const sS = ep.sS;
  box("slider", sS + sl0, sS + sl1, slW, 0, slH, { tone: "hi", over: B.D([B.at(at(sS + sl0 + 0.03, 0, slH))], { size: 0.6, tone: "hi" }) });
  const [f0, f1, fl, fu0, fu1] = E.frame;
  const fdots = [[-fl + 0.05, fu1], [fl - 0.05, fu1], [-fl + 0.05, fu0 + 0.05], [fl - 0.05, fu0 + 0.05]].map(([l, u]) => B.at(at(f1, l, u)));
  box("frame", f0, f1, fl, fu0, fu1, { over: B.D(fdots, { size: 0.5, tone: "hi" }) + B.L(k.pathOf([B.at(at(f1, -0.06, E.line - 0.04)), B.at(at(f1, 0.06, E.line - 0.04)), B.at(at(f1, 0.06, E.line + 0.04)), B.at(at(f1, -0.06, E.line + 0.04))], true), { tone: "lo" }) });
  const [wr, wh] = E.wash;
  for (const sgn of [-1, 1]) {
    const c0 = at(E.sk, sgn * E.a, fu1), c1 = at(E.sk, sgn * E.a, fu1 + wh);
    const lever = k.pathOf([B.at(at(E.sk, sgn * E.a, fu1 + wh)), B.at(at(E.sk - wr * 1.6, sgn * (E.a + wr * 0.9), fu1 + wh))]);
    B.cyl(`${base}wash${sgn}`, c0, c1, wr * S, { mat: "bronze", tone: "hi", ...o, over: B.L(lever, { tone: "hi" }), faceRing: [{ s: wh * S, r: wr * 0.45 * S }] });
  }
  // arms swing in the plane of the string
  const [aw, ah] = E.arm;
  const tips = [];
  for (const sgn of [-1, 1]) {
    const dir = add(mul(Fr.l, sgn * Math.cos(ep.ph)), mul(Fr.f, -Math.sin(ep.ph)));
    const root = add(Fr.at(E.sk, sgn * E.a, E.line), mul(dir, fl - E.a + 0.02));
    const tip = add(Fr.at(E.sk, sgn * E.a, E.line), mul(dir, E.La));
    tips.push(tip);
    B.beam(`${base}arm${sgn}`, W(root), W(tip), { w: aw * S, h: ah * S, up: Fr.n, mat: "oak", tone: "hi", ...o, nails: [{ s: (E.La - (fl - E.a) - 0.08) * S, face: "v", x: 0 }] });
  }
  const nock = Fr.at(ep.sN, 0, E.line);
  B.cord(`${base}string`, [W(tips[0]), W(nock), W(tips[1])], { width: 1, tone: "hi", mat: "sinew", ...o });
  const [ws, wl, wu, wrr] = E.win;
  const turn = ep.wind;
  const spokes = [];
  for (const sgn of [-1, 1]) for (let q = 0; q < 2; q++) {
    const a = turn + (q * Math.PI) / 2;
    const c = Fr.at(ws, sgn * wl, wu);
    const d = add(mul(Fr.f, Math.cos(a)), mul(Fr.n, Math.sin(a)));
    spokes.push(k.pathOf([B.at(W(add(c, mul(d, -0.16)))), B.at(W(add(c, mul(d, 0.16))))]));
  }
  B.cyl(`${base}win`, at(ws, -wl, wu), at(ws, wl, wu), wrr * S, { mat: "oak", tone: "hi", ...o, over: `<path class="iso-line" data-tone="hi" style="stroke-width:1.2px" d="${spokes.join("")}"/>` });
  // what it shoots, while it is on the engine
  const ammo = ep.ammo;
  if (ep.load > 0.999 && !ep.rel) {
    if (ammo.look === "bolt") looks.bolt(B, `${base}bolt`, at(ep.sN, 0, E.line), Fr.f, ammo.length * S, ammo.shaft * S, { sys: "ports" });
    else looks.draw(ammo.look, B, `${base}shot`, at(ep.sN + ammo.radius, 0, E.line + ammo.radius), ammo.radius * S, { seed: 5, axis: Fr.n, wick: true, sys: "ports" });
  } else if (ep.loading) {
    // carried from the ready store to the engine
    const u = ease(ep.loading);
    const lift = Math.sin(u * Math.PI) * 0.45;
    if (ammo.look === "bolt") {
      const src = PILE.bolts[name === "scA" ? 0 : 1];
      const p = lerp(src, Fr.at(ep.sN, 0, E.line), u);
      p[2] += lift;
      looks.bolt(B, `${base}bolt`, W(p), unit(lerp([0, -1, 0], Fr.f, u)), ammo.length * S, ammo.shaft * S, { sys: "ports" });
    } else {
      const src = ammo.id === "pots" ? pilePot(0, ammo.radius) : pileStone(3, ammo.radius);
      const p = lerp(src, Fr.at(ep.sN + ammo.radius, 0, E.line + ammo.radius), u);
      p[2] += lift;
      looks.draw(ammo.look, B, `${base}shot`, W(p), ammo.radius * S, { seed: 5, axis: [0, 0, 1], wick: true, sys: "ports" });
    }
  }
  void M;
}

function drawBridge(B, th, brake) {
  const d = [0, -Math.cos(th), Math.sin(th)];
  const n = [0, Math.sin(th), Math.cos(th)];
  const H = [0, BR.y, BR.z];
  const F = { o: W(H), a: [1, 0, 0], u: d, v: n };
  const L1 = BR.L - 0.1;
  const on = (x, u, up = BR.T) => B.at(W(add(add(H, [x, 0, 0]), add(mul(d, u), mul(n, up)))));
  const planks = [];
  for (let x = -BR.W / 2 + 0.3; x < BR.W / 2 - 0.1; x += 0.3) planks.push(k.pathOf([on(x, 0), on(x, L1)]));
  const cleats = [0.95, 1.95, 2.95].map((u) => k.pathOf([on(-BR.W / 2, u), on(BR.W / 2, u)])).join("");
  const straps = [-0.85, 0.85].map((x) => k.pathOf([on(x - 0.06, 0), on(x - 0.06, 0.7), on(x + 0.06, 0.7), on(x + 0.06, 0)])).join("");
  const nails = [];
  for (const u of [0.95, 1.95, 2.95]) for (let x = -BR.W / 2 + 0.15; x < BR.W / 2; x += 0.3) nails.push(on(x, u));
  const eyes = [-1.15, 1.15].map((x) => on(x, BR.sa));
  B.prism("tw.br.deck", F, [[0, 0], [L1 * S, 0], [L1 * S, BR.T * S], [0, BR.T * S]], (-BR.W / 2) * S, (BR.W / 2) * S, { mat: "oak", tone: "hi", sys: "bridge", inner: B.L(planks.join(""), { tone: "faint" }), over: B.L(cleats, { tone: "lo" }) + B.L(straps, { tone: "hi" }) + B.D(nails, { size: 0.4, tone: "mid" }) + B.D(eyes, { size: 0.8, tone: "hi" }) });
  const spikes = [];
  for (let x = -BR.W / 2 + 0.2; x < BR.W / 2; x += 0.4) spikes.push(on(x, BR.L, BR.T * 0.5));
  B.prism("tw.br.lip", F, [[L1 * S, -0.02 * S], [BR.L * S, -0.02 * S], [BR.L * S, (BR.T + 0.02) * S], [L1 * S, (BR.T + 0.02) * S]], (-BR.W / 2) * S, (BR.W / 2) * S, { mat: "iron", tone: "hi", sys: "bridge", crease: "lo", over: B.D(spikes, { size: 0.5, tone: "hi" }) });
  // ropes from the deck eyes over the gallows pulleys to the windlass drum
  const ell0 = Math.hypot(BR.y - BR.sa * Math.cos(BR.th0) - PUL.y, BR.z + BR.sa * Math.sin(BR.th0) - PUL.z);
  const ell = Math.hypot(BR.y - BR.sa * Math.cos(th) - PUL.y, BR.z + BR.sa * Math.sin(th) - PUL.z);
  const turn = (ell - ell0) / BWIN.r;
  for (const sx of [-1, 1]) {
    const A = add(add(H, [sx * 1.15, 0, 0]), add(mul(d, BR.sa), mul(n, BR.T)));
    const drumTop = [sx * 1.15, BWIN.y, BWIN.z + BWIN.r];
    const pts = overPulley(A, [sx * 1.15, PUL.y, PUL.z], PUL.r + 0.02, drumTop, sx * 1.15);
    // the run down to the bridge swings with it; the wrap rides on the pulley; the run back to the drum stays put
    ropeRun(B, `tw.br.rope${sx}`, pts.slice(0, 2), ell - ell0 - len(sub(pts[1], pts[0])), { sys: "bridge" });
    const wrap = pts.slice(1, pts.length - 1);
    const back = pts.slice(pts.length - 2);
    const turnP = (ell - ell0) / PUL.r;
    const Fp = { o: w(sx * 1.2, PUL.y, PUL.z), a: [1, 0, 0], u: [0, Math.cos(turnP), Math.sin(turnP)], v: [0, -Math.sin(turnP), Math.cos(turnP)] };
    livePart(B, `tw.gal.pulley${sx}`, () => {
      const pu = turnedSolid(B, [sx * 1.1, PUL.y, PUL.z], [sx * 1.2, PUL.y, PUL.z], PUL.r);
      return { svg: solidSvg(B, pu, ringOn(B, pu, sx > 0 ? pu.L0 : 0, 0.04 * S)) + SLOT + `<g data-mat="rope">${ropePath(B, wrap)}</g>`, shape: shapeOf(pu.pts, { axes: [pu.F.a], edges: [pu.F.a, pu.F.u, pu.F.v] }) };
    }, [B.L(G.spokesOf(Fp, 0, 0.04 * S, (PUL.r - 0.03) * S, 4, B.P), { tone: "lo" })], { mat: "oak", sys: "bridge" });
    livePart(B, `tw.br.back${sx}`, () => ({ svg: ropePath(B, back) + SLOT, shape: shapeOf(back.map(W), { r: 0.03 * S, edges: [unit(sub(back[1], back[0]))] }) }), [ropeMarks(B, back, ell - ell0, ROPE_W(B))], { mat: "rope", sys: "bridge" });
  }
  const Fd = { o: w(-1.3, BWIN.y, BWIN.z), a: [1, 0, 0], u: [0, Math.cos(turn), Math.sin(turn)], v: [0, -Math.sin(turn), Math.cos(turn)] };
  const band = G.arcOf(Fd, 0.12 * S, (BWIN.r + 0.01) * S, B.P);
  B.cyl("tw.br.drum", w(-1.3, BWIN.y, BWIN.z), w(1.3, BWIN.y, BWIN.z), BWIN.r * S, { F: Fd, mat: "oak", tone: "hi", sys: "bridge", ribs: { count: 16, twist: 0.3, phase: turn }, over: B.L(band, { tone: "hi" }) });
  const Fh = { o: w(1.48, BWIN.y, BWIN.z), a: [1, 0, 0], u: Fd.u, v: Fd.v };
  B.cyl("tw.br.hub", w(1.48, BWIN.y, BWIN.z), w(1.64, BWIN.y, BWIN.z), 0.16 * S, { F: Fh, mat: "iron", tone: "hi", sys: "bridge", bolts: [{ s: 0.16 * S, r: 0.1 * S, count: 4 }] });
  for (let q = 0; q < 2; q++) {
    const a = turn + q * Math.PI;
    const dir = [0, Math.cos(a), Math.sin(a)];
    const c = [1.56, BWIN.y, BWIN.z];
    B.beam(`tw.br.spike${q}`, W(add(c, mul(dir, 0.16))), W(add(c, mul(dir, 0.75))), { w: 0.07 * S, h: 0.07 * S, up: [1, 0, 0], mat: "oak", tone: "hi", sys: "bridge" });
  }
  // brake lever on the far cheek: pulled down harder for more brake
  const la = rad(40 - 55 * (brake / 100));
  const pv = [-1.57, BWIN.y + 0.18, BWIN.z - 0.18];
  B.beam("tw.br.brake", W(pv), W(add(pv, [0, 0.95 * Math.cos(la), 0.95 * Math.sin(la)])), { w: 0.07 * S, h: 0.08 * S, up: [1, 0, 0], mat: "iron", tone: "hi", sys: "bridge" });
}

const PILE = {
  bolts: [[2.36, -0.22, LV[4] + 0.614], [2.56, -0.22, LV[4] + 0.614]],
  pots: [[2.62, 0.25], [2.62, 0.62]],
  stones: [[1.55, 0.6, 0], [1.67, 0.62, 0], [1.6, 0.72, 0], [1.6, 0.64, 1]],
};
const pilePot = (j, r) => [PILE.pots[j][0], PILE.pots[j][1], LV[5] + 0.95 * r];
const pileStone = (j, r) => [PILE.stones[j][0], PILE.stones[j][1], LV[5] + r + PILE.stones[j][2] * r * 1.5];
// Is this kind of shot out of the ready store (on an engine, being carried, or in the air)?
function inUse(st, kind) {
  if (st.queue[0] === "draw" && st.plan && st.plan.ammo === kind && st.drawT >= 0.55) return true;
  if (st.mode === "shot" && st.vsim && st.vsim.shots[0].ammo.id === kind) return true;
  return kind === "bolts" ? st.eng.scA.loaded === "bolts" || st.eng.scB.loaded === "bolts" : st.eng.pa.loaded === kind;
}

function drawPile(B, M) {
  const st = M.state;
  const id = M.ammo.id;
  const [bolt, pot, stone] = M.def.ammo;
  if (!inUse(st, "bolts")) PILE.bolts.forEach((p, j) => looks.bolt(B, `tw.pile.bolt${j}`, W(p), [0, -1, 0], bolt.length * S, bolt.shaft * S, { lit: id === "bolts", sys: "ports", roll: j }));
  PILE.pots.forEach((_, j) => {
    if (j === 0 && inUse(st, "pots")) return;
    looks.pot(B, `tw.pile.pot${j}`, W(pilePot(j, pot.radius)), pot.radius * S, { lit: id === "pots", axis: [0, 0, 1], wick: true });
  });
  PILE.stones.forEach((_, j) => {
    if (j === 3 && inUse(st, "stones")) return;
    looks.stone(B, `tw.pile.stone${j}`, W(pileStone(j, stone.radius)), stone.radius * S, { mat: "stone", lit: id === "stones", seed: j + 2 });
  });
}

function drawMantlets(B, st) {
  MANTLETS.forEach((m) => {
    const burnt = !!st.charred[m.id];
    const x0 = m.x - 0.75, x1 = m.x + 0.75, z0 = ZWALK, z1 = ZWALK + 1.3;
    const lines = [];
    for (let x = x0 + 0.25; x < x1 - 0.1; x += 0.25) lines.push(k.pathOf([B.at(w(x, m.y, z0)), B.at(w(x, m.y, z1))]));
    const battens = [z0 + 0.3, z1 - 0.3].map((z) => k.pathOf([B.at(w(x0, m.y, z)), B.at(w(x1, m.y, z))])).join("");
    B.slab(`wall.mant${m.id}`, { x: x0 * S, y: (m.y - 0.08) * S, w: 1.5 * S, d: 0.08 * S, r: 0.01 * S }, z0 * S, 1.3 * S, { mat: burnt ? "pitch" : "wood", tone: "hi", inner: B.L(lines.join(""), { tone: "faint" }) + B.L(battens, { tone: "lo" }) });
    B.beam(`wall.mprop${m.id}`, w(m.x, m.y - 0.12, z1 - 0.3), w(m.x, m.y - 0.95, z0 + 0.04), { w: 0.08 * S, h: 0.08 * S, up: [1, 0, 0], mat: burnt ? "pitch" : "oak", tone: "mid" });
  });
}

// Projectiles once they are off the engine: in flight, and what they leave on the wall.
function drawFlights(B, M) {
  const st = M.state;
  if (st.mode !== "shot" || !M.shot || !st.vsim) return;
  const t = M.shot.t;
  for (const s of st.vsim.shots) {
    if (t < s.tRel) continue;
    const a = s.ammo;
    const inTower = (p) => p[1] > -hw(p[2]) - 0.35;
    if (t < s.tImp) {
      const f = s.flight.track.at(t - s.tRel);
      const p = f.p;
      const dir = unit(f.v);
      const id = (inTower(p) ? "tw." : "fly.") + s.name;
      if (a.look === "bolt") looks.bolt(B, id, W(sub(p, mul(dir, a.length))), dir, a.length * S, a.shaft * S, { roll: (t - s.tRel) * 9 });
      else looks.draw(a.look, B, id, W(p), a.radius * S, { spin: (t - s.tRel) * 6, seed: 5, axis: unit([f.v[0], f.v[1], f.v[2] + 0.001]), wick: true });
      continue;
    }
    if (a.look === "bolt") {
      stuckBolt(B, `fly.${s.name}.stuck`, s.hit.p, s.dir, a, s.inside);
    } else if (a.id === "stones" && s.fall) {
      const lt = t - s.tImp;
      const q = lt < s.fall.impact.t ? s.fall.track.at(lt).p : s.fall.impact.p;
      looks.stone(B, `fly.${s.name}.stone`, W(q), a.radius * S, { mat: "stone", seed: 9, spin: lt * 4 });
    }
  }
}
function stuckBolt(B, id, p, dir, a, inside) {
  const tail = sub(p, mul(dir, a.length - 0.07));
  looks.bolt(B, (inside ? "tw." : "") + id, W(tail), dir, a.length * S, a.shaft * S, {});
}

function drawMarks(B, st) {
  st.hits.forEach((h, i) => {
    if (st.mode === "shot" && st.vsim && i >= st.hits.length) return;
    if (h.inside && Math.abs(st.alpha - h.alpha) > 0.01) return;
    stuckBolt(B, `wall.hit${i}`, h.p, h.dir, { length: 0.69, shaft: 0.012 }, h.inside);
  });
  st.stones.forEach((p, i) => looks.stone(B, `wall.stone${i}`, W(p), 0.055 * S, { mat: "stone", seed: i + 11 }));
  st.scorch.forEach((sc, i) => {
    const c = sc.p;
    const flat = Math.abs(sc.n[2]) > 0.5;
    const pts = [];
    for (let j = 0; j < 14; j++) {
      const a = (j / 14) * TAU;
      const r = 0.42 + 0.12 * Math.sin(a * 3 + i);
      pts.push(flat ? [c[0] + r * Math.cos(a), c[1] + r * 0.8 * Math.sin(a), c[2] + 0.012] : [c[0] + r * Math.cos(a), c[1] + 0.012, c[2] + r * 0.8 * Math.sin(a)]);
    }
    B.raw(`wall.scorch${i}`, `<path class="iso-fill" style="opacity:.55" d="${k.pathOf(pts.map((p) => B.at(W(p))), true)}"/>`, shapeOf(pts.map(W), { r: 0.1 }), { mat: "pitch" });
  });
}

function drawStrobe(B, M) {
  const st = M.state;
  const now = M.shot ? M.shot.t : Infinity;
  let svg = "";
  const anchor = [];
  if (st.last === "bridge" && st.bsim) {
    const sim = st.bsim;
    const lines = [];
    const trace = [];
    const end = Math.min(now, sim.rest);
    for (let t = 0, dt = Math.max(0.1, sim.rest / 14); t <= end + 1e-6; t += dt) {
      const th = sim.rec.at(t).th;
      const tip = [0, BR.y - BR.L * Math.cos(th), BR.z + BR.L * Math.sin(th)];
      lines.push(k.pathOf([B.at(w(0, BR.y, BR.z)), B.at(W(tip))]));
    }
    for (let t = 0; t <= end + 1e-6; t += 1 / 60) {
      const th = sim.rec.at(t).th;
      trace.push(B.at(w(0, BR.y - BR.L * Math.cos(th), BR.z + BR.L * Math.sin(th))));
    }
    svg += B.L(lines.join(""), { tone: "lo" }) + (trace.length > 1 ? `<path class="iso-line" data-tone="lit" style="stroke:var(--accent);stroke-width:1.2px" d="${k.pathOf(trace)}"/>` : "");
    anchor.push(w(0, BR.y - 2, BR.z + 2));
  }
  if (st.last === "volley" && st.vsim) {
    const lines = [];
    for (const s of st.vsim.shots) {
      const path = [];
      const tEnd = Math.min(now, s.tImp);
      for (let t = s.tRel; t <= tEnd + 1e-6; t += 1 / 240) path.push(B.at(W(s.flight.track.at(t - s.tRel).p)));
      if (path.length > 1) svg += `<path class="iso-line" data-tone="lit" style="stroke:var(--accent);stroke-width:1.1px" d="${k.pathOf(path)}"/>`;
      // ghosts of the arms between trigger and release (seen only when the cladding is off)
      if (!M.toggles.cut) { anchor.push(W(s.hit.p)); continue; }
      const E = s.eng.E;
      const Fr = engineFrame(s.eng.P0, s.gamma, s.psi);
      const t0 = s.t0 + TRIG;
      const n = 6;
      for (let i = 0; i <= n; i++) {
        const t = t0 + ((s.tRel - t0) * i) / n;
        if (t > now) break;
        const ph = s.sim.rec.at(t - t0).ph;
        for (const sgn of [-1, 1]) {
          const dir = add(mul(Fr.l, sgn * Math.cos(ph)), mul(Fr.f, -Math.sin(ph)));
          const c = Fr.at(E.sk, sgn * E.a, E.line);
          lines.push(k.pathOf([B.at(W(c)), B.at(W(add(c, mul(dir, E.La))))]));
        }
      }
      anchor.push(W(s.hit.p));
    }
    svg += B.L(lines.join(""), { tone: "lo" });
  }
  if (svg) B.marks("strobe", svg, anchor.length ? anchor : [w(0, 0, 10)], { r: 400, layer: 6 });
}

// The tower moves as a whole: its parts are drawn once at the wall and shifted with one transform,
// plus a small pitch about the base for the sway.
function placeTower(B, M, pose) {
  flushDecals(M);
  const scene = M.scene;
  if (!scene || !scene.parts) return;
  const o = B.at([0, 0, 0]);
  const q = B.at([0, pose.off * S, 0]);
  const dx = q[0] - o[0], dy = q[1] - o[1];
  const a = deg(pose.sway);
  const move = Math.abs(dx) + Math.abs(dy) > 1e-3 ? `translate(${dx.toFixed(2)} ${dy.toFixed(2)})` : "";
  const turn = Math.abs(a) > 1e-3 ? ` rotate(${a.toFixed(3)} ${o[0].toFixed(1)} ${o[1].toFixed(1)})` : "";
  const tf = (move + turn).trim();
  for (const p of scene.parts.values()) {
    if (!p.id.startsWith("tw.") || !p.el) continue;
    const t = p.id === "tw.halo" || p.id === "tw.strobe" ? (p.id === "tw.halo" ? move : tf) : tf;
    if (p.el.__tf !== t) {
      if (t) p.el.setAttribute("transform", t);
      else p.el.removeAttribute("transform");
      p.el.__tf = t;
    }
  }
}

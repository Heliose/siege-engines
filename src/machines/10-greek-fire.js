// 10 · Greek fire siphon on the bow of a Byzantine dromon (from c. 672 AD; Theophanes, Leo VI's
// Tactica, the Madrid Skylitzes; reconstruction after Haldon). Authored in metres, z up, the jet
// goes down-range along −y at the enemy galley lying across our bow. Sea level is z = 0.
//
// TRUTH (SI; "bar" is gauge unless marked abs)
//  Tank: cast bronze, Ø0.34 × 0.58 m inside = 52.7 L; charge 40 L leaves 12.7 L of air; a dip tube
//    reaches 4 cm off the floor. Air is an ideal gas: p_air = p0·(n/V_head)·(T/T0), n in free litres.
//  Vapour: Clausius–Clapeyron p_v = p0·exp(ΔH/R·(1/T_b − 1/T)); naphtha T_b 95 °C, pitch-resin
//    175 °C, lime-sulphur blend 115 °C. Tank p = p_air + p_v; the jet sees Δp = p − p0.
//  Brazier: charcoal, Q_in = k·h·(T_fire − T) with k 12 W/K at full (×2.2 with bellows, T_fire
//    650 / 850 °C); 60 W/K lost to the air; heat capacity m_fuel·c_p + 30 kg bronze × 0.38 kJ/kgK.
//  Pump (Ctesibius force pump): two bronze barrels, bore 100 mm, stroke 280 mm (2.2 L), dead space
//    0.18 L, flap inlets, check outlets; rocking beam 2 m, links at ±0.30 m, handles at ±1.0 m.
//    Isothermal compression, delivery only above tank pressure; the crew stalls near 6.5 bar.
//  Nozzle: 12 mm orifice in a bronze beast head on a swivel (traverse) and hollow trunnion
//    (elevation), 20 mm plug cock. v = √(2Δp/ρ / (1/Cv² + K_pipe + K_cock)), Q = A·v.
//    Naphtha ρ 840, Cv .94; pitch-resin ρ 1010, Cv .32 → .86 as it warms 30 → 140 °C; blend ρ 930.
//  Jet: linear break-up drag (0.85 / 0.55 / 0.95 s⁻¹) plus gravity → reach 12–28 m at 3–6 bar.
//  Refill: naphtha and the blend come from the hold at 30 °C, pitch-resin from jars kept by the brazier
//    at 85 °C (cold it barely flows). Opening the filler vents the tank to the air.
//  Fires: pool regression 0.07 / 0.06 / 0.04 mm/s; flame height (Heskestad) L = 0.235·Q^0.4 − 1.02·D;
//    a slick spreads until its film is too thin to burn (0.6 / 1.5 / 0.12 mm). On the hull 35 / 95 /
//    55 % sticks, the rest runs into the sea; planks scorch, char, catch and pass fire upward.
//
// PARTS (≈ 430): diorama base and sea inlay; dromon bow — 96 strakes, main and forecastle decks,
//  two bulkheads with a door, ladder, stem, spur with cap, 10 rail posts and rails, 6 oars with
//  leathers; siphon — hearth, brazier walls, door, legs, grate, coals, tank (bands, rings, flange,
//  lid, ports, lugs, filler, cap), pump bed, barrels, glands, valve chests, flaps, fulcrum, pivot,
//  beam with straps and handles, links, crossheads, rods, manifold tees, air line with check valve,
//  delivery line with flanges, union, crutches, clamps, plug cock with T-handle, swivel pedestal,
//  sleeve, traverse scale, head, yoke, trunnion, nozzle with bands, beast head, ears, eyes, jaw,
//  lamp, tiller, quadrant, bellows; rack with three amphorae; enemy galley — 66 strakes, 6 deck
//  pieces, 7 benches, mast, partner, yard, 5 sail cloths, rigging, stem and stern posts, 14 oars
//  with tholes, 2 quarter rudders.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import * as GL from "../../vendor/anatomy/kit/gl.mjs";
import * as TB from "../../vendor/anatomy/kit/tube.mjs";
import { add, sub, mul, dot, cross, unit, len, lerp, clamp, rad, deg, ease, smoothstep, fmt, fmtInt, TAU, rng, rotate } from "../engine/vec.js";
import * as PH from "../engine/physics.js";
import * as looks from "../engine/looks.js";
import { createBuilder, polyRect, polyCircle } from "../engine/geo.js";
import { shapeOf } from "../engine/scene.js";

const ID = "greek-fire";
const U = 0.085;
const S = 1 / U;
const W = (p) => [p[0] * S, p[1] * S, p[2] * S];
const w = (x, y, z) => [x * S, y * S, z * S];
const X = [1, 0, 0];
const Y = [0, 1, 0];
const Z = [0, 0, 1];
const g = 9.81;
const AZ = 30;
const EL = 24;
const VF = [Math.cos(rad(AZ)), Math.sin(rad(AZ))]; // floor direction toward the viewer
const WIND = [-0.28, -1.05, 0]; // m/s, smoke drifts down-range and away

// ---------------------------------------------------------------- fuels
const FUELS = {
  naphtha: { rho: 840, cp: 2.0, Tb: 95, dh: 3850, D: 0.85, cv: () => 0.94, K: () => 0.15, fillT: 30, reg: 0.07, hMin: 0.6, spread: 0.55, dH: 43, stick: 0.35, run: 0.6, wet: "copper", jar: "clay", flame: 1.0, soot: 0.35, drop: 0.11, rMax: 3.2 },
  pitch: { rho: 1010, cp: 1.8, Tb: 175, dh: 5200, D: 0.55, cv: (T) => 0.32 + 0.54 * smoothstep(30, 140, T), K: (T) => 0.3 + 2.5 * (1 - smoothstep(30, 140, T)), fillT: 85, reg: 0.06, hMin: 1.5, spread: 0.1, dH: 38, stick: 0.95, run: 0.02, wet: "pitch", jar: "pitch", flame: 0.72, soot: 1.0, drop: 0.16, rMax: 0.9 },
  lime: { rho: 930, cp: 1.6, Tb: 115, dh: 4200, D: 0.95, cv: () => 0.88, K: () => 0.25, fillT: 30, reg: 0.04, hMin: 0.12, spread: 0.35, dH: 30, stick: 0.55, run: 0.18, wet: "sinew", jar: "stone", flame: 0.85, soot: 0.15, drop: 0.12, rMax: 1.6, split: true },
};
const WOOD = { reg: 0, flame: 0.8, soot: 0.6 };
const P0 = 1.01325; // bar abs
const T0K = 293.15;
const TANK_V = Math.PI * 0.17 * 0.17 * 0.58 * 1000; // 52.7 L
const CHARGE = 40;
const RESID = 0.6;
const A_N = Math.PI * 0.006 * 0.006;
const A_V = Math.PI * 0.01 * 0.01;
const CV_V = 0.8;
const PUMP = { A: Math.PI * 0.05 * 0.05, Vd: 0.18, eta: 0.92, arm: 0.3, link: 0.14, rod: 0.58, bore0: 1.48, pmax: 6.5 };
const PHI_MAX = Math.asin(0.14 / PUMP.arm);
const LOOSE_MIN = 2.4;
const LOOSE_TARGET = 3.6;
const BURST = 3.0;
const OPEN_T = 0.3;

const pvOf = (f, T) => P0 * Math.exp(f.dh * (1 / (f.Tb + 273.15) - 1 / (T + 273.15)));
function tankP(tk) {
  const f = FUELS[tk.fuel];
  const head = TANK_V - tk.vol;
  const pa = P0 * (tk.air / head) * ((tk.T + 273.15) / T0K);
  const pv = tk.vol > RESID ? Math.min(pvOf(f, tk.T), 12) : 0;
  const p = pa + pv;
  return { pa, pv, p, dp: p - P0, head };
}
// Free litres of air that give the tank a gauge pressure `dp` at its temperature.
function airFor(tk, dp) {
  const head = TANK_V - tk.vol;
  const pv = tk.vol > RESID ? pvOf(FUELS[tk.fuel], tk.T) : 0;
  const pa = Math.max(0.05, dp + P0 - pv);
  return (pa / P0) * head * (T0K / (tk.T + 273.15));
}
function exitV(fuel, dp, T, u) {
  if (dp <= 0 || u <= 0.002) return 0;
  const f = FUELS[fuel];
  const Kv = (A_N / (u * A_V)) ** 2 / (CV_V * CV_V);
  return Math.sqrt((2 * dp * 1e5) / f.rho / (1 / f.cv(T) ** 2 + f.K(T) + Kv));
}

// ---------------------------------------------------------------- pump geometry (shared by physics and drawing)
const PIV = [0, 5.8, 2.35];
const CYL_Y = [5.5, 6.1];
const pinAt = (phi, s) => [0, PIV[1] + s * Math.cos(phi), PIV[2] + s * Math.sin(phi)];
function crossZ(phi, s, yc) {
  const p = pinAt(phi, s);
  const dy = p[1] - yc;
  return p[2] - Math.sqrt(Math.max(1e-6, PUMP.link * PUMP.link - dy * dy));
}
const pistonX = (phi) => [crossZ(phi, -PUMP.arm, CYL_Y[0]) - PUMP.rod - PUMP.bore0, crossZ(phi, PUMP.arm, CYL_Y[1]) - PUMP.rod - PUMP.bore0];
const beamPhi = (tk) => PHI_MAX * tk.amp * Math.sin(tk.phase);

function newTank(fuel) {
  const tk = { fuel, vol: CHARGE, T: 95, air: 0, phase: 0, amp: 1, run: false, cyl: [0, 0], flap: [0, 0], strokes: 0, bel: 0, belRun: false, qin: 0 };
  const x = pistonX(0);
  tk.cyl = x.map((xx) => PUMP.Vd + PUMP.A * xx * 1000);
  tk.air = airFor(tk, 1.6);
  return tk;
}
const cloneTank = (tk) => ({ ...tk, cyl: [...tk.cyl], flap: [...tk.flap] });

// One step of the tank: pump, brazier, discharge. Returns the instantaneous jet.
function stepTank(tk, inp, dt) {
  const f = FUELS[tk.fuel];
  // Rocking beam: runs while pumped, else finishes its half-stroke and rests level.
  const before = tk.phase;
  if (inp.pump) {
    tk.run = true;
    tk.phase += TAU * (inp.rate / 60) * dt;
  } else if (tk.run) {
    tk.phase += TAU * (Math.max(inp.rate, 30) / 60) * dt;
    if (Math.floor(tk.phase / Math.PI) !== Math.floor(before / Math.PI)) {
      tk.phase = Math.floor(tk.phase / Math.PI) * Math.PI;
      tk.run = false;
    }
  }
  if (Math.floor(tk.phase / Math.PI) !== Math.floor(before / Math.PI)) tk.strokes++;
  const pr0 = tankP(tk);
  const ampT = 1 - 0.8 * smoothstep(0.72 * PUMP.pmax, PUMP.pmax, pr0.dp);
  tk.amp += (ampT - tk.amp) * (1 - Math.exp(-dt / 0.4));
  const xs = pistonX(beamPhi(tk));
  const pt = pr0.p;
  for (let i = 0; i < 2; i++) {
    const V = PUMP.Vd + PUMP.A * xs[i] * 1000;
    let pc = (P0 * tk.cyl[i]) / V;
    tk.flap[i] = 0;
    if (pc < P0) {
      tk.cyl[i] = V; // inlet flap open, the barrel breathes at p0
      pc = P0;
      tk.flap[i] = 1;
    }
    if (pc > pt) {
      const dn = tk.cyl[i] - (pt * V) / P0;
      tk.cyl[i] -= dn;
      tk.air += dn * PUMP.eta;
    }
  }
  // Brazier and the hot charge.
  const kb = 0.012 * inp.heat * (inp.bellows ? 2.2 : 1);
  const Tf = inp.bellows ? 850 : 650;
  tk.qin = kb * (Tf - tk.T);
  const C = (tk.vol / 1000) * f.rho * f.cp + 30 * 0.38;
  tk.T += ((tk.qin - 0.06 * (tk.T - 20)) / C) * dt;
  // Discharge through the cock and the nozzle.
  const pr = tankP(tk);
  let v = 0;
  let q = 0;
  if (inp.u > 0.002) {
    if (tk.vol > RESID) {
      v = exitV(tk.fuel, pr.dp, tk.T, inp.u);
      q = A_N * v * 1000;
      const dv = Math.min(q * dt, tk.vol - RESID);
      tk.vol -= dv;
    } else tk.air = Math.max(airFor(tk, 0), tk.air * Math.exp(-dt * 1.6 * inp.u)); // empty: the air hisses out
  }
  return { v, q, ...tankP(tk) };
}

// ---------------------------------------------------------------- our dromon's bow
const OUR = { yFull: 4.2, yCut: 7.4, b0: 1.95, flare: 0.1, deck: 1.3, fcY: 2.75, fcDeck: 2.05, fcTop: 2.55 };
const stemY = (z) => -0.35 - 0.22 * z;
const ourSpan = (z) => OUR.yFull - stemY(z);
const ourU = (y, z) => clamp((OUR.yFull - y) / ourSpan(z), 0, 1);
const ourB = (y, z) => (OUR.b0 + OUR.flare * z) * Math.pow(Math.max(0, 1 - ourU(y, z) ** 2), 0.7);
const sheer = (y) => 1.45 + 0.75 * Math.pow(clamp((OUR.yFull - y) / 4.6, 0, 1), 2.2);
const ourY = (u, z) => (typeof u === "object" ? u.y : u <= 0 ? OUR.yFull + (-u / 0.7) * (OUR.yCut - OUR.yFull) : OUR.yFull - u * ourSpan(z));
function ourAt(u, level, side) {
  let y = ourY(u, 1);
  let z = level(y);
  for (let i = 0; i < 5; i++) {
    y = ourY(u, z);
    z = level(y);
  }
  return [side * ourB(y, z), y, z];
}
const OUR_U = [-0.7, -0.35, 0, 0.22, 0.42, 0.6, 0.75, 0.87, 0.95, 0.994];
const OUR_F = [0, 0.3, 0.56, 0.78, 1];
const FC_U = [{ y: OUR.fcY }, 0.42, 0.6, 0.75, 0.87, 0.95, 0.994];
const OUR_OARS = [5.0, 6.05, 7.05];
// Skins are thicker than the painter's tolerance (0.6 units) so neighbours never tie on their normal.
const PLANK = 0.065;

// ---------------------------------------------------------------- the enemy galley
const EN = { c: [1.2, -13.2], d: [-0.8, 0.6, 0], n: [0.6, 0.8, 0], L: 6.0, b0: 1.32, flare: 0.09, deck: 0.86 };
const enEnd = (z) => EN.L + 0.32 * z;
const enStern = (z) => EN.L + 0.28 * z;
const enB = (s, z) => {
  const e = s >= 0 ? enEnd(z) : enStern(z);
  return (EN.b0 + EN.flare * z) * Math.pow(Math.max(0, 1 - (s / e) ** 2), 0.62);
};
const enSheer = (s) => 1.05 + 0.55 * Math.pow(Math.min(1, Math.abs(s) / EN.L), 3);
const enP = (s, t, z) => [EN.c[0] + EN.d[0] * s + EN.n[0] * t, EN.c[1] + EN.d[1] * s + EN.n[1] * t, z];
const enLocal = (p) => {
  const dx = p[0] - EN.c[0];
  const dy = p[1] - EN.c[1];
  return { s: dx * EN.d[0] + dy * EN.d[1], t: dx * EN.n[0] + dy * EN.n[1], z: p[2] };
};
function enAt(v, f, side) {
  let s = v * EN.L;
  let z = f * enSheer(s);
  for (let i = 0; i < 5; i++) {
    s = v * (v >= 0 ? enEnd(z) : enStern(z));
    z = f * enSheer(s);
  }
  return enP(s, side * enB(s, z), z);
}
const EN_V = [-0.994, -0.95, -0.86, -0.7, -0.46, -0.16, 0.14, 0.44, 0.7, 0.86, 0.95, 0.994];
const EN_F = [0, 0.36, 0.7, 1];
const EN_OARS = Array.from({ length: 7 }, (_, i) => -3.9 + 1.2 * i);
const EN_DECK_S = [-6.0, -4.0, -1.4, 1.4, 4.0, 6.05];
const MAST_S = 0.8;
const YARD = { s0: 4.4, z0: 2.2, s1: -4.0, z1: 7.9, t: 0.17 };
const yardZ = (s) => YARD.z0 + ((YARD.s0 - s) / (YARD.s0 - YARD.s1)) * (YARD.z1 - YARD.z0);
const SAIL = { t: 0.26, tack: [3.9, 2.42], peak: [-3.5, 7.44], clew: [-2.3, 1.55], n: 5 };

// Planks of the enemy hull, with their centres and outward normals (for charring and flames).
const EN_PLANKS = [];
for (const side of [1, -1]) {
  for (let j = 0; j < EN_F.length - 1; j++) {
    for (let i = 0; i < EN_V.length - 1; i++) {
      const c = [enAt(EN_V[i], EN_F[j], side), enAt(EN_V[i + 1], EN_F[j], side), enAt(EN_V[i + 1], EN_F[j + 1], side), enAt(EN_V[i], EN_F[j + 1], side)];
      const mid = mul(add(add(c[0], c[1]), add(c[2], c[3])), 0.25);
      EN_PLANKS.push({ id: `en.p${side > 0 ? "s" : "p"}${j}.${i}`, side, j, i, c, mid, n: mul(EN.n, side), base: "oak" });
    }
  }
}
const PLANK_AT = new Map(EN_PLANKS.map((p, n) => [`${p.side}|${p.j}|${p.i}`, n]));
const plankIndex = (side, j, i) => PLANK_AT.get(`${side}|${j}|${i}`) ?? -1;
const EN_DECKS = EN_DECK_S.slice(0, -1).map((s0, i) => {
  const s1 = EN_DECK_S[i + 1];
  const sm = (s0 + s1) / 2;
  const z = EN.deck;
  const half = (s) => Math.max(0.12, enB(s, z) - 0.075);
  const pts = [enP(s0, half(s0), z), enP(sm, half(sm), z), enP(s1, half(s1), z), enP(s1, -half(s1), z), enP(sm, -half(sm), z), enP(s0, -half(s0), z)];
  return { id: `en.deck${i}`, pts, mid: enP(sm, 0, z), s0, s1, base: "wood" };
});
// Sail cloths: strips parallel to the leech, from the luff (on the yard) to the foot.
const SAIL_PANELS = (() => {
  const { tack, peak, clew, n } = SAIL;
  const dir = [clew[0] - peak[0], clew[1] - peak[1]];
  const foot = [clew[0] - tack[0], clew[1] - tack[1]];
  const L = (i) => [tack[0] + ((peak[0] - tack[0]) * i) / n, tack[1] + ((peak[1] - tack[1]) * i) / n];
  const F = (i) => {
    if (i === 0) return tack;
    const a = L(i);
    // a + p·dir = tack + q·foot
    const det = dir[0] * -foot[1] - dir[1] * -foot[0];
    const rx = tack[0] - a[0];
    const ry = tack[1] - a[1];
    const p = (rx * -foot[1] - ry * -foot[0]) / det;
    return [a[0] + dir[0] * p, a[1] + dir[1] * p];
  };
  const out = [];
  for (let i = 0; i < n; i++) {
    const quad = i === 0 ? [L(0), L(1), F(1)] : [L(i), L(i + 1), F(i + 1), F(i)];
    const pts = quad.map(([s, z]) => enP(s, SAIL.t, z));
    const mid = pts.reduce((a, b) => add(a, mul(b, 1 / pts.length)), [0, 0, 0]);
    out.push({ id: `en.sail${i}`, quad, pts, mid, base: "rope" });
  }
  return out;
})();
function sailPanelAt(s, z) {
  const { tack, peak, clew, n } = SAIL;
  const dir = [clew[0] - peak[0], clew[1] - peak[1]];
  const luff = [peak[0] - tack[0], peak[1] - tack[1]];
  // (s, z) = tack + λ·luff + μ·dir  → λ is the share along the luff
  const det = luff[0] * dir[1] - luff[1] * dir[0];
  const rx = s - tack[0];
  const rz = z - tack[1];
  const lam = (rx * dir[1] - rz * dir[0]) / det;
  const mu = (luff[0] * rz - luff[1] * rx) / det;
  // inside the triangle: 0 ≤ λ ≤ 1, 0 ≤ μ, and above the foot
  if (lam < 0 || lam > 1 || mu < 0) return -1;
  const footZ = tack[1] + ((clew[1] - tack[1]) * (tack[0] - s)) / (tack[0] - clew[0]);
  if (z < footZ) return -1;
  return Math.min(n - 1, Math.floor(lam * n));
}

// ---------------------------------------------------------------- the siphon's layout (metres)
const TANK = { x: 0, y: 3.6, zb: 1.78, r: 0.176, rIn: 0.17, z0: 1.82, z1: 2.4 };
const LID = { z0: 2.44, z1: 2.47 };
const PORT = { out: [0, 3.47], inl: [-0.04, 3.74], fill: [-0.11, 3.58] };
const BRZ = { y: 3.6, half: 0.31, z0: 1.42, z1: 1.86, t: 0.03 };
const SW = [0, 0.45];
const TRUN_Z = 3.0;
const DEL_Z = 2.62;
const VALVE_Y = 1.75;
const RACK = { x: -0.92, ys: [4.08, 4.52, 4.96], toe: 1.34 };
const BELLOWS = { y0: 4.0, len: 0.6, z: 1.52 };
const levelZ = (vol) => TANK.z0 + vol / 1000 / (Math.PI * TANK.rIn * TANK.rIn);
const DEL_ROUTE = [[PORT.out[0], PORT.out[1], 2.52], [PORT.out[0], PORT.out[1], DEL_Z], [SW[0], SW[1] + 0.135, DEL_Z]];
const AIR_ROUTE = [[-0.23, 6.1 - 0.035, 1.5], [-0.23, 5.15, 1.5], [-0.45, 5.15, 1.5], [-0.45, 4.0, 1.5], [-0.45, 4.0, 2.66], [PORT.inl[0], PORT.inl[1] + 0.02, 2.66], [PORT.inl[0], PORT.inl[1], 2.52]];

// Nozzle frame for elevation θ and traverse ψ (degrees).
function nozzleFrame(elev, trav) {
  const th = rad(elev);
  const ps = rad(trav);
  const f = [Math.sin(ps) * Math.cos(th), -Math.cos(ps) * Math.cos(th), Math.sin(th)];
  const across = [Math.cos(ps), Math.sin(ps), 0];
  const up = cross(across, f);
  const o = [SW[0], SW[1], TRUN_Z];
  return { o, f, across, up, at: (s, a = 0, u = 0) => add(add(add(o, mul(f, s)), mul(across, a)), mul(up, u)) };
}
const MOUTH_S = 1.02;

// ---------------------------------------------------------------- the jet
function jetPath(p0, v0, D) {
  return (t) => {
    const e = Math.exp(-D * t);
    const kk = (1 - e) / D;
    return { p: [p0[0] + v0[0] * kk, p0[1] + v0[1] * kk, p0[2] + (v0[2] + g / D) * kk - (g * t) / D], v: [v0[0] * e, v0[1] * e, (v0[2] + g / D) * e - g / D] };
  };
}
const insideEnemy = (L) => L.z >= 0 && L.z <= enSheer(L.s) && Math.abs(L.t) <= enB(L.s, L.z) && L.s < enEnd(L.z) && L.s > -enStern(L.z);
// Where the jet goes: first contact with the galley's side, deck or sail, or the sea.
function traceJet(p0, v0, D) {
  const f = jetPath(p0, v0, D);
  let prev = f(0);
  let prevL = enLocal(prev.p);
  let hit = null;
  let tw = null;
  for (let t = 0.01; t < 5; t += 0.01) {
    const cur = f(t);
    const L = enLocal(cur.p);
    if (!hit) {
      const st = (prevL.t - SAIL.t) * (L.t - SAIL.t);
      if (st <= 0 && Math.abs(L.t - prevL.t) > 1e-9) {
        const u = (SAIL.t - prevL.t) / (L.t - prevL.t);
        const s = prevL.s + (L.s - prevL.s) * u;
        const z = prevL.z + (L.z - prevL.z) * u;
        const panel = sailPanelAt(s, z);
        if (panel >= 0) hit = { kind: "sail", t: t - 0.01 + 0.01 * u, p: lerp(prev.p, cur.p, u), s, z, panel };
      }
      if (!hit && insideEnemy(L)) {
        let a = t - 0.01;
        let b = t;
        for (let i = 0; i < 12; i++) {
          const m = (a + b) / 2;
          insideEnemy(enLocal(f(m).p)) ? (b = m) : (a = m);
        }
        const q = f(b);
        const Lq = enLocal(q.p);
        const fromAbove = prevL.z > enSheer(prevL.s) - 0.02;
        hit = { kind: fromAbove ? "deck" : "hull", t: b, p: q.p, s: Lq.s, z: Lq.z, side: Lq.t >= 0 ? 1 : -1 };
      }
    }
    if (cur.p[2] <= 0) {
      let a = t - 0.01;
      let b = t;
      for (let i = 0; i < 14; i++) {
        const m = (a + b) / 2;
        f(m).p[2] > 0 ? (a = m) : (b = m);
      }
      tw = b;
      if (!hit) hit = { kind: "water", t: b, p: f(b).p };
      break;
    }
    prev = cur;
    prevL = L;
  }
  if (tw === null) tw = 5;
  const land = f(tw).p;
  return { hit, f, tWater: tw, reach: Math.hypot(land[0] - p0[0], land[1] - p0[1]) };
}

// ---------------------------------------------------------------- small geometry helpers
// A plank (or any 4-point patch of a skin): the outer quad extruded `thick` inward along `hint`.
function skin(B, id, c, thick, hint, o) {
  const n0 = c.length;
  const O = c.reduce((a, b) => add(a, mul(b, 1 / n0)), [0, 0, 0]);
  const u = unit(n0 === 4 ? sub(add(c[1], c[2]), add(c[0], c[3])) : sub(c[1], c[0]));
  let n = unit(cross(u, n0 === 4 ? sub(add(c[3], c[2]), add(c[0], c[1])) : sub(c[2], c[0])));
  if (dot(n, hint) < 0) n = mul(n, -1);
  const v = cross(n, u);
  const F = { o: W(O), a: n, u, v };
  const poly = c.map((p) => {
    const d = sub(p, O);
    return [dot(d, u) * S, dot(d, v) * S];
  });
  B.prism(id, F, poly, -thick * S, 0, o);
  return { O, n, u, v };
}
// A flat plate whose plan polygon (metres) lies at height z, thickness down from z.
function plate(B, id, pts2, z, thick, o) {
  const F = { o: w(0, 0, z), a: Z, u: X, v: Y };
  B.prism(id, F, pts2.map(([x, y]) => [x * S, y * S]), -thick * S, 0, o);
}
function clipSeg(poly, a, b) {
  let t0 = 0;
  let t1 = 1;
  const c = poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);
  const d = [b[0] - a[0], b[1] - a[1]];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    let n = [-(q[1] - p[1]), q[0] - p[0]];
    if ((c[0] - p[0]) * n[0] + (c[1] - p[1]) * n[1] < 0) n = [-n[0], -n[1]];
    const num = (a[0] - p[0]) * n[0] + (a[1] - p[1]) * n[1];
    const den = d[0] * n[0] + d[1] * n[1];
    if (Math.abs(den) < 1e-12) {
      if (num < 0) return null;
      continue;
    }
    const t = -num / den;
    if (den > 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return null;
  }
  return [[a[0] + d[0] * t0, a[1] + d[1] * t0], [a[0] + d[0] * t1, a[1] + d[1] * t1]];
}
// Seam lines across a plate (metres), clipped to its outline so every line ends on an edge.
function seams(B, poly, z, dir, step, inset = 0) {
  const n = [-dir[1], dir[0]];
  const ds = poly.map((p) => p[0] * n[0] + p[1] * n[1]);
  const lo = Math.min(...ds);
  const hi = Math.max(...ds);
  const big = 100;
  const out = [];
  for (let c = Math.ceil((lo + inset) / step) * step; c < hi - inset; c += step) {
    const a = [n[0] * c - dir[0] * big, n[1] * c - dir[1] * big];
    const b = [n[0] * c + dir[0] * big, n[1] * c + dir[1] * big];
    const seg = clipSeg(poly, a, b);
    if (seg) out.push(k.pathOf(seg.map(([x, y]) => B.at(w(x, y, z)))));
  }
  return out.join("");
}
// Arc length along a polyline to the point nearest `p`.
function alongOf(line, p) {
  let best = Infinity;
  let at = 0;
  let walked = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const ab = sub(b, a);
    const L = len(ab) || 1e-9;
    const t = clamp(dot(sub(p, a), ab) / (L * L), 0, 1);
    const d = len(sub(lerp(a, b, t), p));
    if (d < best) {
      best = d;
      at = walked + t * L;
    }
    walked += L;
  }
  return at;
}
// A pipe (metres) as depth-sortable tube pieces, gapped wherever a collar wraps it.
function pipe(B, id, route, r, { bend = 0.08, gaps = [], o = {} } = {}) {
  const pts = G.fillet(route.map(W), bend * S, 10, { P: B.P, tube: r * S });
  const total = G.pathLength(pts);
  const gw = gaps.map(([c, half]) => {
    const at = typeof c === "number" ? c * total : alongOf(pts, W(c));
    return [at - half * S, at + half * S];
  });
  const pieces = TB.tubePieces(pts, r * S, B.P, { maxLength: 0.45 * S, spacing: Math.max(0.6, r * S * 0.4), gaps: gw });
  pieces.forEach((piece, i) => {
    const e = unit(sub(piece.points[piece.points.length - 1], piece.points[0]));
    B.raw(`${id}~${i}`, TB.tubeSvg(piece, { tone: o.tone || "hi" }), shapeOf(piece.points, { r: r * S, edges: [e] }), { mat: "bronze", ...o });
  });
  return pts;
}
// A collar or flange: a short disc centred on `c` along `axis` (metres).
function collar(B, id, c, axis, r, thick, o = {}) {
  const a = unit(axis);
  return B.cyl(id, W(sub(c, mul(a, thick / 2))), W(add(c, mul(a, thick / 2))), r * S, { mat: "bronze", tone: "hi", ...o });
}

// The amphora that carries each mix (also the ammunition icon).
const AMPH = [[0, 0.016], [0.03, 0.045, 1], [0.1, 0.105, 1], [0.2, 0.152, 1], [0.3, 0.165, 1], [0.38, 0.157, 1], [0.45, 0.128, 1], [0.5, 0.082, 1], [0.53, 0.05], [0.6, 0.043], [0.6, 0.053], [0.63, 0.053], [0.63, 0.036]];
function amphora(B, id, base, axis, kk, o = {}) {
  const a = unit(axis);
  const F = G.frameAlong(base, a);
  const prof = AMPH.map(([s, r, sm]) => (sm ? [s * kk, r * kk, 1] : [s * kk, r * kk]));
  const vis = { lit: o.lit, sys: o.sys, layer: o.layer };
  B.turned(id, F, prof, { mat: o.mat || "clay", tone: "hi", ...vis, seams: [[0.3 * kk, 0.165 * kk], [0.53 * kk, 0.05 * kk]], smooth: false });
  for (const side of [-1, 1]) {
    const radial = G.radialOf(F, side > 0 ? 0 : Math.PI);
    const p0 = add(add(base, mul(a, 0.565 * kk)), mul(radial, 0.046 * kk));
    const p1 = add(add(base, mul(a, 0.6 * kk)), mul(radial, 0.12 * kk));
    const p2 = add(add(base, mul(a, 0.44 * kk)), mul(radial, 0.13 * kk));
    B.cyl(`${id}.h${side}a`, p0, p1, 0.014 * kk, { mat: o.mat || "clay", tone: "hi", ...vis });
    B.cyl(`${id}.h${side}b`, p1, p2, 0.014 * kk, { mat: o.mat || "clay", tone: "hi", ...vis });
  }
  B.cyl(`${id}.stop`, add(base, mul(a, 0.63 * kk)), add(base, mul(a, 0.655 * kk)), 0.04 * kk, { mat: "pitch", tone: "hi", ...vis });
}

// ---------------------------------------------------------------- the sea (WebGL on M.sea)
const SEA = { x0: -5.0, y0: -19.8, x1: 7.9, y1: 8.1, r: 0.7 };
const PLINTH = { x: -5.8, y: -20.6, w: 15.6, d: 31.4 };
const NF = 16;
const SEA_FRAG = `
uniform float uLight;
uniform vec4 uSea;
uniform float uSeaR;
uniform float uS;
uniform vec4 uF[${NF}];
uniform vec4 uG[${NF}];
uniform float uN;
uniform vec4 uOar[10];
float sdRR(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float ourD(vec2 p){
  float u=clamp((4.2-p.y)/4.55,0.,1.);
  float b=1.95*pow(max(1.-u*u,0.),.7);
  float d=abs(p.x)-b;
  if(p.y<-.35)d=length(vec2(p.x,p.y+.35));
  if(p.y>7.4)d=max(d,p.y-7.4);
  return d;
}
float enD(vec2 p){
  vec2 q=p-vec2(${EN.c[0].toFixed(3)},${EN.c[1].toFixed(3)});
  vec2 dd=vec2(${EN.d[0].toFixed(3)},${EN.d[1].toFixed(3)});
  float s=dot(q,dd);float t=dot(q,vec2(dd.y,-dd.x));
  float u=clamp(abs(s)/6.,0.,1.);
  float b=1.32*pow(max(1.-u*u,0.),.62);
  float d=abs(t)-b;
  if(abs(s)>6.)d=length(vec2(abs(s)-6.,t));
  return d;
}
float hullD(vec2 p){return min(ourD(p),enD(p));}
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  vec3 P=onFloor(vb,0.);
  float px=pixelOf()/uCam.z;
  vec2 c=(uSea.xy+uSea.zw)*.5;vec2 hb=(uSea.zw-uSea.xy)*.5;
  float sd=sdRR(P.xy-c,hb,uSeaR);
  float edge=.3/uK/uCam.z;
  float mask=1.-smoothstep(-edge-.9*px,-edge,sd);
  if(mask<=0.){gl_FragColor=vec4(0.);return;}
  vec2 p=P.xy/uS;
  float t=uTime;
  vec2 Vf=normalize(vec2(uCam.y,uCam.x));
  vec2 Lf=vec2(-Vf.y,Vf.x);
  float tanE=uCam.z/uCam.w;
  // swell and ripples
  vec2 d1=normalize(vec2(.35,.94));float k1=6.2832/3.4;
  vec2 d2=normalize(vec2(-.62,.78));float k2=6.2832/1.9;
  vec2 d3=normalize(vec2(.92,.4));float k3=6.2832/1.05;
  float n1=fbm2(p*.85+vec2(t*.05,-t*.08));
  float n2=noise2(p*3.4+vec2(-t*.42,t*.3));
  float ph1=dot(p,d1)*k1-t*1.15+n1*2.2;
  vec2 gr=d1*.06*cos(ph1)+d2*.045*cos(dot(p,d2)*k2-t*1.6+1.3)+d3*.025*cos(dot(p,d3)*k3-t*2.2+.4);
  vec2 Ld=normalize(vec2(-uCam.x,uCam.y));
  float shade=clamp(.52+2.1*dot(gr,Ld)+.32*(n1-.5)+.16*(n2-.5),0.,1.);
  float crest=smoothstep(.93,.995,sin(ph1))*(.55+.45*n2);
  // hulls: contact shade, a thin wash line, and their reflection toward the viewer
  float dh=hullD(p);
  float contact=exp(-max(dh,0.)/.4)*smoothstep(-.05,.02,dh);
  float wash=exp(-pow((dh-.09)/.045,2.))*(.55+.45*n2);
  float hr=0.;
  for(int j=1;j<=6;j++){
    float a=float(j)*.48;
    float inside=1.-smoothstep(-.06,.06,hullD(p-Vf*a));
    hr=max(hr,inside*smoothstep(1.3/tanE,.4/tanE,a));
  }
  // oars dipping
  float oar=0.;
  for(int j=0;j<10;j++){
    vec4 o=uOar[j];
    float r1=length(p-o.xy);float r2=length(p-o.zw);
    oar+=exp(-r1/.45)*(.5+.5*sin(r1*16.-t*3.))+exp(-r2/.45)*(.5+.5*sin(r2*16.-t*3.+1.7));
  }
  oar=clamp(oar,0.,1.);
  // fire: oily slicks, light thrown on the water, flames mirrored toward the viewer
  float glow=0.,refl=0.,slick=0.,burn=0.;
  for(int i=0;i<${NF};i++){
    if(float(i)>=uN)break;
    vec4 F=uF[i];vec4 Gi=uG[i];
    vec2 fp=F.xy/uS;float r=F.z/uS;float heat=F.w;
    float zb=Gi.x/uS;float H=Gi.y/uS;
    vec2 d=p-fp;float dist=length(d);
    float wob=(fbm2(p*1.7+vec2(float(i)*3.7,t*.15))-.5)*.9*r;
    float sl=(1.-smoothstep(r*.72,r*1.08,dist+wob))*Gi.z;
    slick=max(slick,sl);
    burn=max(burn,sl*heat*(.55+.45*noise2(p*2.6+vec2(float(i),-t*2.3))));
    float R=r+.8*H+.6;
    glow+=heat*(.75*exp(-dist*dist/(R*R))+.22*exp(-dist/(2.4*R)));
    float a=dot(d,Vf);float l=dot(d,Lf);
    float z=a*tanE;
    float wb=(noise2(vec2(a*2.6,t*1.4+float(i)*5.))-.5)*(.25+.18*max(a,0.));
    float k=clamp((z-zb)/max(H,.1),0.,1.);
    float wid=max(r,.3)*(1.-.6*k)+.08;
    float col=window(z,zb,zb+H,.22*H+.12)*exp(-pow((l+wb)/wid,2.));
    float streak=.6+.4*sin(a*7.5+noise2(vec2(l*1.8,a*3.-t*1.1))*5.);
    refl+=heat*col*streak;
  }
  glow=1.-exp(-glow*.9);
  refl=1.-exp(-refl*1.3);
  // paper inks (light) and lamp light (dark)
  vec3 lo=vec3(.705,.78,.805);vec3 hi=vec3(.885,.925,.935);
  vec3 seen=mix(lo,hi,shade);
  seen=mix(seen,vec3(.95,.97,.975),crest*.55);
  seen=mix(seen,seen*vec3(.84,.82,.78),hr*.42);
  seen=mix(seen,seen*vec3(.86,.9,.92),contact*.55);
  seen=mix(seen,vec3(.96,.975,.98),wash*.7);
  seen=mix(seen,seen*vec3(.88,.92,.94),oar*.45);
  seen=mix(seen,vec3(.36,.32,.28),slick*.62);
  seen=mix(seen,seen*vec3(1.,.7,.42),glow*.6);
  seen=mix(seen,vec3(.93,.43,.1),clamp(burn,0.,1.)*.6);
  vec3 rc=mix(vec3(.95,.46,.1),vec3(1.,.82,.5),smoothstep(.55,.95,refl));
  seen=mix(seen,rc,refl*.82);
  vec3 dlo=vec3(.085,.12,.145);vec3 dhi=vec3(.16,.21,.245);
  vec3 dk=mix(dlo,dhi,shade);
  dk+=vec3(.05,.06,.065)*crest;
  dk*=1.-hr*.3-contact*.3;
  dk+=vec3(.06,.07,.075)*wash;
  dk=mix(dk,vec3(.025,.022,.02),slick*.7);
  vec3 add=vec3(.85,.3,.06)*glow*.42+vec3(1.,.5,.14)*refl*.95+vec3(1.,.42,.08)*clamp(burn,0.,1.)*.7;
  dk=dk+(1.-dk)*(1.-exp(-add*1.4));
  vec3 outc=mix(dk,seen,uLight);
  float n=(hash12(gl_FragCoord.xy+fract(uTime*.61)*91.)+hash12(gl_FragCoord.yx*1.37+fract(uTime*.37)*57.)-1.)/255.;
  outc=clamp(outc+n,0.,1.);
  gl_FragColor=vec4(outc*mask,mask);
}`;
let SEAL = null;
function seaLayer(M) {
  if (!M.sea || typeof window === "undefined") return null;
  if (SEAL && SEAL.canvas === M.sea) return SEAL;
  const cam = { ...M.glCamera() };
  const oars = new Float32Array(40);
  let n = 0;
  const tip = (p) => {
    if (n < 40) {
      oars[n++] = p[0];
      oars[n++] = p[1];
    }
  };
  for (const side of [1, -1]) for (const s of EN_OARS) tip(enOar(s, side).tip);
  for (const side of [1, -1]) for (const y of OUR_OARS.slice(0, 3)) tip(ourOar(y, side).tip);
  const layer = GL.glLayer({
    canvas: M.sea,
    fragment: SEA_FRAG,
    view: [M.W, M.H],
    camera: cam,
    uniforms: ["uLight", "uF", "uG", "uN"],
    fixed: { uSea: [SEA.x0 * S, SEA.y0 * S, SEA.x1 * S, SEA.y1 * S], uSeaR: SEA.r * S, uS: S, uOar: oars },
  });
  if (!layer) {
    SEAL = { canvas: M.sea, failed: true };
    return SEAL;
  }
  SEAL = { canvas: M.sea, layer, cam, prog: layer.gl.getParameter(layer.gl.CURRENT_PROGRAM), F: new Float32Array(NF * 4), G: new Float32Array(NF * 4), watching: false };
  return SEAL;
}
function watchSea() {
  if (!SEAL || !SEAL.layer || SEAL.watching) return;
  SEAL.watching = true;
  const tick = () => {
    const cur = typeof window !== "undefined" && window.__siege ? window.__siege.M : null;
    if (cur && cur.def && cur.def.id !== ID) {
      SEAL.layer.clear();
      SEAL.watching = false;
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Oar geometry, shared by the drawing and the sea's ripples.
function enOar(s, side) {
  const z = enSheer(s);
  const b = enB(s, z);
  const thole = enP(s, side * (b + 0.03), z + 0.04);
  const dir = unit(add(add(mul(EN.n, side * Math.cos(rad(21)) * Math.cos(rad(9))), mul(EN.d, -Math.cos(rad(21)) * Math.sin(rad(9)))), mul(Z, -Math.sin(rad(21)))));
  const L = thole[2] / Math.sin(rad(21));
  return { thole, dir, L, tip: add(thole, mul(dir, L)) };
}
function ourOar(y, side) {
  const z = 0.67 * sheer(y);
  const port = [side * (ourB(y, z) + 0.01), y, z];
  const dir = unit([side * Math.cos(rad(24)) * Math.cos(rad(11)), Math.cos(rad(24)) * Math.sin(rad(11)), -Math.sin(rad(24))]);
  const L = z / Math.sin(rad(24));
  return { port, dir, L, tip: add(port, mul(dir, L)) };
}

// ---------------------------------------------------------------- particles
// Spawn with an exact lifetime (the engine scatters lifetimes ±25 %; a jet drop must die where it lands).
function spawnExact(M, kind, p, o) {
  const R = Math.random;
  let i = 0;
  const seq = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
  Math.random = () => (i < seq.length ? seq[i++] : R());
  try {
    M.fx.spawn(kind, p, o);
  } finally {
    Math.random = R;
  }
}
const rnd = (a = 1) => (Math.random() * 2 - 1) * a;
const sfx = (M, name, o) => {
  if (M.sfx && !M.calm) M.sfx(name, o);
};
function budget(M) {
  return clamp((6000 - (M.fx.count || 0)) / 2600, 0.12, 1);
}

// ---------------------------------------------------------------- the definition
export default {
  id: ID,
  name: "Greek Fire Siphon",
  short: "Greek fire",
  unit: U,
  ground: 0,
  view: {
    W: 1000,
    H: 640,
    azimuth: AZ,
    elevation: EL,
    pad: 22,
    fit: [w(PLINTH.x, PLINTH.y, -1.6), w(PLINTH.x + PLINTH.w, PLINTH.y, -1.6), w(PLINTH.x, PLINTH.y + PLINTH.d, -1.6), w(PLINTH.x + PLINTH.w, PLINTH.y + PLINTH.d, -1.6), W(enP(-4.0, 0.17, 8.4)), W(enP(0.8, 0, 6.2))],
  },
  target: null,
  ammo: [
    { id: "naphtha", name: "Naphtha", look: "pot", mass: Math.round((CHARGE * FUELS.naphtha.rho) / 1000), radius: 0.2, cd: 0.5 },
    { id: "pitch", name: "Pitch-resin", look: "pot", mass: Math.round((CHARGE * FUELS.pitch.rho) / 1000), radius: 0.2, cd: 0.5 },
    { id: "lime", name: "Lime-sulphur", look: "pot", mass: Math.round((CHARGE * FUELS.lime.rho) / 1000), radius: 0.2, cd: 0.5 },
  ],
  controls: [
    { id: "heat", name: "Brazier heat", min: 0, max: 100, step: 5, value: 75, unit: "%" },
    { id: "rate", name: "Pump rate", min: 20, max: 60, step: 2, value: 44, unit: "/min" },
    { id: "elev", name: "Nozzle elevation", min: -12, max: 24, step: 1, value: -3, unit: "°" },
    { id: "trav", name: "Nozzle traverse", min: -30, max: 30, step: 1, value: 0, unit: "°" },
    { id: "valve", name: "Valve opening", min: 10, max: 100, step: 5, value: 100, unit: "%" },
  ],
  actions: [
    { id: "pump", name: "Pump", key: "w", hold: true },
    { id: "heat", name: "Heat", key: "h", hold: true },
    { id: "spray", name: "Spray", key: "v", hold: true },
    { id: "loose", name: "Loose", key: " ", primary: true },
  ],
  toggles: [
    { id: "cut", name: "Cutaway" },
    { id: "strobe", name: "Trace" },
  ],
  focus: [
    { id: "tank", name: "Tank" },
    { id: "brazier", name: "Brazier" },
    { id: "pump", name: "Pump" },
    { id: "valve", name: "Valve & pipes" },
    { id: "nozzle", name: "Nozzle" },
    { id: "target", name: "Target ship" },
  ],
  phases: ["rest", "filling", "pumping", "ready", "spraying", "burning"],
  hint: "Space · burst   W · pump   H · heat   V · spray",
  tourGap: 12,

  ammoIcon(a) {
    const ic = looks.icon(() => {}, [0.9, 0.9, 1.25], { width: 64, height: 46 });
    const B = createBuilder(ic.collector, { unit: 1 });
    amphora(B, "ic", [0, 0, -1.22], Z, 3.9, { mat: FUELS[a.id].jar });
    return ic.finish();
  },

  // ============================================================ static parts
  build(B, M) {
    if (B.mini) return;
    buildBase(B);
    buildOurHull(B);
    buildOurFittings(B);
    buildBrazier(B);
    buildTank(B);
    buildPumpStatic(B);
    buildLines(B);
    buildSwivel(B);
    buildBellowsStatic(B);
    buildRack(B);
    buildEnemy(B);
  },

  init(M) {
    restoreEnemy(M);
    return {
      tk: newTank(M.ammo.id),
      mode: "idle",
      auto: false,
      autoPump: false,
      autoSince: 0,
      pumpHeld: false,
      pumpLatch: false,
      pumpSkip: false,
      pumpAt: 0,
      heatHeld: false,
      heatLatch: false,
      heatSkip: false,
      heatAt: 0,
      sprayHeld: false,
      valve: 0,
      fill: null,
      fires: [],
      char: new Float32Array(EN_PLANKS.length),
      deckChar: new Float32Array(EN_DECKS.length),
      sailChar: new Float32Array(SAIL_PANELS.length),
      mats: new Map(),
      sim: null,
      emitted: 0,
      acc: { drop: 0, flame: 0, soot: 0, lamp: 0, ember: 0, glow: 0, pour: 0, smoke: 0 },
      now: { v: 0, q: 0, u: 0 },
      jetKey: "",
      jet: null,
      fuelSeq: 0,
    };
  },

  act(M, id, down) {
    const st = M.state;
    if (id === "pump" || id === "heat") return holdToggle(st, id, down);
    if (id === "spray") {
      st.sprayHeld = !!down && st.mode !== "shot";
      return;
    }
    if (id === "loose" && down) {
      if (st.mode === "shot" || st.fill) {
        st.auto = st.auto || !!st.fill;
        return;
      }
      st.auto = true;
      if (st.tk.vol < 3) return startFill(M, st.tk.fuel);
      if (tankP(st.tk).dp < LOOSE_MIN) {
        st.autoPump = true;
        st.autoSince = M.time;
        return;
      }
      this.fire(M);
    }
  },

  onAmmo(M) {
    const st = M.state;
    if (st.tk.fuel === M.ammo.id) return;
    if (st.mode === "shot") {
      st.pendingFuel = M.ammo.id;
      return;
    }
    startFill(M, M.ammo.id);
  },

  onToggle(M) {
    M.dirty = true;
  },

  // The camera turned: the parts are new elements, so charring is painted on them again.
  onCamera(M) {
    if (M.state && M.state.mats) M.state.mats.clear();
  },

  // A Loose: a recorded three-second burst (pumping on if it was on).
  fire(M) {
    const st = M.state;
    const tk = cloneTank(st.tk);
    const rec = PH.timeline();
    const target = M.ctrl.valve / 100;
    const inp = { pump: pumping(st), rate: M.ctrl.rate, heat: M.ctrl.heat / 100, bellows: heating(st), u: 0 };
    const dt = 1 / 240;
    let t = 0;
    let i = 0;
    let first = null;
    const end = BURST + OPEN_T;
    while (t <= end + 1e-9) {
      inp.u = t < OPEN_T ? ease(t / OPEN_T) * target : t < BURST ? target : (1 - ease((t - BURST) / OPEN_T)) * target;
      const out = stepTank(tk, inp, dt);
      if (out.q > 0 && first === null) first = t;
      if (i++ % 4 === 0) rec.push(t, { u: inp.u, v: out.v, q: out.q, dp: out.dp, pa: out.pa, pv: out.pv, T: tk.T, vol: tk.vol, phase: tk.phase, amp: tk.amp, air: tk.air, f0: tk.flap[0], f1: tk.flap[1], strokes: tk.strokes });
      t += dt;
    }
    st.sim = { rec, final: tk, start: first ?? 0.05 };
    st.mode = "shot";
    st.auto = false;
    st.autoPump = false;
    st.sprayHeld = false;
    st.emitted = 0;
    const f0 = rec.at(OPEN_T + 0.05);
    const NFm = nozzleFrame(M.ctrl.elev, M.ctrl.trav);
    const jet = traceJet(NFm.at(MOUTH_S), mul(NFm.f, f0.v || 1), FUELS[tk.fuel].D);
    const hitT = (first ?? 0.05) + (jet.hit ? jet.hit.t : jet.tWater);
    M.startShot(end + 2.2, [[0, "open"], [first ?? 0.05, "jet"], [Math.min(hitT, end + 2), "strike"], [BURST, "close"]]);
    M.setPhase("spraying");
  },

  endShot(M) {
    const st = M.state;
    if (st.sim) {
      const fin = st.sim.final;
      fin.run = pumping(st) ? true : fin.run;
      st.tk = fin;
    }
    st.sim = null;
    st.mode = "idle";
    if (st.pendingFuel) {
      const f = st.pendingFuel;
      st.pendingFuel = null;
      startFill(M, f);
    }
  },

  tour(M) {
    const st = M.state;
    if (st.mode !== "idle" || st.fill || st.autoPump) return;
    const charred = st.char.reduce((a, c) => a + (c > 1.3 ? 1 : 0), 0) / st.char.length;
    if (charred > 0.55 && !st.fires.some((f) => f.heat > 0.05)) {
      restoreEnemy(M);
      st.char.fill(0);
      st.deckChar.fill(0);
      st.sailChar.fill(0);
    }
    this.act(M, "loose", true);
  },

  // ============================================================ live model
  update(M, dt) {
    const st = M.state;
    const tk = st.tk;
    let moving = false;
    const shot = st.mode === "shot" && M.shot && st.sim;
    let now;
    if (shot) {
      const t = M.shot.t;
      const fr = st.sim.rec.at(t);
      now = { v: fr.v, q: fr.q, u: fr.u, dp: fr.dp, pa: fr.pa, pv: fr.pv, T: fr.T, vol: fr.vol, phase: fr.phase, amp: fr.amp, flap: [fr.f0, fr.f1], strokes: fr.strokes, fuel: st.sim.final.fuel };
      st.valve = fr.u;
      moving = true;
      if (M.shot.playing && t > st.emitted && dt > 0) {
        this.flow(M, now, Math.min(dt, t - st.emitted));
        st.emitted = t;
      }
    } else {
      // Valve follows the Spray button, the beam the Pump button, the bellows the Heat button.
      const target = st.sprayHeld && !st.fill ? M.ctrl.valve / 100 : 0;
      const prev = st.valve;
      st.valve += clamp(target - st.valve, -dt / OPEN_T, dt / OPEN_T);
      if (Math.abs(st.valve - prev) > 1e-6) moving = true;
      const inp = { pump: pumping(st) && !st.fill, rate: M.ctrl.rate, heat: M.ctrl.heat / 100, bellows: heating(st), u: st.valve };
      const n = Math.max(1, Math.ceil(dt / (1 / 150)));
      let out = null;
      const before = tk.phase;
      for (let i = 0; i < n; i++) out = stepTank(tk, inp, dt / n);
      if (tk.phase !== before || tk.run) moving = true;

      if (st.fill) {
        moving = true;
        stepFill(M, st, dt);
      }
      now = { v: out.v, q: out.q, u: st.valve, dp: out.dp, pa: out.pa, pv: out.pv, T: tk.T, vol: tk.vol, phase: tk.phase, amp: tk.amp, flap: tk.flap, strokes: tk.strokes, fuel: tk.fuel };
      if (out.q > 0 && dt > 0) this.flow(M, now, dt);
      if (st.autoPump) {
        if (out.dp >= LOOSE_TARGET || M.time - st.autoSince > 30 || (tk.amp < 0.3 && out.dp > LOOSE_MIN)) {
          st.autoPump = false;
          if (st.auto) this.fire(M);
        }
      }
    }
    // Bellows.
    const bel = heating(st);
    if (bel || tk.belRun) {
      const b0 = tk.bel;
      if (Math.floor((tk.bel + TAU * 1.1 * dt) / TAU) !== Math.floor(tk.bel / TAU)) sfx(M, "whoosh", { size: 0.6, gain: 0.35, gap: 0.3 });
      tk.bel += TAU * 1.1 * dt;
      if (!bel && Math.floor(tk.bel / TAU) !== Math.floor(b0 / TAU)) {
        tk.bel = Math.floor(tk.bel / TAU) * TAU;
        tk.belRun = false;
      } else tk.belRun = true;
      moving = true;
    }
    st.now = now;
    if (now.strokes !== st.lastStrokes) {
      if (st.lastStrokes !== undefined && dt > 0) sfx(M, "pump", { gap: 0.15, pitch: 0.8 + 0.1 * (now.amp ?? 1) });
      st.lastStrokes = now.strokes;
    }
    const open = st.valve > 0.04;
    if (open !== !!st.valveOpen) {
      if (dt > 0) sfx(M, "clank", { pitch: open ? 1 : 0.8 });
      st.valveOpen = open;
    }
    if (st.mode === "shot" || now.q > 0) M.setPhase("spraying");
    else if (st.fill) M.setPhase("filling");
    else if (pumping(st) || tk.run) M.setPhase("pumping");
    else if (st.fires.some((f) => f.heat > 0.05)) M.setPhase("burning");
    else if (now.dp >= LOOSE_MIN) M.setPhase("ready");
    else M.setPhase("rest");
    if (st.flowing) st.flowing--;
    if (dt > 0 && st.fires.some((f) => f.heat > 0.3)) sfx(M, "crackle", { gap: 0.4 });
    updateFires(M, st, dt);
    ambient(M, st, now, dt);
    if (M.toggles.cut && (now.q > 0 || st.fill || pumping(st) || tk.run)) moving = true;
    return moving;
  },

  // Fuel leaving the mouth this step: drops, flame, soot, and what lands where.
  flow(M, now, dt) {
    const st = M.state;
    const fuel = now.fuel;
    const f = FUELS[fuel];
    const NFm = nozzleFrame(M.ctrl.elev, M.ctrl.trav);
    const mouth = NFm.at(MOUTH_S + 0.01);
    const v0 = mul(NFm.f, now.v);
    if (now.v < 0.5) return;
    const jet = traceJet(mouth, v0, f.D);
    st.jet = jet;
    const tEnd = jet.hit ? jet.hit.t : jet.tWater;
    if (!M.calm) {
      const bud = budget(M);
      // Drops: spaced along the first stretch of the path so the stream reads continuous.
      const n = Math.min(14, Math.max(1, Math.round(((now.v * dt) / f.drop) * 1.6 * bud)));
      for (let i = 0; i < n; i++) {
        const a = ((i + Math.random()) / n) * dt;
        const jit = [rnd(0.035), rnd(0.035), rnd(0.035)].map((x) => x * now.v);
        const st0 = jet.f(a);
        const life = Math.max(0.03, tEnd - a);
        spawnExact(M, "liquid", W(st0.p), { v: W(add(st0.v, jit)), size: f.drop * S * 0.62, grow: f.drop * S * 1.5, life, heat: fuel === "pitch" ? 0.34 : 0.55, grav: 1, drag: f.D, alpha: 1.35 });
      }
      // Flame along the burning arc (lit by the lamp at the mouth).
      st.acc.flame += dt * 200 * f.flame * bud * clamp(now.q / 2, 0.35, 1.2);
      while (st.acc.flame >= 1) {
        st.acc.flame -= 1;
        const a = 0.025 + Math.random() * Math.max(0.01, tEnd - 0.025);
        const s0 = jet.f(a);
        const grow = clamp(a / 0.6, 0, 1);
        M.fx.emit("fire", W(s0.p), { v: W(add(mul(s0.v, 0.3), [rnd(0.3), rnd(0.3), 0.7])), spread: 0.12 * S, size: (0.07 + 0.22 * grow) * S, grow: (0.2 + 0.5 * grow) * S, life: 0.22 + 0.22 * grow, heat: 0.95 * f.flame + 0.05, buoy: 2.0 * S, drag: 1.8 });
      }
      st.acc.soot += dt * 22 * f.soot * bud;
      while (st.acc.soot >= 1) {
        st.acc.soot -= 1;
        const a = 0.15 + Math.random() * Math.max(0.01, tEnd - 0.15);
        const s0 = jet.f(a);
        M.fx.emit(f.soot > 0.5 ? "soot" : "smoke", W(add(s0.p, [0, 0, 0.3])), { v: W(add(mul(WIND, 0.6), [0, 0, 1.0])), size: 0.4 * S, grow: 1.8 * S, life: 3.2, alpha: 0.45, buoy: 0.35 * S, drag: 0.35 });
      }
      // Glow at the mouth where the lamp lights the jet.
      if (Math.random() < 0.5) M.fx.emit("glow", W(add(mouth, mul(NFm.f, 0.05))), { size: 0.3 * S, life: 0.18, heat: 0.8, alpha: 0.9 });
    }
    // What lands, lands now (the first drops reach it tEnd later; close enough at 60 Hz).
    deposit(M, st, jet, fuel, now.q * dt);
    if (!st.flowing) sfx(M, "whump", { gain: 0.5 });
    st.flowing = 2;
    sfx(M, "hiss", { size: 0.5, gain: clamp(now.q / 3, 0.2, 1) * 0.7, gap: 0.22 });
    if (jet.hit && jet.hit.kind === "water") sfx(M, "splash", { size: 0.5, gain: 0.25, gap: 0.7 });
    else if (jet.hit) sfx(M, "thud", { gain: 0.15, gap: 0.5 });
  },

  // ============================================================ the pose of the moving parts
  pose(M) {
    const st = M.state;
    const n = st.now || { phase: st.tk.phase, amp: st.tk.amp, flap: st.tk.flap, vol: st.tk.vol, u: 0 };
    return {
      phi: PHI_MAX * (n.amp ?? 1) * Math.sin(n.phase ?? 0),
      flap: n.flap || [0, 0],
      valve: clamp(n.u ?? 0, 0, 1),
      elev: M.ctrl.elev,
      trav: M.ctrl.trav,
      bel: 0.07 + 0.24 * (0.5 - 0.5 * Math.cos(st.tk.bel)),
      vol: n.vol ?? st.tk.vol,
      fill: st.fill,
      fuel: n.fuel || st.tk.fuel,
    };
  },

  draw(B, M) {
    if (B.mini) return;
    const st = M.state;
    const pz = this.pose(M);
    B.keep("pump", [pz.phi.toFixed(4)], () => drawPump(B, pz.phi));
    B.keep("flaps", [pz.flap[0] > 0.5, pz.flap[1] > 0.5], () => drawFlaps(B, pz.flap));
    B.keep("cock", [pz.valve.toFixed(3)], () => drawCock(B, pz.valve));
    B.keep("nozzle", [pz.elev, pz.trav], () => drawNozzle(B, pz.elev, pz.trav));
    B.keep("bellows", [pz.bel.toFixed(3)], () => drawBellows(B, pz.bel));
    const fu = st.fill ? st.fill.u : -1;
    B.keep("jars", [M.ammo.id, fu.toFixed(3), st.fill ? st.fill.fuel : ""], () => drawJars(B, M, st));
    B.keep("filler", [fillerOpen(st).toFixed(2)], () => drawFiller(B, fillerOpen(st)));
    if (M.toggles.cut) B.keep("cutaway", [pz.vol.toFixed(2), pz.fuel, Math.round(airDots(st)), M.toggles.cut], () => drawCutaway(B, M, st, pz));
    if (M.toggles.strobe) drawTrace(B, M, st);
  },

  occluders(M) {
    const out = [
      { min: w(-1.8, 4.2, 0), max: w(1.8, 7.4, 1.22) },
      { min: w(-1.45, 2.0, 0), max: w(1.45, 4.2, 1.22) },
      { min: w(-1.2, 1.0, 0), max: w(1.2, 2.7, 1.95) },
      { min: w(-0.6, 0.0, 0), max: w(0.6, 1.0, 1.95) },
      { min: w(-BRZ.half, BRZ.y - BRZ.half, BRZ.z0), max: w(BRZ.half, BRZ.y + BRZ.half, BRZ.z1) },
    ];
    for (let s = -4.6; s <= 4.7; s += 1.84) {
      const c = enP(s, 0, 0);
      out.push({ min: w(c[0] - 1.05, c[1] - 0.95, 0), max: w(c[0] + 1.05, c[1] + 0.95, 0.7) });
    }
    return out;
  },

  renderGl(M, light) {
    const L = seaLayer(M);
    if (!L || L.failed) return;
    L.layer.gl.useProgram(L.prog);
    Object.assign(L.cam, M.glCamera());
    const st = M.state;
    const list = [];
    for (const f of st.fires) if (f.heat > 0.01 || f.kind === "water") list.push({ p: f.p, r: f.r, heat: f.heat, H: f.H || 0.5, slick: f.kind === "water" ? clamp(f.vol / 0.6, 0, 1) * (0.45 + 0.55 * clamp(f.heat * 2, 0, 1)) : 0 });
    for (let i = 0; i < EN_PLANKS.length; i++) {
      const c = st.char[i];
      if (c > 1.2 && c < 3.4) {
        const pl = EN_PLANKS[i];
        list.push({ p: pl.mid, r: 0.45, heat: 0.75 * smoothstep(1.2, 1.5, c) * (1 - smoothstep(3.0, 3.4, c)), H: 1.3, slick: 0 });
      }
    }
    list.sort((a, b) => b.heat * (b.r + b.H) - a.heat * (a.r + a.H));
    const n = Math.min(NF, list.length);
    for (let i = 0; i < n; i++) {
      const e = list[i];
      L.F.set([e.p[0] * S, e.p[1] * S, e.r * S, e.heat], i * 4);
      L.G.set([e.p[2] * S, e.H * S, e.slick, 0], i * 4);
    }
    L.layer.draw({ uLight: light, uF: L.F, uG: L.G, uN: n }, M.calm ? 3.0 : M.time);
    watchSea();
  },

  readouts(M) {
    const r = measure(M);
    return [
      ["Tank pressure", fmt(r.dp, 2), "bar"],
      ["Air · vapour", `${fmt(r.pa, 2)} · ${fmt(r.pv, 2)}`, "bar abs"],
      ["Temperature", fmt(r.T, 1), "°C"],
      ["Brazier", fmt(r.qin, 1), "kW"],
      ["Fuel left", fmt(r.vol, 1), "L"],
      ["Exit velocity", fmt(r.v, 1), "m/s"],
      ["Flow", fmt(r.q, 2), "L/s"],
      ["Jet reach", fmt(r.reach, 1), "m"],
      ["Strikes", r.strike, ""],
      ["Pump strokes", fmtInt(r.strokes), ""],
      ["Fires", fmtInt(r.fires), ""],
      ["Hull charred", fmtInt(r.charred * 100), "%"],
    ];
  },

  corner(M) {
    const r = measure(M);
    return `${M.phase} · ${fmt(r.dp, 1)} bar · ${fmt(r.v, 1)} m/s · ${fmt(r.reach, 0)} m`;
  },
};

// ---------------------------------------------------------------- state helpers
function holdToggle(st, key, down) {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (down) {
    if (st[`${key}Latch`]) {
      st[`${key}Latch`] = false;
      st[`${key}Skip`] = true;
    } else {
      st[`${key}Held`] = true;
      st[`${key}At`] = now;
    }
  } else {
    if (st[`${key}Skip`]) {
      st[`${key}Skip`] = false;
      return;
    }
    if (st[`${key}Held`] && now - st[`${key}At`] < 380) st[`${key}Latch`] = true;
    st[`${key}Held`] = false;
  }
}
const pumping = (st) => !!(st.pumpHeld || st.pumpLatch || st.autoPump);
const heating = (st) => !!(st.heatHeld || st.heatLatch);

function startFill(M, fuel) {
  const st = M.state;
  st.sprayHeld = false;
  st.fill = { u: 0, fuel, vol0: fuel === st.tk.fuel ? st.tk.vol : 0, T0: st.tk.T };
  if (fuel !== st.tk.fuel) {
    st.tk.fuel = fuel;
    st.tk.vol = 0;
  }
}
const FILL_T = 3.6;
function stepFill(M, st, dt) {
  const fl = st.fill;
  const tk = st.tk;
  fl.u = Math.min(1, fl.u + dt / FILL_T);
  // Opened, the tank vents to the air; the new charge mixes at 30 °C.
  if (fl.u > 0.25 && fl.u < 0.92) tk.air = airFor(tk, 0);
  const share = smoothstep(0.5, 0.8, fl.u);
  const vol = fl.vol0 + (CHARGE - fl.vol0) * share;
  if (vol > tk.vol) {
    const add_ = vol - tk.vol;
    tk.T = (tk.T * tk.vol + FUELS[tk.fuel].fillT * add_) / Math.max(1e-6, vol);
    tk.vol = vol;
  }
  if (fl.u >= 1) {
    st.fill = null;
    tk.air = airFor(tk, 0);
    if (st.auto) {
      st.autoPump = true;
      st.autoSince = M.time;
    }
  }
}
const fillerOpen = (st) => (st.fill ? smoothstep(0.16, 0.3, st.fill.u) * (1 - smoothstep(0.86, 0.96, st.fill.u)) : 0);
function airDots(st) {
  const n = st.now && st.now.pa ? st.now.pa : tankP(st.tk).pa;
  return clamp(n * 9, 0, 70);
}

function measure(M) {
  const st = M.state;
  const n = st.now || {};
  const tk = st.tk;
  const pr = tankP(tk);
  const dp = n.dp ?? pr.dp;
  const T = n.T ?? tk.T;
  const fuel = n.fuel || tk.fuel;
  const vPred = n.v > 0 ? n.v : exitV(fuel, dp, T, M.ctrl.valve / 100);
  const NFm = nozzleFrame(M.ctrl.elev, M.ctrl.trav);
  const key = `${fuel}|${vPred.toFixed(2)}|${M.ctrl.elev}|${M.ctrl.trav}`;
  if (st.jetKey !== key) {
    st.jetKey = key;
    st.predict = vPred > 0.5 ? traceJet(NFm.at(MOUTH_S), mul(NFm.f, vPred), FUELS[fuel].D) : null;
  }
  const J = st.predict;
  const strike = J && J.hit ? J.hit.kind : "—";
  const charred = st.char.reduce((a, c) => a + (c > 1.3 ? 1 : 0), 0) / st.char.length;
  return { dp, pa: n.pa ?? pr.pa, pv: n.pv ?? pr.pv, T, vol: n.vol ?? tk.vol, v: vPred, q: n.q ?? 0, reach: J ? J.reach : 0, strike, strokes: n.strokes ?? tk.strokes, fires: st.fires.filter((f) => f.heat > 0.05).length + st.char.reduce((a, c) => a + (c > 1.2 && c < 3.4 ? 1 : 0), 0), charred, qin: tk.qin };
}

// ---------------------------------------------------------------- fire on the water and on the galley
function addPatch(st, patch) {
  const MAXP = 22;
  if (st.fires.length >= MAXP) {
    let worst = 0;
    st.fires.forEach((f, i) => {
      if (f.heat * f.vol < st.fires[worst].heat * st.fires[worst].vol) worst = i;
    });
    st.fires.splice(worst, 1);
  }
  st.fires.push({ heat: 0, H: 0.3, age: 0, acc: 0, sacc: 0, ...patch });
}
function deposit(M, st, jet, fuel, vol) {
  if (!jet.hit || vol <= 0) return;
  const f = FUELS[fuel];
  const h = jet.hit;
  if (h.kind === "water") return water(st, h.p, vol, fuel);
  if (h.kind === "hull") {
    const keep = vol * f.stick;
    const near = st.fires.find((p) => p.kind === "hull" && p.fuel === fuel && p.side === h.side && Math.hypot(p.s - h.s, p.z - h.z) < 0.5);
    if (near) near.vol += keep;
    else addPatch(st, { kind: "hull", fuel, side: h.side, s: h.s, z: h.z, p: add(enP(h.s, h.side * (enB(h.s, h.z) + 0.06), h.z), [0, 0, 0]), r: 0.28, vol: keep });
    water(st, enP(h.s, h.side * (enB(h.s, 0) + 0.35), 0), vol - keep, fuel);
    return;
  }
  if (h.kind === "deck") {
    const near = st.fires.find((p) => p.kind === "deck" && p.fuel === fuel && len(sub(p.p, h.p)) < 0.6);
    if (near) {
      near.vol += vol;
      near.fed = near.age;
    } else addPatch(st, { kind: "deck", fuel, s: h.s, p: enP(h.s, enLocal(h.p).t, EN.deck + 0.02), r: 0.3, vol, fed: 0 });
    return;
  }
  if (h.kind === "sail") {
    if (st.sailChar[h.panel] >= 3) return;
    const near = st.fires.find((p) => p.kind === "sail" && p.panel === h.panel);
    if (near) near.vol += vol * 0.5;
    else addPatch(st, { kind: "sail", fuel, panel: h.panel, p: enP(h.s, SAIL.t + 0.05, h.z), r: 0.35, vol: vol * 0.5 });
  }
}
function water(st, p, vol, fuel) {
  if (vol <= 0) return;
  const q = [p[0], p[1], 0];
  const near = st.fires.find((f) => f.kind === "water" && f.fuel === fuel && Math.hypot(f.p[0] - q[0], f.p[1] - q[1]) < Math.max(0.6, f.r * 0.9));
  if (near) {
    near.vol += vol;
    near.fed = near.age;
  } else addPatch(st, { kind: "water", fuel, p: q, r: 0.25, vol, fed: 0 });
}
function heatRelease(f, area) {
  const F = FUELS[f.fuel];
  return ((F.reg / 1000) * area * F.rho * F.dH * 1000) / 1; // kW
}
function updateFires(M, st, dt) {
  if (dt <= 0) return;
  const bud = budget(M);
  for (let i = st.fires.length - 1; i >= 0; i--) {
    const f = st.fires[i];
    const F = FUELS[f.fuel];
    f.age += dt;
    let area;
    let burning;
    if (f.kind === "water" || f.kind === "deck") {
      area = Math.PI * f.r * f.r;
      const h = f.vol / area; // mm
      // A pool being fed by the burning jet is alight while it gathers; then it needs its film.
      burning = f.vol > 0.02 && (h > F.hMin || f.age - (f.fed || 0) < 0.6);
      const rMax = f.kind === "deck" ? 1.1 : F.rMax;
      if (f.r < rMax) f.r = Math.min(rMax, f.r + F.spread * Math.sqrt(Math.max(0, h - 0.5 * F.hMin)) * 0.22 * dt);
      if (f.kind === "water") {
        f.p[0] += WIND[0] * 0.06 * dt;
        f.p[1] += WIND[1] * 0.06 * dt;
        if (F.split && f.r > 1.0 && f.vol > 1.2 && Math.random() < dt * 0.25 && st.fires.length < 20) {
          const a = Math.random() * TAU;
          const share = f.vol * 0.3;
          f.vol -= share;
          addPatch(st, { kind: "water", fuel: f.fuel, p: [f.p[0] + Math.cos(a) * f.r * 1.4, f.p[1] + Math.sin(a) * f.r * 1.4, 0], r: 0.35, vol: share });
        }
      }
    } else {
      // On the side or the sail: runs down into the sea, the rest burns where it stuck.
      f.r = clamp(0.24 + 0.16 * Math.sqrt(f.vol), 0.22, f.kind === "sail" ? 0.6 : 0.55);
      area = Math.PI * f.r * f.r;
      burning = f.vol > 0.02 && !(f.kind === "sail" && st.sailChar[f.panel] >= 3);
      if (f.kind === "hull" && F.run > 0 && f.vol > 0.05) {
        const run = f.vol * (1 - Math.exp(-F.run * dt));
        f.vol -= run;
        water(st, enP(f.s, f.side * (enB(f.s, 0) + 0.35), 0), run, f.fuel);
      }
    }
    if (burning) f.vol = Math.max(0, f.vol - (F.reg * area * dt));
    const Q = burning ? heatRelease(f, area) : 0;
    const target = burning ? clamp(Math.pow(Q / 2500, 0.45), 0.15, 1.3) * F.flame : 0;
    f.heat += (target - f.heat) * (1 - Math.exp(-dt / (target > f.heat ? 0.25 : 1.1)));
    const Ht = burning ? clamp(0.235 * Math.pow(Q, 0.4) - 1.02 * 2 * f.r, 0.3, 6.5) : f.H;
    f.H += (Ht - f.H) * (1 - Math.exp(-dt / 0.6));
    if (!burning && f.heat < 0.01 && f.age > 1.5 && (f.kind !== "water" || f.vol < 0.05 || f.age > 40)) {
      st.fires.splice(i, 1);
      continue;
    }
    if (!burning && f.kind === "water") f.vol *= Math.exp(-dt / 6); // the cold slick disperses
    // Char what the flame touches.
    if (f.heat > 0.05) charNear(st, f, dt);
    if (!M.calm) emitPatch(M, f, F, dt, bud);
  }
  // Burning planks: char on, pass fire upward and sideways, then die down to embers.
  let burningN = 0;
  for (let i = 0; i < EN_PLANKS.length; i++) {
    const c = st.char[i];
    if (c > 1.2 && c < 3.4) {
      burningN++;
      st.char[i] = c + dt * 0.045;
      const pl = EN_PLANKS[i];
      for (const [dj, di, rate] of [[1, 0, 0.032], [-1, 0, 0.01], [0, 1, 0.018], [0, -1, 0.018]]) {
        const j = plankIndex(pl.side, pl.j + dj, pl.i + di);
        if (j >= 0 && st.char[j] < 3.4) st.char[j] += dt * rate;
      }
      if (pl.j === EN_F.length - 2) for (let d = 0; d < EN_DECKS.length; d++) if (Math.abs(enLocal(EN_DECKS[d].mid).s - enLocal(pl.mid).s) < 1.6) st.deckChar[d] += dt * 0.01;
      for (let s = 0; s < SAIL_PANELS.length; s++) if (pl.j === EN_F.length - 2 && Math.abs(SAIL_PANELS[s].quad[SAIL_PANELS[s].quad.length - 1][0] - enLocal(pl.mid).s) < 1.0) st.sailChar[s] += dt * 0.012;
      if (!M.calm && burningN <= 12) emitWood(M, st, pl, c, dt, bud);
    }
  }
  applyChar(M, st);
}
function charNear(st, f, dt) {
  const reach = f.r + 0.6;
  for (let i = 0; i < EN_PLANKS.length; i++) {
    const pl = EN_PLANKS[i];
    let d;
    if (f.kind === "water") {
      if (pl.j !== 0) continue;
      d = Math.hypot(pl.mid[0] - f.p[0], pl.mid[1] - f.p[1]) - 0.4;
    } else d = len(sub(pl.mid, f.p));
    if (d < reach) st.char[i] += dt * f.heat * (f.kind === "water" ? 0.05 : 0.11) * (1 - d / reach);
  }
  if (f.kind === "deck") for (let i = 0; i < EN_DECKS.length; i++) if (len(sub(EN_DECKS[i].mid, f.p)) < 2.0) st.deckChar[i] += dt * f.heat * 0.08;
  if (f.kind === "sail") st.sailChar[f.panel] += dt * f.heat * 0.22;
  if (f.kind === "hull" || f.kind === "deck") for (let s = 0; s < SAIL_PANELS.length; s++) if (len(sub(SAIL_PANELS[s].mid, f.p)) < 3.2 && f.H > 1.4) st.sailChar[s] += dt * f.heat * 0.012;
}
const charMat = (c, base) => (c < 0.35 ? base : c < 1.25 ? "hide" : "pitch");
function setMat(M, st, id, mat, hidden = false) {
  const key = `${mat}|${hidden}`;
  if (st.mats.get(id) === key) return;
  const part = M.scene.parts.get(id);
  if (!part) return;
  st.mats.set(id, key);
  part.el.setAttribute("data-mat", mat);
  part.el.style.visibility = hidden ? "hidden" : "";
}
function applyChar(M, st) {
  EN_PLANKS.forEach((pl, i) => setMat(M, st, pl.id, charMat(st.char[i], pl.base)));
  EN_DECKS.forEach((d, i) => setMat(M, st, d.id, charMat(st.deckChar[i], d.base)));
  SAIL_PANELS.forEach((p, i) => setMat(M, st, p.id, charMat(st.sailChar[i], p.base), st.sailChar[i] >= 3));
}
function restoreEnemy(M) {
  if (!M.scene) return;
  const all = [...EN_PLANKS.map((p) => [p.id, p.base]), ...EN_DECKS.map((d) => [d.id, d.base]), ...SAIL_PANELS.map((p) => [p.id, p.base])];
  for (const [id, mat] of all) {
    const part = M.scene.parts.get(id);
    if (!part) continue;
    part.el.setAttribute("data-mat", mat);
    part.el.style.visibility = "";
  }
}

function emitPatch(M, f, F, dt, bud) {
  const I = f.heat;
  if (I < 0.03) return;
  const H = Math.max(0.3, f.H);
  const life = 0.42 + 0.09 * H;
  const rate = (10 + 20 * f.r) * I * bud;
  f.acc += rate * dt;
  const up = f.kind === "hull" ? mul(EN.n, f.side) : [0, 0, 0];
  while (f.acc >= 1) {
    f.acc -= 1;
    const a = Math.random() * TAU;
    const rr = Math.sqrt(Math.random()) * f.r * 0.85;
    const base = f.kind === "hull" ? add(f.p, add(mul(EN.d, Math.cos(a) * rr), [0, 0, Math.sin(a) * rr * 0.6])) : add(f.p, [Math.cos(a) * rr, Math.sin(a) * rr, 0.04]);
    const p = add(base, mul(up, 0.12));
    const vz = (1.5 * H) / life;
    M.fx.emit("fire", W(p), { v: W(add(mul(WIND, 0.25), add(mul(up, 0.3), [0, 0, vz]))), spread: 0.25 * S, size: clamp(0.26 * f.r + 0.12 * H, 0.2, 1.3) * S, grow: clamp(0.45 * f.r + 0.24 * H, 0.35, 2.1) * S, life, heat: 0.75 + 0.25 * I, buoy: 1.5 * S, drag: 1.4 });
  }
  f.sacc += (1.2 + 1.8 * f.r) * I * F.soot * bud * dt + (F.soot < 0.3 ? 0.7 * I * bud * dt : 0);
  while (f.sacc >= 1) {
    f.sacc -= 1;
    const p = add(f.p, [rnd(f.r * 0.5), rnd(f.r * 0.5), H * 0.75]);
    M.fx.emit(F.soot > 0.5 ? "soot" : "smoke", W(p), { v: W(add(WIND, [0, 0, 1.3])), spread: 0.2 * S, size: clamp(0.5 * H, 0.6, 2.5) * S, grow: clamp(1.6 * H, 2, 6) * S, life: 6.5, alpha: F.soot > 0.5 ? 0.55 : 0.4, buoy: 0.3 * S, drag: 0.24, heat: 0.3 });
  }
}
function emitWood(M, st, pl, c, dt, bud) {
  const I = smoothstep(1.2, 1.5, c) * (1 - smoothstep(3.0, 3.4, c));
  pl.acc = (pl.acc || 0) + dt * 7 * I * bud;
  while (pl.acc >= 1) {
    pl.acc -= 1;
    const p = add(lerp(lerp(pl.c[0], pl.c[1], Math.random()), lerp(pl.c[3], pl.c[2], Math.random()), Math.random()), mul(pl.n, 0.1));
    M.fx.emit("fire", W(p), { v: W(add(mul(pl.n, 0.25), [0, 0, 1.7])), spread: 0.2 * S, size: 0.35 * S, grow: 0.8 * S, life: 0.62, heat: 0.85, buoy: 1.2 * S, drag: 1.3 });
  }
  pl.sacc = (pl.sacc || 0) + dt * 1.1 * I * bud;
  while (pl.sacc >= 1) {
    pl.sacc -= 1;
    M.fx.emit("soot", W(add(pl.mid, [0, 0, 0.9])), { v: W(add(WIND, [0, 0, 1.1])), spread: 0.15 * S, size: 0.7 * S, grow: 3.2 * S, life: 6, alpha: 0.42, buoy: 0.28 * S, drag: 0.25, heat: 0.2 });
  }
}
// Lamp at the mouth, embers and glow from the brazier, the pour from the jar.
function ambient(M, st, now, dt) {
  if (M.calm || dt <= 0) return;
  const A = st.acc;
  const NFm = nozzleFrame(M.ctrl.elev, M.ctrl.trav);
  A.lamp += dt * 14;
  while (A.lamp >= 1) {
    A.lamp -= 1;
    M.fx.emit("fire", W(add(lampWick(NFm), [0, 0, 0.015])), { v: W([rnd(0.03), rnd(0.03), 0.25]), size: 0.05 * S, grow: 0.025 * S, life: 0.28, heat: 0.95, buoy: 0.3 * S, drag: 2 });
  }
  const power = st.tk.qin;
  A.ember += dt * (1 + power * 0.7);
  while (A.ember >= 1) {
    A.ember -= 1;
    const a = Math.random() * TAU;
    const r = TANK.r + 0.03 + Math.random() * 0.08;
    M.fx.emit("ember", w(Math.cos(a) * r, BRZ.y + Math.sin(a) * r, BRZ.z1 + 0.01), { v: w(rnd(0.08), rnd(0.08), 0.5 + Math.random() * 0.4), size: 0.035 * S, life: 1.1, heat: 0.95, buoy: 0.2 * S, drag: 1.2, cool: 0.6 });
  }
  A.glow += dt * 5;
  while (A.glow >= 1) {
    A.glow -= 1;
    M.fx.emit("glow", w(BRZ.half + 0.04, BRZ.y, 1.55), { size: (0.32 + 0.02 * power) * S, life: 0.5, heat: clamp(0.35 + power * 0.04, 0.3, 1), alpha: 0.85 });
  }
  A.smoke += dt * (0.5 + power * 0.08);
  while (A.smoke >= 1) {
    A.smoke -= 1;
    M.fx.emit("smoke", w(rnd(0.2), BRZ.y + rnd(0.2), BRZ.z1 + 0.1), { v: W(add(mul(WIND, 0.3), [0, 0, 0.6])), size: 0.18 * S, grow: 0.9 * S, life: 3.5, alpha: 0.22, buoy: 0.2 * S, drag: 0.5 });
  }
  if (st.fill && st.fill.u > 0.5 && st.fill.u < 0.8) {
    const jp = jarPose(st.fill.u, RACK.ys[fuelIndex(st.fill.fuel)]);
    A.pour += dt * 60;
    while (A.pour >= 1) {
      A.pour -= 1;
      M.fx.spawn("liquid", W(jp.mouth), { v: w(0.35, 0, -0.4), size: 0.035 * S, grow: 0.03 * S, life: 0.22, heat: 0, grav: 1, drag: 0.2, alpha: 1.2 });
    }
  }
}
const fuelIndex = (id) => ["naphtha", "pitch", "lime"].indexOf(id);

// Put a host's children in the order `els`, moving only the elements off the longest run that
// is already in order (a moving part changes its place among a few neighbours, not all 500).
function reorder(host, els) {
  const kids = [...host.children];
  if (kids.length === els.length && kids.every((e, i) => e === els[i])) return;
  const pos = new Map(kids.map((e, i) => [e, i]));
  const a = els.map((e) => (pos.has(e) ? pos.get(e) : -1));
  const n = a.length;
  const tails = [];
  const tailIdx = [];
  const prev = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    if (a[i] < 0) continue;
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (tails[m] < a[i]) lo = m + 1;
      else hi = m;
    }
    tails[lo] = a[i];
    tailIdx[lo] = i;
    prev[i] = lo > 0 ? tailIdx[lo - 1] : -1;
  }
  const keep = new Set();
  for (let i = tails.length ? tailIdx[tails.length - 1] : -1; i >= 0; i = prev[i]) keep.add(i);
  let next = null;
  for (let i = n - 1; i >= 0; i--) {
    if (!keep.has(i)) host.insertBefore(els[i], next);
    next = els[i];
  }
}


// ---------------------------------------------------------------- static builders
function buildBase(B) {
  const plan = { x: PLINTH.x * S, y: PLINTH.y * S, w: PLINTH.w * S, d: PLINTH.d * S, r: 10 };
  B.plinth(plan, { h: 12, foot: 6, ruler: "y", label: { x: -3.7 * S, y: 8.85 * S, w: 46, d: 20, r: 1.5 } });
  const sea = { x: SEA.x0 * S, y: SEA.y0 * S, w: (SEA.x1 - SEA.x0) * S, d: (SEA.y1 - SEA.y0) * S, r: SEA.r * S };
  const ring = k.ringOf(sea, 6);
  B.solid("sea.inlay", k.slabOf(sea, 0, 0.25, B.P, 6), shapeOf(ring.map(([x, y]) => [x, y, 0])), { mat: "lead", tone: "lo", flat: true, layer: -1 });
}

function buildOurHull(B) {
  const o = { mat: "oak", tone: "mid" };
  for (const side of [1, -1]) {
    const tag = side > 0 ? "n" : "f";
    for (let j = 0; j < OUR_F.length - 1; j++) {
      const lv0 = (y) => OUR_F[j] * sheer(y);
      const lv1 = (y) => OUR_F[j + 1] * sheer(y);
      for (let i = 0; i < OUR_U.length - 1; i++) {
        const c = [ourAt(OUR_U[i], lv0, side), ourAt(OUR_U[i + 1], lv0, side), ourAt(OUR_U[i + 1], lv1, side), ourAt(OUR_U[i], lv1, side)];
        skin(B, `our.p${tag}${j}.${i}`, c, PLANK, [side, 0, 0], { ...o, tone: j === 2 ? "hi" : "mid", mat: j === 2 ? "wood" : "oak" });
      }
    }
    // The forecastle walls stand on the bow's sheer up to the parapet.
    const fl = [(y) => sheer(y), (y) => (sheer(y) + OUR.fcTop) / 2, () => OUR.fcTop];
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < FC_U.length - 1; i++) {
        const c = [ourAt(FC_U[i], fl[j], side), ourAt(FC_U[i + 1], fl[j], side), ourAt(FC_U[i + 1], fl[j + 1], side), ourAt(FC_U[i], fl[j + 1], side)];
        skin(B, `our.fc${tag}${j}.${i}`, c, PLANK, [side, 0, 0], { ...o, cut: side > 0 ? true : undefined });
      }
    }
  }
  // Stem post, its finial, the spur with its iron band and bronze cap.
  const stem = [0, 0.7, 1.4, 2.1, 2.48].map((z) => [0, stemY(z) - 0.03, z]);
  for (let i = 0; i < stem.length - 1; i++) B.beam(`our.stem${i}`, W(stem[i]), W(stem[i + 1]), { w: 0.2 * S, h: 0.18 * S, up: X, mat: "oak", tone: "hi", nails: [{ s: 0.2 * S, face: "-v", x: 0 }] });
  B.ball("our.finial", W([0, stemY(2.48) - 0.03, 2.56]), 0.09 * S, { mat: "bronze", tone: "hi" });
  const r0 = [0, stemY(0.62) - 0.13, 0.62];
  B.beam("our.spur", W(r0), w(0, -1.62, 0.665), { w: 0.2 * S, h: 0.24 * S, up: Z, mat: "oak", tone: "hi", bands: [{ at: 0.35 * S, w: 0.08 * S, t: 0.02 * S }], grain: 1 });
  B.beam("our.spur2", w(0, -1.62, 0.665), w(0, -2.2, 0.695), { w: 0.15 * S, h: 0.18 * S, up: Z, mat: "oak", tone: "hi" });
  B.turned("our.spurcap", G.frameAlong(w(0, -2.2, 0.695), [0, -1, 0.05]), [[0, 0.1 * S], [0.07 * S, 0.1 * S], [0.14 * S, 0.07 * S, 1], [0.24 * S, 0.035 * S, 1], [0.32 * S, 0.008 * S]], { mat: "bronze", tone: "hi" });
  // The sectioned end: a bulkhead closes the model at the cut, planks show their thickness.
  const zs = [0, 0.45, 0.9, 1.24];
  const sec = [...zs.map((z) => [ourB(OUR.yCut, z) - 0.085, z]), ...zs.slice().reverse().map((z) => [-(ourB(OUR.yCut, z) - 0.085), z])];
  const F = { o: w(0, OUR.yCut, 0), a: Y, u: X, v: Z };
  const inner = B.L(OUR_F.slice(1, 4).map((f) => {
    const z = f * sheer(OUR.yCut);
    const b = ourB(OUR.yCut, z) - 0.085;
    return k.pathOf([B.at(w(-b, OUR.yCut, z)), B.at(w(b, OUR.yCut, z))]);
  }).join(""), { tone: "faint" });
  B.prism("our.bulkhead", F, sec.map(([x, z]) => [x * S, z * S]), -0.06 * S, 0, { mat: "wood", tone: "mid", inner });
}

function buildOurFittings(B) {
  // Main deck and forecastle deck, planked fore and aft.
  const ys = [OUR.yCut, 6.2, 5.0, 4.2, 3.7, 3.2, OUR.fcY];
  const deck = [...ys.map((y) => [ourB(y, OUR.deck) - 0.07, y]), ...ys.slice().reverse().map((y) => [-(ourB(y, OUR.deck) - 0.07), y])];
  plate(B, "our.deck", deck, OUR.deck, 0.06, { mat: "wood", tone: "mid", inner: B.L(seams(B, deck, OUR.deck, [0, 1], 0.24), { tone: "faint" }) });
  const fys = [OUR.fcY, 2.2, 1.6, 1.0, 0.4, -0.1, -0.45];
  const fc = [...fys.map((y) => [ourB(y, OUR.fcDeck) - 0.07, y]), ...fys.slice().reverse().map((y) => [-(ourB(y, OUR.fcDeck) - 0.07), y])];
  plate(B, "our.fcdeck", fc, OUR.fcDeck, 0.07, { mat: "wood", tone: "mid", inner: B.L(seams(B, fc, OUR.fcDeck, [0, 1], 0.22), { tone: "faint" }) });
  // Forecastle bulkhead with its door, a ladder up to it.
  const zs = [OUR.deck, 1.65, OUR.fcDeck - 0.07];
  const bh = [...zs.map((z) => [ourB(OUR.fcY, z) - 0.07, z]), ...zs.slice().reverse().map((z) => [-(ourB(OUR.fcY, z) - 0.07), z])];
  const door = [[-0.75, OUR.deck + 0.02], [-0.27, OUR.deck + 0.02], [-0.27, 1.9], [-0.75, 1.9]];
  const doorD = k.pathOf(door.map(([x, z]) => B.at(w(x, OUR.fcY + 0.002, z))), true);
  const planks = [1.53, 1.76].map((z) => {
    const b = ourB(OUR.fcY, z) - 0.07;
    return k.pathOf([B.at(w(-b, OUR.fcY + 0.002, z)), B.at(w(-0.75, OUR.fcY + 0.002, z))]) + k.pathOf([B.at(w(-0.27, OUR.fcY + 0.002, z)), B.at(w(b, OUR.fcY + 0.002, z))]);
  }).join("");
  B.prism("our.fcbulk", { o: w(0, OUR.fcY, 0), a: Y, u: X, v: Z }, bh.map(([x, z]) => [x * S, z * S]), -0.06 * S, 0, { mat: "wood", tone: "mid", inner: B.L(planks, { tone: "faint" }) + B.L(doorD, { tone: "lo" }), over: B.D([B.at(w(-0.33, OUR.fcY + 0.003, 1.62))], { size: 0.5, tone: "hi" }) });
  const lx = [0.68, 1.06];
  for (const x of lx) B.beam(`our.ladder${x}`, w(x, 3.32, OUR.deck), w(x, OUR.fcY + 0.035, OUR.fcDeck - 0.02), { w: 0.05 * S, h: 0.09 * S, up: [0, 1, 0.6], mat: "oak", tone: "mid" });
  for (let i = 1; i <= 3; i++) {
    const u = i / 4;
    const y = lerp([0, 3.32, OUR.deck], [0, OUR.fcY + 0.035, OUR.fcDeck - 0.02], u);
    B.cyl(`our.rung${i}`, w(lx[0] + 0.025, y[1], y[2]), w(lx[1] - 0.025, y[1], y[2]), 0.022 * S, { mat: "oak", tone: "mid" });
  }
  // Rail posts and rails along the waist (the near rail lifts away in the cutaway).
  const posts = [3.25, 4.25, 5.25, 6.25, 7.25];
  for (const side of [1, -1]) {
    const cut = side > 0 ? true : undefined;
    const tops = [];
    posts.forEach((y, i) => {
      const z0 = sheer(y);
      const x = side * (ourB(y, z0) - 0.035);
      B.beam(`our.post${side}.${i}`, w(x, y, z0), w(x, y, z0 + 0.6), { w: 0.06 * S, h: 0.06 * S, up: Y, mat: "oak", tone: "mid", cut });
      tops.push([x, y, z0 + 0.6]);
    });
    for (let i = 0; i < tops.length - 1; i++) B.beam(`our.rail${side}.${i}`, W(add(tops[i], [0, 0, 0.026])), W(add(tops[i + 1], [0, 0, 0.026])), { w: 0.07 * S, h: 0.05 * S, up: Z, mat: "oak", tone: "mid", cut, s0: 0, nails: [{ s: 0.04 * S, face: "v", x: 0 }] });
    // Oars run out through leather boots in the wale.
    for (const y of OUR_OARS) {
      const o = ourOar(y, side);
      B.beam(`our.oar${side}${y}`, W(add(o.port, mul(o.dir, 0.0))), W(add(o.port, mul(o.dir, o.L - 0.55))), { w: 0.075 * S, h: 0.075 * S, round: 0.035 * S, up: Z, mat: "oak", tone: "mid" });
      const bl = add(o.port, mul(o.dir, o.L - 0.55));
      const across = unit(cross(o.dir, Z));
      const upb = unit(cross(across, o.dir));
      const c = [add(bl, mul(upb, -0.075)), add(add(bl, mul(o.dir, 0.55)), mul(upb, -0.075)), add(add(bl, mul(o.dir, 0.55)), mul(upb, 0.075)), add(bl, mul(upb, 0.075))];
      skin(B, `our.blade${side}${y}`, c, 0.025, across, { mat: "oak", tone: "mid" });
    }
  }
}

function buildBrazier(B) {
  const o = { mat: "iron", tone: "hi", sys: "brazier" };
  const y0 = BRZ.y - BRZ.half;
  const y1 = BRZ.y + BRZ.half;
  const h = BRZ.half;
  const t = BRZ.t;
  // Clay-tile hearth under it, iron feet.
  const hp = { x: -0.43 * S, y: (BRZ.y - 0.43) * S, w: 0.86 * S, d: 0.86 * S, r: 0.6 };
  const tiles = [];
  for (const f of [-0.215, 0, 0.215]) {
    tiles.push(k.pathOf([B.at(w(f, BRZ.y - 0.43, OUR.deck + 0.06)), B.at(w(f, BRZ.y + 0.43, OUR.deck + 0.06))]));
    tiles.push(k.pathOf([B.at(w(-0.43, BRZ.y + f, OUR.deck + 0.06)), B.at(w(0.43, BRZ.y + f, OUR.deck + 0.06))]));
  }
  B.slab("brz.hearth", hp, OUR.deck * S, 0.06 * S, { mat: "clay", tone: "mid", sys: "brazier", steps: 2, bevel: 0.3, inner: B.L(tiles.join(""), { tone: "faint" }) });
  for (const [x, y] of [[-h + 0.05, y0 + 0.05], [h - 0.05, y0 + 0.05], [-h + 0.05, y1 - 0.05], [h - 0.05, y1 - 0.05]]) B.cyl(`brz.foot${x}${y}`, w(x, y, OUR.deck + 0.06), w(x, y, BRZ.z0), 0.035 * S, { ...o });
  const slab = (id, x0, x1, ya, yb, za, zb, extra = {}) => B.slab(id, { x: x0 * S, y: ya * S, w: (x1 - x0) * S, d: (yb - ya) * S, r: 0.2 }, za * S, (zb - za) * S, { ...o, steps: 2, ...extra });
  slab("brz.floor", -h, h, y0, y1, BRZ.z0, BRZ.z0 + 0.03);
  slab("brz.wallF", -h, h, y0, y0 + t, BRZ.z0 + 0.03, BRZ.z1, { seams: [BRZ.z1 * S - 1] });
  slab("brz.wallB", -h, h, y1 - t, y1, BRZ.z0 + 0.03, BRZ.z1);
  slab("brz.wallL", -h, -h + t, y0 + t, y1 - t, BRZ.z0 + 0.03, BRZ.z1);
  // The near wall around the stoke-hole, in four pieces; it lifts away in the cutaway.
  const dz0 = 1.5;
  const dz1 = 1.66;
  const dy = 0.12;
  slab("brz.wallR0", h - t, h, y0 + t, y1 - t, BRZ.z0 + 0.03, dz0, { cut: true });
  slab("brz.wallR1", h - t, h, y0 + t, y1 - t, dz1, BRZ.z1, { cut: true });
  slab("brz.wallR2", h - t, h, y0 + t, BRZ.y - dy, dz0, dz1, { cut: true });
  slab("brz.wallR3", h - t, h, BRZ.y + dy, y1 - t, dz0, dz1, { cut: true });
  // Rim bars the tank rests on, the grate, the coals.
  for (const dy2 of [-0.1, 0.1]) B.beam(`brz.bar${dy2}`, w(-h + t, BRZ.y + dy2, TANK.zb - 0.02), w(h - t, BRZ.y + dy2, TANK.zb - 0.02), { w: 0.03 * S, h: 0.03 * S, up: Z, ...o });
  for (const dy2 of [-0.16, -0.05, 0.06, 0.17]) B.beam(`brz.grate${dy2}`, w(-h + t, BRZ.y + dy2, 1.49), w(h - t, BRZ.y + dy2, 1.49), { w: 0.02 * S, h: 0.02 * S, up: Z, ...o });
  const R = rng(11);
  for (let i = 0; i < 12; i++) {
    const x = -0.2 + R() * 0.4;
    const y = BRZ.y - 0.2 + R() * 0.4;
    const r = 0.035 + R() * 0.025;
    B.ball(`brz.coal${i}`, w(x, y, 1.5 + r), r * S, { mat: i % 3 === 0 ? "copper" : "pitch", tone: "hi", sys: "brazier" });
  }
  // The door, swung open on its hinge.
  const hy = BRZ.y + dy + 0.01;
  const open = rad(118);
  const dir = [Math.cos(open) * 0, Math.sin(-open) * 0, 0];
  const ax = [Math.sin(open), -Math.cos(open), 0];
  const p0 = w(h + 0.005, hy, dz0 - 0.01);
  B.prism("brz.door", { o: p0, a: Z, u: ax, v: cross(Z, ax) }, [[0, 0], [0.26 * S, 0], [0.26 * S, 0.012 * S], [0, 0.012 * S]], 0, (dz1 - dz0 + 0.02) * S, { ...o, cut: true, over: B.D([B.at(add(p0, mul(add(mul(ax, 0.22 * S), mul(Z, 0.09 * S)), 1)))], { size: 0.6, tone: "hi" }) });
  void dir;
}

function buildTank(B) {
  const o = { mat: "bronze", tone: "hi", sys: "tank" };
  const F = G.frameAlong(w(TANK.x, TANK.y, TANK.zb), Z);
  const r = TANK.r * S;
  const band = (id, s0, s1, rr, extra = {}) => B.turned(id, { ...F, o: add(F.o, mul(Z, s0 * S)) }, [[0, rr], [(s1 - s0) * S, rr]], { ...o, ...extra });
  B.turned("tank.bottom", F, [[0, 0.11 * S], [0.012 * S, 0.15 * S, 1], [0.035 * S, 0.172 * S, 1], [0.06 * S, r], [0.1 * S, r]], { ...o });
  const zb = TANK.zb;
  band("tank.bandA", 0.1, 0.3, r, { cut: true });
  band("tank.ring1", 0.3, 0.335, 0.188 * S, { cut: true });
  band("tank.bandB", 0.335, 0.465, r, { cut: true });
  band("tank.ring2", 0.465, 0.5, 0.188 * S, { cut: true });
  band("tank.bandC", 0.5, TANK.z1 - zb, r, { cut: true });
  // Flange and bolted lid; ports for the dip tube, the air line and the filler.
  B.cyl("tank.flange", w(0, TANK.y, TANK.z1), w(0, TANK.y, LID.z0), 0.215 * S, { ...o });
  B.cyl("tank.lid", w(0, TANK.y, LID.z0), w(0, TANK.y, LID.z1), 0.205 * S, { ...o, bolts: [{ r: 0.19 * S, count: 14, all: true, size: 0.45 }] });
  B.cyl("tank.outBoss", w(PORT.out[0], PORT.out[1], LID.z1), w(PORT.out[0], PORT.out[1], 2.5), 0.045 * S, { ...o, sys: "tank valve" });
  B.cyl("tank.outFl", w(PORT.out[0], PORT.out[1], 2.5), w(PORT.out[0], PORT.out[1], 2.52), 0.052 * S, { ...o, sys: "valve", bolts: [{ r: 0.042 * S, count: 4, size: 0.35 }] });
  B.cyl("tank.inBoss", w(PORT.inl[0], PORT.inl[1], LID.z1), w(PORT.inl[0], PORT.inl[1], 2.5), 0.04 * S, { ...o, sys: "tank pump" });
  B.cyl("tank.inFl", w(PORT.inl[0], PORT.inl[1], 2.5), w(PORT.inl[0], PORT.inl[1], 2.52), 0.046 * S, { ...o, sys: "pump", bolts: [{ r: 0.037 * S, count: 4, size: 0.35 }] });
  B.cyl("tank.fillNeck", w(PORT.fill[0], PORT.fill[1], LID.z1), w(PORT.fill[0], PORT.fill[1], 2.52), 0.045 * S, { ...o });
  B.ring("tank.fillLip", w(PORT.fill[0], PORT.fill[1], 2.52), w(PORT.fill[0], PORT.fill[1], 2.545), 0.032 * S, 0.06 * S, { ...o });
  for (const side of [-1, 1]) {
    const c = [side * 0.247, TANK.y, (TANK.z1 + LID.z0) / 2];
    B.ring(`tank.lug${side}`, W(add(c, [0, -0.012, 0])), W(add(c, [0, 0.012, 0])), 0.018 * S, 0.033 * S, { ...o });
  }
}

function buildPumpStatic(B) {
  const o = { mat: "bronze", tone: "hi", sys: "pump" };
  B.slab("pump.bed", { x: -0.2 * S, y: 5.18 * S, w: 0.4 * S, d: 1.24 * S, r: 0.8 }, OUR.deck * S, 0.12 * S, { mat: "oak", tone: "mid", sys: "pump", steps: 2, bevel: 0.4, inner: B.L(k.planOutline(k.insetPlan({ x: -0.2 * S, y: 5.18 * S, w: 0.4 * S, d: 1.24 * S, r: 0.8 }, 0.6), (OUR.deck + 0.12) * S, B.P, 2), { tone: "faint" }), over: B.D([[-0.14, 5.24], [0.14, 5.24], [-0.14, 6.36], [0.14, 6.36]].map(([x, y]) => B.at(w(x, y, OUR.deck + 0.12))), { size: 0.5, tone: "hi" }) });
  for (const yc of CYL_Y) {
    const F = G.frameAlong(w(0, yc, 1.42), Z);
    B.turned(`pump.barrel${yc}`, F, [[0, 0.09 * S], [0.03 * S, 0.09 * S], [0.03 * S, 0.065 * S], [0.37 * S, 0.065 * S], [0.37 * S, 0.08 * S], [0.41 * S, 0.08 * S]], { ...o, seams: [[0.15 * S, 0.065 * S], [0.26 * S, 0.065 * S]] });
    B.cyl(`pump.gland${yc}`, w(0, yc, 1.83), w(0, yc, 1.865), 0.042 * S, { ...o, bolts: [{ r: 0.034 * S, count: 4, size: 0.32 }] });
    B.cyl(`pump.nut${yc}`, w(0, yc, 1.865), w(0, yc, 1.885), 0.028 * S, { ...o });
    // Valve chest: inlet flap on top, outlet stub to the manifold.
    B.slab(`pump.chest${yc}`, { x: -0.168 * S, y: (yc - 0.05) * S, w: 0.102 * S, d: 0.1 * S, r: 0.2 }, 1.45 * S, 0.1 * S, { ...o, steps: 2, bevel: 0.2 });
    B.cyl(`pump.stub${yc}`, w(-0.168, yc, 1.5), w(-0.198, yc, 1.5), 0.016 * S, { ...o });
    B.ball(`pump.tee${yc}`, w(-0.23, yc, 1.5), 0.034 * S, { ...o });
  }
  // Fulcrum: two oak cheeks with iron caps.
  for (const x of [-0.085, 0.085]) {
    B.beam(`pump.cheek${x}`, w(x, 5.8, 1.42), w(x, 5.8, 2.43), { w: 0.05 * S, h: 0.12 * S, up: Y, mat: "oak", tone: "mid", sys: "pump", bands: [{ at: 0.25 * S, w: 0.05 * S, t: 0.01 * S }] });
    B.cyl(`pump.pin${x}`, w(Math.sign(x) * 0.11, 5.8, PIV[2]), w(Math.sign(x) * 0.135, 5.8, PIV[2]), 0.024 * S, { mat: "iron", tone: "hi", sys: "pump", faceRing: [{ s: 0.025 * S, r: 0.012 * S }] });
  }
}

function buildLines(B) {
  // Air line from the pump's manifold to the tank, with a check valve on the riser.
  const air = pipe(B, "air", AIR_ROUTE, 0.024, { bend: 0.09, gaps: [[[-0.23, 5.5, 1.5], 0.034], [[-0.45, 4.0, 2.05], 0.07]], o: { sys: "pump", tone: "hi" } });
  B.turned("air.check", G.frameAlong(w(-0.45, 4.0, 1.98), Z), [[0, 0.034 * S], [0.02 * S, 0.034 * S], [0.02 * S, 0.042 * S, 1], [0.07 * S, 0.05 * S, 1], [0.12 * S, 0.042 * S, 1], [0.12 * S, 0.034 * S], [0.14 * S, 0.034 * S]], { mat: "bronze", tone: "hi", sys: "pump" });
  void air;
  // Delivery line: tank outlet → union → plug cock → swivel.
  const gaps = [[[PORT.out[0], 3.0, DEL_Z], 0.03], [[PORT.out[0], VALVE_Y, DEL_Z], 0.13], [[PORT.out[0], 3.15, DEL_Z], 0.025], [[PORT.out[0], 1.05, DEL_Z], 0.025]];
  pipe(B, "del", DEL_ROUTE, 0.032, { bend: 0.08, gaps, o: { sys: "valve" } });
  const fwd = [0, -1, 0];
  collar(B, "del.unionA", [PORT.out[0], 3.015, DEL_Z], fwd, 0.055, 0.03, { sys: "valve", bolts: [{ r: 0.045 * S, count: 6, size: 0.35 }] });
  collar(B, "del.unionB", [PORT.out[0], 2.985, DEL_Z], fwd, 0.055, 0.03, { sys: "valve", bolts: [{ r: 0.045 * S, count: 6, size: 0.35 }] });
  // Plug cock body (the plug and its T-handle turn; see drawCock).
  const Fv = G.frameAlong(w(PORT.out[0], VALVE_Y + 0.13, DEL_Z), fwd);
  const vp = [[0, 0.06], [0.022, 0.06], [0.022, 0.044], [0.04, 0.044], [0.05, 0.055, 1], [0.09, 0.068, 1], [0.13, 0.068, 1], [0.17, 0.055, 1], [0.22, 0.044], [0.238, 0.044], [0.238, 0.06], [0.26, 0.06]];
  B.turned("del.cock", Fv, vp.map(([s, r, sm]) => (sm ? [s * S, r * S, 1] : [s * S, r * S])), { mat: "bronze", tone: "hi", sys: "valve" });
  B.cyl("del.bonnet", w(PORT.out[0], VALVE_Y, DEL_Z + 0.06), w(PORT.out[0], VALVE_Y, DEL_Z + 0.09), 0.038 * S, { mat: "bronze", tone: "hi", sys: "valve", bolts: [{ r: 0.03 * S, count: 4, size: 0.32 }] });
  // Crutches carrying the line: a post with a saddle, an iron clamp over the pipe.
  for (const [y, z0, id] of [[3.15, OUR.deck, "a"], [1.05, OUR.fcDeck, "b"]]) {
    B.beam(`del.post${id}`, w(PORT.out[0], y, z0), w(PORT.out[0], y, DEL_Z - 0.075), { w: 0.07 * S, h: 0.07 * S, up: Y, mat: "oak", tone: "mid", sys: "valve" });
    B.slab(`del.saddle${id}`, { x: (PORT.out[0] - 0.06) * S, y: (y - 0.035) * S, w: 0.12 * S, d: 0.07 * S, r: 0.3 }, (DEL_Z - 0.075) * S, 0.04 * S, { mat: "oak", tone: "mid", sys: "valve", steps: 2 });
    collar(B, `del.clamp${id}`, [PORT.out[0], y, DEL_Z], [0, 1, 0], 0.043, 0.045, { mat: "iron", sys: "valve", tone: "hi" });
  }
}

function buildSwivel(B) {
  const o = { mat: "bronze", tone: "hi", sys: "nozzle" };
  const [x, y] = SW;
  B.slab("sw.pedestal", { x: (x - 0.16) * S, y: (y - 0.16) * S, w: 0.32 * S, d: 0.32 * S, r: 0.6 }, OUR.fcDeck * S, 0.37 * S, { mat: "oak", tone: "mid", sys: "nozzle", steps: 2, bevel: 0.4, seams: [(OUR.fcDeck + 0.07) * S, (OUR.fcDeck + 0.3) * S] });
  B.cyl("sw.base", w(x, y, 2.42), w(x, y, 2.45), 0.11 * S, { ...o, bolts: [{ r: 0.095 * S, count: 6, size: 0.4 }] });
  B.cyl("sw.sleeve", w(x, y, 2.45), w(x, y, 2.715), 0.075 * S, { ...o, seams: [0.1 * S] });
  B.cyl("sw.port", w(x, y + 0.07, DEL_Z), w(x, y + 0.115, DEL_Z), 0.045 * S, { ...o, sys: "nozzle valve" });
  collar(B, "sw.portFl", [x, y + 0.125, DEL_Z], [0, 1, 0], 0.052, 0.02, { sys: "valve", bolts: [{ r: 0.043 * S, count: 4, size: 0.35 }] });
  B.cyl("sw.ring", w(x, y, 2.715), w(x, y, 2.74), 0.095 * S, { ...o });
  // Traverse scale on the ring: ticks every 5°, ±40°.
  const t = k.radialTicks(x * S, y * S, 0.093 * S, 16, 2, 2.74 * S, [0.012 * S, 0.024 * S], B.P, rad(-40), rad(80));
  B.marks("sw.scale", B.L(t.minor, { tone: "lo" }) + B.L(t.major, { tone: "mid" }), [w(x, y - 0.09, 2.741), w(x + 0.06, y - 0.07, 2.741), w(x - 0.06, y - 0.07, 2.741)], { r: 0.2, after: ["sw.ring"] });
}

function buildBellowsStatic(B) {
  const o = { mat: "oak", tone: "mid", sys: "brazier" };
  const y0 = BELLOWS.y0;
  B.slab("bel.stool", { x: -0.2 * S, y: (y0 + 0.08) * S, w: 0.4 * S, d: 0.5 * S, r: 0.5 }, OUR.deck * S, 0.12 * S, { ...o, steps: 2, bevel: 0.3 });
  B.slab("bel.block", { x: -0.075 * S, y: (y0 - 0.06) * S, w: 0.15 * S, d: 0.08 * S, r: 0.3 }, (OUR.deck + 0.12) * S, 0.11 * S, { ...o, steps: 2 });
  const bottom = [[-0.07, y0 + 0.02], [0.07, y0 + 0.02], [0.16, y0 + BELLOWS.len], [-0.16, y0 + BELLOWS.len]];
  plate(B, "bel.bottom", bottom, BELLOWS.z, 0.03, { ...o });
  B.cyl("bel.handleB", w(0, y0 + BELLOWS.len, BELLOWS.z - 0.015), w(0, y0 + BELLOWS.len + 0.14, BELLOWS.z - 0.015), 0.018 * S, { ...o });
  B.turned("bel.nozzle", G.frameAlong(w(0, y0 - 0.06, 1.55), [0, -1, 0]), [[0, 0.028 * S], [0.04 * S, 0.026 * S], [0.09 * S, 0.016 * S], [0.09 * S, 0.012 * S]], { mat: "iron", tone: "hi", sys: "brazier" });
}

function buildRack(B) {
  const o = { mat: "oak", tone: "mid", sys: "tank" };
  const x = RACK.x;
  const ya = RACK.ys[0] - 0.24;
  const yb = RACK.ys[2] + 0.24;
  B.slab("rack.base", { x: (x - 0.2) * S, y: ya * S, w: 0.4 * S, d: (yb - ya) * S, r: 0.5 }, OUR.deck * S, 0.04 * S, { ...o, steps: 2 });
  for (const yy of [ya + 0.03, yb - 0.03]) for (const dx of [-0.175, 0.175]) B.beam(`rack.post${yy}${dx}`, w(x + dx, yy, RACK.toe), w(x + dx, yy, 1.66), { w: 0.04 * S, h: 0.04 * S, up: Y, ...o });
  for (const dx of [-0.175, 0.175]) B.beam(`rack.rail${dx}`, w(x + dx, ya + 0.05, 1.58), w(x + dx, yb - 0.05, 1.58), { w: 0.03 * S, h: 0.05 * S, up: Z, ...o, nails: RACK.ys.map((yy) => ({ s: (yy - ya - 0.05) * S, face: "v", x: 0 })) });
  for (const yy of [ya + 0.03, yb - 0.03]) B.beam(`rack.end${yy}`, w(x - 0.155, yy, 1.62), w(x + 0.155, yy, 1.62), { w: 0.03 * S, h: 0.04 * S, up: Z, ...o });
}

function buildEnemy(B) {
  const o = { mat: "oak", tone: "mid", sys: "target" };
  for (const pl of EN_PLANKS) skin(B, pl.id, pl.c, PLANK, pl.n, { ...o, tone: pl.j === 1 ? "hi" : "mid" });
  for (const d of EN_DECKS) {
    const pts = d.pts.map((p) => [p[0], p[1]]);
    plate(B, d.id, pts, EN.deck, 0.06, { mat: "wood", tone: "mid", sys: "target", inner: B.L(seams(B, pts, EN.deck, [EN.d[0], EN.d[1]], 0.22, 0.02), { tone: "faint" }) });
  }
  // Benches across the deck at each oar station.
  for (const s of EN_OARS) {
    const b = enB(s, EN.deck + 0.05) - 0.09;
    B.beam(`en.bench${s}`, W(enP(s, -b, EN.deck + 0.05)), W(enP(s, b, EN.deck + 0.05)), { w: 0.2 * S, h: 0.1 * S, up: Z, ...o });
  }
  // Stem and stern posts.
  const stem = [[6.0, 0], [6.19, 0.6], [6.38, 1.2], [6.56, 1.62], [6.66, 2.02]];
  for (let i = 0; i < stem.length - 1; i++) B.beam(`en.stem${i}`, W(enP(stem[i][0], 0, stem[i][1])), W(enP(stem[i + 1][0], 0, stem[i + 1][1])), { w: 0.18 * S, h: 0.16 * S, up: EN.n, ...o, tone: "hi" });
  const stern = [[-6.0, 0], [-6.17, 0.6], [-6.34, 1.2], [-6.55, 1.75], [-6.66, 2.25], [-6.52, 2.6], [-6.32, 2.74]];
  for (let i = 0; i < stern.length - 1; i++) B.beam(`en.stern${i}`, W(enP(stern[i][0], 0, stern[i][1])), W(enP(stern[i + 1][0], 0, stern[i + 1][1])), { w: 0.17 * S, h: 0.15 * S, up: EN.n, ...o, tone: "hi" });
  // Oars on their tholes, blades in the water.
  for (const side of [1, -1]) {
    for (const s of EN_OARS) {
      const r = enOar(s, side);
      const z = enSheer(s);
      B.cyl(`en.thole${side}${s}`, W(enP(s, side * (enB(s, z) - 0.02), z)), W(enP(s, side * (enB(s, z) - 0.02), z + 0.13)), 0.022 * S, { mat: "oak", tone: "mid", sys: "target" });
      B.beam(`en.oar${side}${s}`, W(r.thole), W(add(r.thole, mul(r.dir, r.L - 0.55))), { w: 0.07 * S, h: 0.07 * S, round: 0.033 * S, up: Z, ...o });
      const bl = add(r.thole, mul(r.dir, r.L - 0.55));
      const across = unit(cross(r.dir, Z));
      const upb = unit(cross(across, r.dir));
      skin(B, `en.blade${side}${s}`, [add(bl, mul(upb, -0.07)), add(add(bl, mul(r.dir, 0.55)), mul(upb, -0.07)), add(add(bl, mul(r.dir, 0.55)), mul(upb, 0.07)), add(bl, mul(upb, 0.07))], 0.025, across, { ...o });
    }
    // Quarter rudder.
    const s0 = -5.0;
    const top = enP(s0, side * (enB(s0, 1.3) + 0.08), 1.38);
    const bot = enP(s0 - 0.5, side * (enB(s0, 0) + 0.3), 0.0);
    B.beam(`en.rudder${side}`, W(top), W(lerp(top, bot, 0.55)), { w: 0.09 * S, h: 0.09 * S, round: 0.04 * S, up: Z, ...o });
    const m = lerp(top, bot, 0.55);
    const d = unit(sub(bot, top));
    const aft = mul(EN.d, -1);
    skin(B, `en.rblade${side}`, [m, bot, add(bot, mul(aft, 0.3)), add(m, mul(aft, 0.22))], 0.04, mul(EN.n, side), { ...o });
    B.beam(`en.tiller${side}`, W(top), W(add(top, add(mul(EN.n, -side * 0.5), [0, 0, 0.08]))), { w: 0.05 * S, h: 0.05 * S, up: Z, ...o });
    void d;
  }
  // Mast, partner, masthead, lateen yard and sail; forestay and port shrouds.
  const mz = EN.deck;
  B.cyl("en.partner", W(enP(MAST_S, 0, mz)), W(enP(MAST_S, 0, mz + 0.08)), 0.17 * S, { mat: "oak", tone: "hi", sys: "target" });
  B.cyl("en.mast", W(enP(MAST_S, 0, mz + 0.08)), W(enP(MAST_S, 0, 4.85)), 0.1 * S, { mat: "oak", tone: "hi", sys: "target", seams: [1.6 * S] });
  const mh = enP(MAST_S, 0, 4.85);
  B.cyl("en.masthead", W(mh), W(add(mh, [0, 0, 0.2])), 0.12 * S, { mat: "oak", tone: "hi", sys: "target", faceRing: [{ r: 0.06 * S }] });
  const ya = enP(YARD.s0, YARD.t, YARD.z0);
  const ym = enP(MAST_S, YARD.t, yardZ(MAST_S));
  const yb = enP(YARD.s1, YARD.t, YARD.z1);
  const yd = unit(sub(yb, ya));
  const lenA = len(sub(ym, ya)) - 0.07;
  const lenB = len(sub(yb, ym)) - 0.07;
  B.turned("en.yardA", G.frameAlong(W(ya), yd), [[0, 0.032 * S], [lenA * 0.5 * S, 0.052 * S, 1], [lenA * S, 0.062 * S]], { mat: "oak", tone: "hi", sys: "target" });
  B.cyl("en.yardLash", W(sub(ym, mul(yd, 0.07))), W(add(ym, mul(yd, 0.07))), 0.075 * S, { mat: "rope", tone: "mid", sys: "target", ribs: { count: 14, twist: 0.3 } });
  B.turned("en.yardB", G.frameAlong(W(add(ym, mul(yd, 0.07))), yd), [[0, 0.062 * S], [lenB * 0.5 * S, 0.05 * S, 1], [lenB * S, 0.03 * S]], { mat: "oak", tone: "hi", sys: "target" });
  for (const p of SAIL_PANELS) skin(B, p.id, p.pts, 0.055, EN.n, { mat: "rope", tone: "mid", sys: "target" });
  B.rope("en.sling", [W(add(mh, [0, 0, 0.1])), W(add(ym, [0, 0, 0.06]))], 0.02 * S, { mat: "rope", sys: "target", twist: false });
  B.cord("en.forestay", [W(add(mh, [0, 0, 0.15])), W(enP(6.62, 0, 1.95))], { width: 0.6, tone: "mid", sys: "target", mat: "rope" });
  for (const s of [0.45, -1.05]) B.cord(`en.shroud${s}`, [W(add(mh, [0, 0, 0.12])), W(enP(s, -enB(s, 1.1) + 0.03, enSheer(s)))], { width: 0.6, tone: "mid", sys: "target", mat: "rope" });
  const clew = enP(SAIL.clew[0], SAIL.t, SAIL.clew[1]);
  B.cord("en.sheet", [W(clew), W(enP(-4.7, 0.7, EN.deck + 0.05))], { width: 0.7, tone: "mid", sys: "target", mat: "rope" });
}

// ---------------------------------------------------------------- dynamic builders
function drawPump(B, phi) {
  const o = { mat: "oak", tone: "hi", sys: "pump" };
  const dirB = [0, Math.cos(phi), Math.sin(phi)];
  const nrm = [0, -Math.sin(phi), Math.cos(phi)];
  const at = (s) => add(PIV, mul(dirB, s));
  // Beam with iron straps at the links; handles across each end.
  B.beam("pump.beamA", W(at(-1.0)), W(at(-0.065)), { w: 0.11 * S, h: 0.16 * S, up: nrm, ...o, bands: [{ at: 0.7 * S, w: 0.06 * S, t: 0.008 * S }], grain: 2 });
  B.beam("pump.beamB", W(at(0.065)), W(at(1.0)), { w: 0.11 * S, h: 0.16 * S, up: nrm, ...o, bands: [{ at: 0.235 * S, w: 0.06 * S, t: 0.008 * S }], grain: 2 });
  B.beam("pump.beamHub", W(at(-0.065)), W(at(0.065)), { w: 0.11 * S, h: 0.17 * S, up: nrm, mat: "iron", tone: "hi", sys: "pump" });
  // T-handles against each end grain of the beam.
  for (const s of [-1.025, 1.025]) B.cyl(`pump.handle${s}`, W(add(at(s), [-0.29, 0, 0])), W(add(at(s), [0.29, 0, 0])), 0.024 * S, { mat: "wood", tone: "hi", sys: "pump", faceRing: [{ r: 0.012 * S }] });
  // Links, crossheads, rods out of the glands.
  [[-PUMP.arm, CYL_Y[0]], [PUMP.arm, CYL_Y[1]]].forEach(([s, yc], i) => {
    const pin = pinAt(phi, s);
    const zc = crossZ(phi, s, yc);
    const ch = [0, yc, zc];
    for (const sx of [-1, 1]) {
      const pins = B.visibleFace([sx, 0, 0]) ? B.D([B.at(W(add(pin, [sx * 0.071, 0, 0]))), B.at(W(add(ch, [sx * 0.071, 0, 0])))], { size: 0.75, tone: "hi" }) : "";
      B.beam(`pump.link${i}${sx}`, W(add(pin, [sx * 0.064, 0, 0])), W(add(ch, [sx * 0.064, 0, 0])), { w: 0.035 * S, h: 0.012 * S, up: [1, 0, 0], mat: "iron", tone: "hi", sys: "pump", s0: -0.02 * S, over: pins });
    }
    B.slab(`pump.cross${i}`, { x: -0.045 * S, y: (yc - 0.032) * S, w: 0.09 * S, d: 0.064 * S, r: 0.2 }, (zc - 0.035) * S, 0.06 * S, { mat: "iron", tone: "hi", sys: "pump", steps: 2 });
    B.cyl(`pump.rod${i}`, w(0, yc, 1.885), w(0, yc, zc - 0.035), 0.016 * S, { mat: "iron", tone: "hi", sys: "pump", lit: true });
  });
}
function drawFlaps(B, flap) {
  CYL_Y.forEach((yc, i) => {
    // Inlet flap: lifts while the barrel breathes.
    const a = rad(flap[i] > 0.5 ? 34 : 2);
    const hinge = [-0.16, yc - 0.035, 1.55];
    const fwd = [Math.cos(a), 0, Math.sin(a)];
    B.prism(`pump.flap${i}`, { o: W(hinge), a: Y, u: fwd, v: cross(Y, fwd) }, [[0, 0], [0.08 * S, 0], [0.08 * S, 0.008 * S], [0, 0.008 * S]], 0, 0.07 * S, { mat: "hide", tone: "hi", sys: "pump" });
  });
}

function drawCock(B, u) {
  // Plug cock: the T-handle lies across the line when shut, along it when open.
  const a = (u * Math.PI) / 2;
  const c = [PORT.out[0], VALVE_Y, DEL_Z + 0.09];
  B.cyl("cock.stem", W(c), W(add(c, [0, 0, 0.06])), 0.016 * S, { mat: "bronze", tone: "hi", sys: "valve" });
  const top = add(c, [0, 0, 0.06]);
  B.cyl("cock.hub", W(top), W(add(top, [0, 0, 0.03])), 0.028 * S, { mat: "bronze", tone: "hi", sys: "valve" });
  const d = [Math.cos(a), -Math.sin(a), 0];
  const mid = add(top, [0, 0, 0.015]);
  for (const sg of [-1, 1]) B.cyl(`cock.bar${sg}`, W(add(mid, mul(d, sg * 0.028))), W(add(mid, mul(d, sg * 0.15))), 0.013 * S, { mat: "bronze", tone: "hi", sys: "valve", lit: sg > 0 });
  B.ball("cock.knob", W(add(mid, mul(d, 0.155))), 0.02 * S, { mat: "bronze", tone: "hi", sys: "valve" });
}

function lampWick(N) {
  return add(N.at(MOUTH_S + 0.025, 0, -0.105), [0, 0, 0.012]);
}
function drawNozzle(B, elev, trav) {
  const N = nozzleFrame(elev, trav);
  const o = { mat: "bronze", tone: "hi", sys: "nozzle" };
  const [x, y] = SW;
  const ps = rad(trav);
  // Turning head on the sleeve, pointer over the scale, the yoke and its trunnion.
  B.cyl("noz.head", w(x, y, 2.74), w(x, y, 2.8), 0.085 * S, { ...o });
  const fwd0 = [Math.sin(ps), -Math.cos(ps), 0];
  const ptr = add([x, y, 2.775], mul(fwd0, 0.085));
  B.beam("noz.pointer", W(ptr), W(add(ptr, mul(fwd0, 0.03))), { w: 0.012 * S, h: 0.015 * S, up: Z, mat: "iron", tone: "hi", sys: "nozzle" });
  const across = N.across;
  const yoke = [x, y, 2.8];
  B.prism("noz.yokebase", { o: W(add(yoke, mul(across, -0.11))), a: across, u: fwd0, v: Z }, polyRect(0.13 * S, 0.035 * S, 0, 0.0175 * S), 0, 0.22 * S, { ...o });
  for (const sg of [-1, 1]) {
    const c0 = add(yoke, mul(across, sg * 0.0925));
    const poly = [[-0.06, 0.035], [0.06, 0.035], [0.05, 0.22], [0.02, 0.25], [-0.02, 0.25], [-0.05, 0.22]].map(([u, v]) => [u * S, v * S]);
    B.prism(`noz.cheek${sg}`, { o: W(c0), a: across, u: fwd0, v: Z }, poly, -0.0125 * S, 0.0125 * S, { ...o });
    B.cyl(`noz.trun${sg}`, W(add(N.o, mul(across, sg * 0.105))), W(add(N.o, mul(across, sg * 0.12))), 0.022 * S, { ...o, faceRing: [{ r: 0.012 * S }] });
  }
  // Quadrant on the near cheek with a tick every 5° of elevation; pointer on the breech.
  const sgn = across[0] >= 0 ? 1 : -1;
  const qc = add(N.o, mul(across, sgn * 0.121));
  const ticks = [];
  for (let e = -10; e <= 25; e += 5) {
    const a = rad(e);
    const dir = add(mul(fwd0, -Math.cos(a)), [0, 0, -Math.sin(a)]);
    const r0 = e % 10 === 0 ? 0.048 : 0.055;
    ticks.push(k.pathOf([B.at(W(add(qc, mul(dir, r0)))), B.at(W(add(qc, mul(dir, 0.066))))]));
  }
  const qpoly = [];
  for (let e = -14; e <= 29; e += 43 / 6) {
    const a = rad(e);
    qpoly.push([-Math.cos(a) * 0.068 * S, -Math.sin(a) * 0.068 * S]);
  }
  qpoly.push([0, 0]);
  B.prism("noz.quadrant", { o: W(add(N.o, mul(across, sgn * 0.12))), a: mul(across, sgn), u: fwd0, v: Z }, qpoly, 0, 0.004 * S, { ...o, tone: "hi", over: B.L(ticks.join(""), { tone: "mid" }) });
  // The siphon: breech knob, tapering bronze tube with bands, and the beast head with lamp.
  const F = { o: W(N.o), a: N.f, u: N.across, v: N.up };
  const at = (s) => W(N.at(s));
  B.turned("noz.breech", { ...F, o: at(-0.17) }, [[0, 0.01 * S], [0.015 * S, 0.035 * S, 1], [0.05 * S, 0.05 * S, 1], [0.08 * S, 0.06 * S], [0.25 * S, 0.06 * S]], { ...o });
  const seg = (id, s0, s1, r0, r1) => B.turned(id, { ...F, o: at(s0) }, [[0, r0 * S], [(s1 - s0) * S, r1 * S]], { ...o });
  seg("noz.tube0", 0.08, 0.3, 0.05, 0.046);
  seg("noz.band0", 0.3, 0.34, 0.056, 0.056);
  seg("noz.tube1", 0.34, 0.56, 0.046, 0.042);
  seg("noz.band1", 0.56, 0.6, 0.052, 0.052);
  seg("noz.tube2", 0.6, 0.8, 0.042, 0.04);
  B.turned("noz.mane", { ...F, o: at(0.8) }, [[0, 0.058 * S], [0.035 * S, 0.058 * S]], { ...o, inner: B.L(G.ribsOf({ ...F, o: at(0.8) }, 0, 0.035 * S, 0.058 * S, 18, B.P, { phase: 0.2 }), { tone: "lo" }) });
  B.turned("noz.beast", { ...F, o: at(0.835) }, [[0, 0.05 * S], [0.025 * S, 0.064 * S, 1], [0.07 * S, 0.07 * S, 1], [0.12 * S, 0.062 * S, 1], [0.16 * S, 0.048 * S, 1], [0.185 * S, 0.034 * S]], { ...o, lit: true });
  B.ring("noz.lip", at(MOUTH_S - 0.0), at(MOUTH_S + 0.012), 0.008 * S, 0.034 * S, { ...o });
  for (const sg of [-1, 1]) {
    B.ball(`noz.eye${sg}`, W(N.at(0.92, sg * 0.05, 0.035)), 0.012 * S, { mat: "iron", tone: "hi", sys: "nozzle" });
    B.turned(`noz.ear${sg}`, G.frameAlong(W(N.at(0.87, sg * 0.04, 0.05)), unit(add(add(N.up, mul(N.f, -0.6)), mul(N.across, sg * 0.35)))), [[0, 0.016 * S], [0.05 * S, 0.003 * S]], { ...o });
  }
  B.prism("noz.jaw", { o: W(N.at(0.93, 0, -0.055)), a: N.across, u: N.f, v: N.up }, [[0, 0], [0.11 * S, 0.012 * S], [0.1 * S, 0.026 * S], [0, 0.03 * S]], -0.025 * S, 0.025 * S, { ...o });
  // Lamp: bracket under the jaw, a bronze oil lamp, its wick at the mouth.
  B.beam("noz.lampArm", W(N.at(0.86, 0, -0.06)), W(N.at(0.97, 0, -0.1)), { w: 0.015 * S, h: 0.012 * S, up: N.across, mat: "iron", tone: "hi", sys: "nozzle" });
  B.turned("noz.lamp", G.frameAlong(W(N.at(0.95, 0, -0.105)), N.f), [[0, 0.012 * S], [0.015 * S, 0.028 * S, 1], [0.05 * S, 0.03 * S, 1], [0.07 * S, 0.016 * S], [0.085 * S, 0.008 * S]], { ...o });
  // Tiller to aim it.
  const t0 = N.at(-0.17);
  const t1 = add(t0, add(mul(N.f, -0.32), mul(N.up, -0.16)));
  B.cyl("noz.tiller", W(t0), W(t1), 0.014 * S, { mat: "iron", tone: "hi", sys: "nozzle" });
  B.cyl("noz.grip", W(t1), W(add(t1, mul(unit(sub(t1, t0)), 0.12))), 0.022 * S, { mat: "wood", tone: "hi", sys: "nozzle", ribs: { count: 10 } });
}

function drawBellows(B, ang) {
  const o = { mat: "oak", tone: "hi", sys: "brazier" };
  const y0 = BELLOWS.y0;
  const hz = BELLOWS.z + 0.03;
  const L = BELLOWS.len;
  const along = [0, Math.cos(ang), Math.sin(ang)];
  const nrm = [0, -Math.sin(ang), Math.cos(ang)];
  const hinge = [0, y0 + 0.02, hz];
  const pts = [[-0.07, 0], [0.07, 0], [0.16, L], [-0.16, L]];
  const F = { o: W(hinge), a: nrm, u: X, v: along };
  B.prism("bel.top", F, pts.map(([u, v]) => [u * S, v * S]), 0, 0.03 * S, { ...o, over: B.D([B.at(W(add(hinge, add(mul(along, L * 0.6), mul(nrm, 0.03)))))], { size: 0.6, tone: "hi" }) });
  const back = add(hinge, mul(along, L));
  B.cyl("bel.handleT", W(add(back, mul(nrm, 0.015))), W(add(add(back, mul(along, 0.14)), mul(nrm, 0.015))), 0.018 * S, { ...o });
  // Leather: a wedge between the boards.
  const tri = [[0, 0], [L - 0.02, 0], [(L - 0.02) * Math.cos(ang), (L - 0.02) * Math.sin(ang)]];
  B.prism("bel.leather", { o: w(-0.12, y0 + 0.02, hz - 0.0), a: X, u: Y, v: Z }, tri.map(([u, v]) => [u * S, v * S]), 0, 0.24 * S, { mat: "hide", tone: "hi", sys: "brazier" });
}

function jarPose(u, y) {
  const c0 = [RACK.x, y, RACK.toe];
  const lifted = [RACK.x, y, RACK.toe + 0.62];
  const pourBase = [PORT.fill[0] - 0.32, PORT.fill[1], 2.5];
  let base;
  let tilt = 0;
  if (u < 0.2) base = lerp(c0, lifted, ease(u / 0.2));
  else if (u < 0.4) base = lerp(lifted, pourBase, ease((u - 0.2) / 0.2));
  else if (u < 0.88) base = pourBase;
  else base = lerp(pourBase, c0, ease((u - 0.88) / 0.12));
  tilt = rad(108) * smoothstep(0.36, 0.5, u) * (1 - smoothstep(0.8, 0.9, u));
  const axis = [Math.sin(tilt), 0, Math.cos(tilt)];
  // Tilt about the jar's belly so the mouth swings over the funnel.
  const pivot = add(base, [0, 0, 0.3]);
  const toe = sub(pivot, mul(axis, 0.3));
  const mouth = add(toe, mul(axis, 0.64));
  return { toe, axis, mouth };
}
function drawJars(B, M, st) {
  const id = M.ammo.id;
  ["naphtha", "pitch", "lime"].forEach((fid, i) => {
    const y = RACK.ys[i];
    let toe = [RACK.x, y, RACK.toe];
    let axis = Z;
    if (st.fill && st.fill.fuel === fid) {
      const jp = jarPose(st.fill.u, y);
      toe = jp.toe;
      axis = jp.axis;
    }
    amphora(B, `jar.${fid}`, W(toe), axis, S, { mat: FUELS[fid].jar, lit: fid === id, sys: "tank" });
  });
}
function drawFiller(B, open) {
  // A hinged cap on the filler: it swings up on its hinge while the tank is charged.
  const a = rad(110) * open;
  const hinge = [PORT.fill[0] - 0.062, PORT.fill[1], 2.545];
  const dir = [Math.cos(a), 0, Math.sin(a)];
  const c = add(hinge, mul(dir, 0.062));
  const n = [-Math.sin(a), 0, Math.cos(a)];
  B.cyl("tank.cap", W(c), W(add(c, mul(n, 0.016))), 0.062 * S, { mat: "bronze", tone: "hi", sys: "tank", faceRing: [{ r: 0.03 * S }] });
  B.cyl("tank.capHinge", W(add(hinge, [0, -0.025, 0.006])), W(add(hinge, [0, 0.025, 0.006])), 0.008 * S, { mat: "bronze", tone: "hi", sys: "tank" });
}

// The cutaway: the near half of the tank wall is gone between its bottom band and flange.
function drawCutaway(B, M, st, pz) {
  const z0 = TANK.zb + 0.1;
  const z1 = TANK.z1;
  const a0 = Math.atan2(B.V[1], B.V[0]) + Math.PI / 2;
  const n = 10;
  const ri = TANK.rIn;
  const ro = TANK.r;
  const F = { o: w(TANK.x, TANK.y, z0), a: Z, u: X, v: Y };
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI;
    const b = a0 + ((i + 1) / n) * Math.PI;
    const pts = [[ri * Math.cos(a), ri * Math.sin(a)], [ro * Math.cos(a), ro * Math.sin(a)], [ro * Math.cos(b), ro * Math.sin(b)], [ri * Math.cos(b), ri * Math.sin(b)]];
    B.prism(`cut.wall${i}`, F, pts.map(([x, y]) => [x * S, y * S]), 0, (z1 - z0) * S, { mat: "bronze", tone: "hi", sys: "tank" });
  }
  // The charge: a half-cylinder whose top is the level and whose face is the cut.
  const lz = levelZ(pz.vol);
  if (lz > z0 + 0.004) {
    const half = [];
    for (let i = 0; i <= 12; i++) {
      const a = a0 + (i / 12) * Math.PI;
      half.push([(ri - 0.003) * Math.cos(a) * S, (ri - 0.003) * Math.sin(a) * S]);
    }
    B.prism("cut.fuel", F, half, 0, (Math.min(lz, z1) - z0) * S, { mat: FUELS[pz.fuel].wet, tone: "hi", sys: "tank", lit: true });
  }
  // Air in the headspace: one dot per unit of density on the cut plane.
  const cnt = Math.round(airDots(st));
  const R = rng(7);
  const dots = [];
  const along = [Math.cos(a0), Math.sin(a0)];
  const top = z1 - 0.012;
  const bot = Math.max(lz, z0) + 0.012;
  for (let i = 0; i < cnt && top > bot; i++) {
    const s = (R() * 2 - 1) * (ri - 0.02);
    const z = bot + R() * (top - bot);
    dots.push(B.at(w(TANK.x + along[0] * s, TANK.y + along[1] * s, z)));
  }
  if (dots.length) B.marks("cut.air", B.D(dots, { size: 0.55, tone: "hi" }), [w(TANK.x, TANK.y, (top + bot) / 2)], { r: 0.15 * S, layer: 1 });
  // Dip tube down to the floor.
  B.cyl("cut.dip", w(PORT.out[0], PORT.out[1], z0), w(PORT.out[0], PORT.out[1], z1), 0.012 * S, { mat: "bronze", tone: "hi", sys: "tank valve", layer: 1 });
}

// Trace: the jet's centreline now, and its arc every half second of the burst as the tank empties.
function drawTrace(B, M, st) {
  const fuel = (st.now && st.now.fuel) || st.tk.fuel;
  const f = FUELS[fuel];
  const N = nozzleFrame(M.ctrl.elev, M.ctrl.trav);
  const mouth = N.at(MOUTH_S + 0.01);
  const arcs = [];
  const r = measure(M);
  if (r.v > 0.5) arcs.push({ v: r.v, tone: "lit" });
  if (st.sim && M.shot) for (let t = 0.5; t < Math.min(M.shot.t, BURST); t += 0.5) arcs.push({ v: st.sim.rec.at(t).v, tone: "lo" });
  let svg = "";
  const dots = [];
  arcs.forEach(({ v, tone }, j) => {
    if (v < 0.5) return;
    const J = traceJet(mouth, mul(N.f, v), f.D);
    const tEnd = J.hit ? J.hit.t : J.tWater;
    const pts = [];
    for (let t = 0; t <= tEnd + 1e-6; t += tEnd / 40) pts.push(B.at(W(J.f(t).p)));
    svg += tone === "lit" ? `<path class="iso-line" data-tone="lit" style="stroke:var(--accent);stroke-width:1.1px" d="${k.pathOf(pts)}"/>` : B.L(k.pathOf(pts), { tone: "lo" });
    if (j === 0) for (let t = 0.1; t < tEnd; t += 0.1) dots.push(B.at(W(J.f(t).p)));
  });
  if (svg) B.marks("trace", svg + B.D(dots, { size: 1.2, tone: "mid" }), [W(mouth), W(add(mouth, mul(N.f, 6)))], { r: 30, layer: 6 });
}

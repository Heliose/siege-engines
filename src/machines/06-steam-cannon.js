// Architonnerre: the steam cannon Leonardo da Vinci drew in Manuscript B and credited to Archimedes,
// as the MIT team rebuilt it in 2006. A copper barrel on a bracket carriage; its breech hangs in an
// iron fire-cage of charcoal blown by a pair of leather bellows; a bronze vessel above the breech drops
// a measured charge of water through a stopcock into the hot chamber, where it flashes to steam.
//
// TRUTH (SI). Authored in metres; S converts to world units (U = 0.014 m per unit).
//  Bore 0.118 m (A = 0.01094 m²). Chamber 0.32 m behind the seated ball (3.5 L). Ball travel 1.60 m.
//  Barrel 2.16 m over all. Breech: 55 kg copper (c 385 J/kg·K) as two nodes, a 5 kg inner skin that
//  meets the water and a 50 kg body behind it (3.5 kW/K between them).
//  Fire: the coal bed follows the bellows, from 330 °C banked to 1200 °C at 40 strokes/min; heat into the
//  breech (0.4 + 70·air)·(Tcoal − T) W; losses by radiation (ε 0.6 on 0.28 m²) and convection (12 W/m²K).
//  At 26 strokes/min the breech reaches 480 °C in ~6 min and levels off near 720 °C; at 6/min it never
//  passes ~330 °C; at 40/min ~900 °C. Heating runs as a ×60 time-lapse (the readout keeps the true fire
//  time); a shot plays in real time.
//  Flash: each kg of water needs c_w·(Tsat − 15) + L(Tsat) ≈ 2.6–2.8 MJ, taken from the skin at a rate
//  40 kW/K·wet·(Tskin − Tsat(p)), Tsat(p) from Clausius–Clapeyron (100 °C at 1 bar, 264 °C at 50 bar).
//  Steam and air behind the ball are ideal gases in one energy balance: inflowing vapour enthalpy, the
//  work on the ball, wall → gas heating, heat lost to the cooler bore, leakage past the ball (windage) and
//  back up the open stopcock. The ball sits in its seat until 4.5 kN; bore friction 260 N + 0.3·m·g·cos e.
//  After the muzzle the chamber blows down (choked). Recoil: 460 kg carriage, 720 N trail and wheel drag.
//  The stopcock's key turns in 0.3 s; the charge drops in at up to 8 kg/s and the gunner shuts the cock
//  again a quarter second after it is in.
//  Iron ball 5.6 kg with 140 g: 200 °C → ~30 m/s with ~100 g still unflashed at the muzzle (a fizzle);
//  350 °C → ~56 m/s; 480 °C → ~68 m/s at ~11 bar; 600 °C → ~75 m/s; 800 °C → ~83 m/s, recoil 0.2–0.4 m.
//  Stone 2.3 kg at 600 °C → ~100 m/s; clay fire-shell 1.9 kg → ~105 m/s (≈ 410 m at 20°).
//  Below ~180 °C the seat holds: the steam hisses out past the ball and up the cock (hang fire), and the
//  water left in the breech must be boiled off by the next heating.
//
// PARTS. Carriage: two bracket cheeks of seven pieces each, axle-tree, axle arms and linchpins, two
//  wheels (rim felloes, iron strakes, spokes, hubs, hub bands), front transom, quoin bed, trail transom,
//  trail shoes, cap squares with bolts, bellows platform (three boards), lever post, fork plates, braces.
//  Barrel: cascabel knob and neck, button, base ring, three breech bands, reinforce ring, trunnion band,
//  trunnions with rimbases, rings, two chase lengths, chase ring, muzzle neck and swell.
//  Fire-cage: ash pan, four corner posts, six side rails, two side straps, wall rails and bars, six grate
//  bars, two hanger rings with four hanger straps, lug with brackets, tuyere stub, ~40 charcoal lumps.
//  Water: bronze vessel, lid and knob, two loop handles, two struts, boss, pipes, stopcock plug and key.
//  Bellows: two bottom boards, two top boards, twelve leather pleats, two hinge blocks, two nozzles,
//  two eyes, two weights, rods, rocking lever and grip, pivot pin, wind trunk, leather hose.
//  Quoin and its grip. Rammer (pole, head, ferrule) on chocks. Ready tray with three cups and shot,
//  a water cask. The plinth.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { add, sub, mul, dot, cross, unit, len, lerp, clamp, rad, deg, ease, smoothstep, fmt, fmtInt, TAU, rng, rotate } from "../engine/vec.js";
import * as PH from "../engine/physics.js";
import * as looks from "../engine/looks.js";
import { frameFrom, framePoint, polyRect, polyCircle } from "../engine/geo.js";
import { shapeOf } from "../engine/scene.js";

const U = 0.014;
const S = 1 / U;
const w = (x, y, z) => [x * S, y * S, z * S];
const W = (p) => [p[0] * S, p[1] * S, p[2] * S];
const XH = [1, 0, 0];

// ---------------------------------------------------------------- dimensions (m)
const ZT = 0.97; // trunnion axis height
const RB = 0.059; // bore radius
const AREA = Math.PI * RB * RB;
const S_BREECH = -0.62; // chamber back wall
const S_SEAT = -0.3; // chamber front (ball's rear face when seated)
const S_MUZZLE = 1.3;
const LTRAVEL = S_MUZZLE - S_SEAT; // 1.60
const VCH = AREA * (S_SEAT - S_BREECH);
const ACH = 2 * Math.PI * RB * (S_SEAT - S_BREECH) + AREA;
const S_PIPE = -0.43; // water pipe into the chamber top
const WHEEL = { y: -0.45, z: 0.5, R: 0.5, x: 0.53 };
const CHEEK = [0.205, 0.295];
const BED = { y0: -0.25, y1: 0.56, z0: 0.33, z1: 0.4 };
const QUOIN = { thin: 0.08, slope: 0.45, len: 0.5, half: 0.11 };
const LUG = { s: -0.18, nn: -0.31, r: 0.02 };
const BELLOWS = { step: rad(1), yh: 1.1, z0: 0.675, L: 0.82, xs: [0.2, -0.2], eye: 0.76, pivot: [0, 1.88, 1.18], arm: 0.2, rod: 0.321 };
const TRUNK = { y: 0.95, z: 0.7, r: 0.035 };
const RACK = { x: 0.95, ys: [-2.02, -1.85, -1.68], z: 0.05 };
const RAMMER = { pole: 1.7, r: 0.02, head: 0.1, rh: 0.054, x: 1.12, y: -2.06, z: 0.055 };
const ELEV = [2, 24];

// Barrel frame: s along the bore toward the muzzle, x across, nn the barrel's own "up".
const AX = (e) => [0, -Math.cos(e), Math.sin(e)];
const NR = (e) => [0, Math.sin(e), Math.cos(e)];
const bp = (e, s, x = 0, nn = 0) => [x, -s * Math.cos(e) + nn * Math.sin(e), ZT + s * Math.sin(e) + nn * Math.cos(e)];
const bw = (e, s, x = 0, nn = 0) => W(bp(e, s, x, nn));
const BF = (e, s0 = 0) => ({ o: bw(e, s0), a: AX(e), u: XH, v: NR(e) });

// ---------------------------------------------------------------- thermal model
const TA = 15;
const MB = 55;
const CB = 385;
const MSKIN = 5;
const GSKIN = 3500;
const LAPSE = 60;
const TC_BANK = 330;
const TC_BLOWN = 1200;
const heatLoss = (T) => 0.6 * 5.67e-8 * 0.28 * ((T + 273.15) ** 4 - (TA + 273.15) ** 4) + 12 * 0.28 * (T - TA);
const airOf = (st, ctrl) => Math.max(st.pump * (ctrl.bellows / 40), 0.12 * smoothstep(520, 800, st.Tc));
function heatStep(st, ctrl, dtSim) {
  let left = dtSim;
  while (left > 1e-6) {
    const h = Math.min(left, 2);
    left -= h;
    const air = airOf(st, ctrl);
    const target = TC_BANK + (TC_BLOWN - TC_BANK) * Math.pow(air, 0.7);
    st.Tc += (target - st.Tc) * (1 - Math.exp(-h / (target > st.Tc ? 35 : 240)));
    const Pin = (0.4 + 70 * air) * (st.Tc - st.Tb);
    let Pboil = 0;
    if (st.wet > 0 && st.Tb > 100) {
      const m = Math.min(st.wet, (90 * (st.Tb - 100) * h) / 2.6e6);
      st.wet -= m;
      Pboil = (m * 2.6e6) / h;
      st.boil = m / h;
    } else st.boil = 0;
    st.Tb += ((Pin - heatLoss(st.Tb) - Pboil) * h) / (MB * CB);
    st.fire += st.pump > 0.05 ? h : 0;
  }
}
const qFlash = (Ts) => 4186 * Math.max(0, Ts - TA) + Math.max(1.2e6, 2.501e6 - 2370 * Ts);

// ---------------------------------------------------------------- internal ballistics
const RV = 461.5, CVV = 1450, CPV = CVV + RV;
const RA = 287, CVA = 718, CPA = CVA + RA;
const PATM = 101325;
const Tsat = (p) => 1 / (1 / 373.15 - (RV / 2.2e6) * Math.log(Math.max(p, 2000) / PATM)) - 273.15;
const MCAR = 460;
const FCAR = 720;
const T_OPEN = [0.15, 0.22];
const FALL = 0.03;
const QIN = 8;
const valveOpen = (t, close) => smoothstep(T_OPEN[0], T_OPEN[1], t) * (1 - smoothstep(close, close + 0.25, t));
const handleTurn = (t, close) => smoothstep(0, 0.3, t) * (1 - smoothstep(close - 0.05, close + 0.3, t));

function simulateShot({ Tb, wet0, mw, ammo, e }) {
  const mk = MB - MSKIN;
  let Ts = Tb, Tk = Tb;
  const Tbore = TA + 0.12 * (Tb - TA);
  const m = ammo.mass, r = ammo.radius;
  const gap = Math.PI * (RB * RB - r * r) * (1 - (ammo.seal ?? 0.9)) + 1.5e-5;
  const close = Math.max(0.45, T_OPEN[1] + FALL + mw / QIN + 0.12);
  let ma = (PATM * VCH) / (RA * (Tb + 273.15)), mv = 0, ml = wet0, min = 0;
  let U = ma * CVA * (Tb + 273.15);
  let x = 0, v = 0, moved = false, out = false, tStart = null, tExit = null, vExit = 0, tFlash = null;
  let yc = 0, vc = 0, pk = 0, flashed = 0, unflashedAtExit = null, flashedAtExit = null, xMax = 0;
  const g = PH.GRAVITY;
  const rec = PH.timeline();
  let t = 0, next = 0;
  const tEnd = 2.6;
  while (t < tEnd) {
    const active = t > T_OPEN[0] + FALL - 0.005 && (tExit === null ? t < 1.2 : t < tExit + 0.04);
    const dt = active ? 1e-5 : t < 1.4 ? 2e-4 : 1e-3;
    const V = VCH + AREA * Math.min(x, LTRAVEL);
    const cv = ma * CVA + mv * CVV;
    const Tg = U / cv;
    const Rm = ma * RA + mv * RV;
    const p = (Rm * Tg) / V;
    pk = Math.max(pk, p);
    const ts = Tsat(p);
    const open = valveOpen(t, close);
    const inflow = min < mw ? Math.min(mw - min, QIN * valveOpen(t - FALL, close) * dt) : 0;
    min += inflow;
    ml += inflow;
    const wet = ml / (ml + 0.05);
    const Qe = 40000 * wet * Math.max(0, Ts - ts);
    let me = (Qe / qFlash(ts)) * dt;
    if (me > ml) me = ml;
    if (me > 1e-7 && tFlash === null) tFlash = t;
    ml -= me;
    mv += me;
    flashed += me;
    const Qwg = 2500 * ACH * (Ts - (Tg - 273.15));
    const Qgb = 4000 * Math.PI * 2 * RB * Math.min(x, LTRAVEL) * Math.max(0, Tg - 273.15 - Tbore);
    const Rmix = Rm / (ma + mv);
    const cpm = (ma * CPA + mv * CPV) / (ma + mv);
    const choke = p > 1.9 * PATM ? 1 : Math.sqrt(Math.max(0, 1 - PATM / p) / 0.47);
    const flux = p > PATM ? (0.68 * p * choke) / Math.sqrt(Rmix * Tg) : 0;
    const pipeArea = min >= mw - 1e-6 ? 1.2e-4 * open : 0;
    const mLeak = flux * (out ? AREA : gap) * dt;
    const mPipe = flux * pipeArea * dt;
    const frac = Math.min(0.5, (mLeak + mPipe) / (ma + mv));
    let net = 0, fr = 0;
    if (!out) {
      fr = 260 + 0.3 * m * g * Math.cos(e);
      net = (p - PATM) * AREA - m * g * Math.sin(e);
      if (!moved && net > 4500) {
        moved = true;
        tStart = t;
      }
    }
    let a = 0;
    if (moved && !out) {
      if (v > 1e-6) a = (net - fr) / (m + 0.06);
      else if (Math.abs(net) > fr) a = (net - Math.sign(net) * fr) / (m + 0.06);
    }
    U += me * CPV * (ts + 273.15) + (Qwg - Qgb) * dt - (out ? 0 : p * AREA * v * dt) - frac * U * (cpm / (cv / (ma + mv)));
    ma -= frac * ma;
    mv -= frac * mv;
    U = Math.max(U, 1e-6);
    // Force on the carriage along +y: the gas on the breech face less what holds the ball, then the jet.
    const jet = (mLeak / dt) * 320;
    let Fy = 0;
    if (!out && moved) Fy = (Math.max(0, p - PATM) * AREA - (v > 1e-6 ? fr : Math.max(0, net))) * Math.cos(e) + jet * Math.cos(e);
    else if (out) Fy = 1.25 * Math.max(0, p - PATM) * AREA * Math.cos(e);
    else Fy = jet * Math.cos(e);
    if (vc > 1e-6 || Fy > FCAR * 1.2) vc = Math.max(0, vc + ((Fy - FCAR) / MCAR) * dt);
    yc += vc * dt;
    Ts += ((-Qe - Qwg) * dt + GSKIN * (Tk - Ts) * dt) / (MSKIN * CB);
    Tk += (-GSKIN * (Tk - Ts) * dt) / (mk * CB);
    if (!out) {
      v += a * dt;
      if (v < 0 && x <= 0) v = 0;
      x += v * dt;
      if (x < 0) x = 0;
      xMax = Math.max(xMax, x);
      if (x >= LTRAVEL) {
        out = true;
        tExit = t;
        vExit = v;
        unflashedAtExit = ml;
        flashedAtExit = flashed;
      }
    }
    t += dt;
    if (t >= next) {
      rec.push(t, { x: Math.min(x, LTRAVEL + 0.02), v: out ? vExit : v, p: p / 1e5, mv: mv * 1000, ml: ml * 1000, min: min * 1000, Ts, Tk, Tg: Tg - 273.15, yc, vc, out: (mLeak / dt) * (out ? 1 : 0), leak: out ? 0 : mLeak / dt, pipe: mPipe / dt, flashed: flashed * 1000 });
      next = t + (active ? 2.5e-4 : t < 1.4 ? 4e-3 : 0.02);
    }
    if (tExit === null && t > 1.25 && !moved) break;
  }
  const end = rec.end;
  const last = rec.at(end);
  return { rec, tStart, tExit, vExit, tFlash, close, end, pk: pk / 1e5, flashed: flashed * 1000, flashedExit: (flashedAtExit ?? flashed) * 1000, unflashed: (unflashedAtExit ?? ml) * 1000, liquidEnd: last.ml, Ts: last.Ts, Tk: last.Tk, recoil: last.yc, stuck: tExit === null, xMax, mw, e, ammo };
}

// ---------------------------------------------------------------- hot-metal inks
const hex = (s) => [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];
const BASE = {
  copper: { light: ["#d9a07b", "#e4b08f", "#eec5a8", "#a8633f", "#b9744f", "#c8855f", "#d5966f"], dark: ["#3b2416", "#472c1b", "#553421", "#29180e", "#311d11", "#3b2416", "#472c1b"] },
  iron: { light: ["#a2a7ab", "#b5b9bd", "#cdd1d4", "#73787c", "#83888c", "#92979b", "#a2a7ab"], dark: ["#262a2e", "#2e3338", "#373d43", "#1a1d20", "#1f2326", "#24282c", "#2a2f33"] },
  coal: { light: ["#3d3936", "#45403c", "#8e8a84", "#211e1c", "#2b2825", "#34302d", "#3d3936"], dark: ["#141210", "#191614", "#3d3a37", "#0b0a09", "#0f0d0c", "#131110", "#171514"] },
};
for (const m of Object.values(BASE)) for (const th of ["light", "dark"]) m[th] = m[th].map(hex);
const OXIDE = { copper: [0.3, 0.17, 0.13], iron: [0.24, 0.24, 0.26], coal: [0.16, 0.15, 0.14] };
// Hot bodies on paper run dull red → cherry → orange → yellow → cream (one stop table for every hot part).
const INK = [[480, [0.36, 0.1, 0.07]], [560, [0.45, 0.09, 0.05]], [680, [0.6, 0.08, 0.04]], [780, [0.8, 0.12, 0.03]], [950, [0.96, 0.4, 0.06]], [1150, [1, 0.76, 0.14]], [1260, [1, 0.92, 0.72]]];
const GLOWD = [[480, [0.32, 0.06, 0.03]], [560, [0.5, 0.08, 0.03]], [680, [0.74, 0.14, 0.03]], [780, [0.92, 0.26, 0.05]], [950, [1, 0.52, 0.12]], [1150, [1, 0.8, 0.36]], [1260, [1, 0.95, 0.8]]];
const ramp = (table, T) => {
  if (T <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) if (T <= table[i][0]) {
    const [t0, c0] = table[i - 1];
    const [t1, c1] = table[i];
    const u = (T - t0) / (t1 - t0);
    return c0.map((x, j) => x + (c1[j] - x) * u);
  }
  return table[table.length - 1][1];
};
const mixc = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const rgb = (c) => `rgb(${Math.round(clamp(c[0], 0, 1) * 255)},${Math.round(clamp(c[1], 0, 1) * 255)},${Math.round(clamp(c[2], 0, 1) * 255)})`;
const TOKENS = ["--anatomy-paper", "--anatomy-face", "--anatomy-top", "--anatomy-shade-0", "--anatomy-shade-1", "--anatomy-shade-2", "--anatomy-shade-3"];
const TONE_GLOW = [0.97, 1, 1, 0.74, 0.82, 0.89, 0.95];
const TONE_OX = [1, 1.08, 1.22, 0.7, 0.78, 0.86, 0.93];
const inkCache = new Map();
function hotTokens(mat, T, light, ash = 0) {
  const key = `${mat}|${Math.round(T)}|${light}|${ash.toFixed(2)}`;
  const hit = inkCache.get(key);
  if (hit) return hit;
  const base = BASE[mat][light ? "light" : "dark"];
  const ox = mat === "coal" ? 1 : 0.85 * smoothstep(160, 520, T);
  const glowA = mat === "coal" ? smoothstep(420, 860, T) * (1 - 0.65 * ash) : smoothstep(440, 740, T);
  const glow = ramp(light ? INK : GLOWD, T);
  const oxide = light ? OXIDE[mat] : OXIDE[mat].map((x) => x * 0.45);
  const vals = base.map((b, i) => {
    const o = mixc(b, oxide.map((x) => x * TONE_OX[i]), ox * (mat === "coal" ? 0 : 1));
    let c = mixc(o, glow.map((x) => Math.min(1, x * TONE_GLOW[i])), glowA);
    if (mat === "coal" && i === 2) c = mixc(c, base[2], 0.75 * ash);
    return rgb(c);
  });
  const out = TOKENS.map((t, i) => [t, vals[i]]).concat([["--anatomy-lit-top", vals[2]], ["--anatomy-lit-shade", vals[5]]]);
  inkCache.set(key, out);
  if (inkCache.size > 4000) inkCache.clear();
  return out;
}
const inkFill = (c, a) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a.toFixed(3)})`;
const tokenStyle = (cols) => TOKENS.map((t, i) => `${t}:${rgb(cols[Math.min(i, cols.length - 1)])}`).join(";");

// A turned part with a capped number of facets (the builder's own lathe picks up to 160).
function lathe(B, id, F, profile, o = {}) {
  const paths = G.solidOf(profile, F, B.P, { smooth: "auto", steps: o.steps || 32 });
  const pts = [];
  for (const [s, r] of profile) for (let i = 0; i < 10; i++) pts.push(framePoint(F, s, (r / Math.cos(Math.PI / 10)) * Math.cos((i / 10) * TAU), (r / Math.cos(Math.PI / 10)) * Math.sin((i / 10) * TAU)));
  let inner = o.inner || "";
  if (o.seams) inner += B.L(o.seams.map(([s, r]) => G.arcOf(F, s, r, B.P)).join(""), { tone: "faint" });
  B.solid(id, paths, shapeOf(pts, { axes: [F.a], edges: [F.a, F.u, F.v] }), { ...o, inner });
}

// ---------------------------------------------------------------- polyhedra (bellows leather)
function polySolid(B, id, pts, faces, o = {}) {
  const V = B.V;
  const c = pts.reduce((s, p) => add(s, p), [0, 0, 0]).map((x) => x / pts.length);
  const scr = pts.map(B.at);
  const info = faces.map((f) => {
    let n = [0, 0, 0];
    for (let i = 0; i < f.length; i++) {
      const a = pts[f[i]], b = pts[f[(i + 1) % f.length]];
      n = add(n, [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]);
    }
    const fc = f.reduce((s, i) => add(s, pts[i]), [0, 0, 0]).map((x) => x / f.length);
    const l = len(n);
    if (l < 1e-9) return { f, n: [0, 0, 0], vis: false, flat: true };
    n = mul(n, 1 / l);
    if (dot(n, sub(fc, c)) < 0) n = mul(n, -1);
    return { f, n, vis: dot(n, V) > 1e-6 };
  });
  const edges = new Map();
  info.forEach((F, fi) => {
    if (F.flat) return;
    F.f.forEach((a, i) => {
      const b = F.f[(i + 1) % F.f.length];
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (!edges.has(key)) edges.set(key, []);
      edges.get(key).push(fi);
    });
  });
  const outline = [], crease = [];
  for (const [key, fs] of edges) {
    const [a, b] = key.split("_").map(Number);
    const v0 = info[fs[0]].vis, v1 = fs.length > 1 ? info[fs[1]].vis : false;
    if (v0 !== v1) outline.push(k.pathOf([scr[a], scr[b]]));
    else if (v0 && v1 && dot(info[fs[0]].n, info[fs[1]].n) < 0.86) crease.push(k.pathOf([scr[a], scr[b]]));
  }
  const buckets = [[], [], [], [], []];
  for (const F of info) if (F.vis) buckets[G.toneOf(F.n, B.P)].push(k.pathOf(F.f.map((i) => scr[i]), true));
  const paths = { fill: k.pathOf(G.hullOf(scr), true), outline: outline.join(""), crease: crease.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((l) => l.join("")) };
  const axes = info.filter((F) => !F.flat).map((F) => F.n).slice(0, 10);
  B.solid(id, paths, shapeOf(pts, { axes, edges: o.edges || [XH] }), o);
}
// A loft between two convex rings of equal count (each ring a list of 3D points).
function loft(B, id, ringA, ringB, o) {
  const n = ringA.length;
  const pts = [...ringA, ...ringB];
  const faces = [Array.from({ length: n }, (_, i) => i), Array.from({ length: n }, (_, i) => n + i)];
  for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, n + ((i + 1) % n), n + i]);
  polySolid(B, id, pts, faces, o);
}

// The bellows board: a pear outline in (along, across), hinge at along = 0.
const PEAR = (() => {
  const out = [];
  const L = BELLOWS.L;
  const half = (a) => (a <= 0.6 ? 0.055 + 0.12 * Math.sin((Math.PI / 2) * Math.min(1, a / 0.6)) ** 0.8 : 0.175 * Math.sqrt(Math.max(0, 1 - ((a - 0.6) / (L - 0.6)) ** 2)));
  const along = [0, 0.12, 0.26, 0.42, 0.56, 0.66, 0.74, 0.79, 0.815];
  for (const a of along) out.push([a, -half(a)]);
  out.push([L, 0]);
  for (const a of [...along].reverse()) out.push([a, half(a)]);
  return out.filter((p, i, arr) => i === 0 || Math.hypot(p[0] - arr[i - 1][0], p[1] - arr[i - 1][1]) > 1e-4);
})();
// The leather starts behind the hinge (a = 0.07); a pleat bulges across and toward the back.
const LEATHER = (() => {
  const a0 = 0.07;
  let h = 0.06;
  for (let i = 1; i < PEAR.length; i++) {
    const [p, q] = [PEAR[i - 1], PEAR[i]];
    if (p[1] < 0 && q[1] <= 0 && (p[0] - a0) * (q[0] - a0) <= 0 && q[0] !== p[0]) h = Math.abs(p[1] + ((q[1] - p[1]) * (a0 - p[0])) / (q[0] - p[0]));
  }
  const right = PEAR.filter(([a, c]) => a > a0 && c <= 0);
  const left = PEAR.filter(([a, c]) => a > a0 && c > 0);
  return [[a0, -h], ...right, ...left, [a0, h]];
})();
const scaleRing = (f) => LEATHER.map(([a, c]) => [a + (f - 1) * 0.35 * (a - LEATHER[0][0]), c * f]);

// ---------------------------------------------------------------- machine
const AMMO_SEAL = { iron: 0.85, stone: 0.95, shell: 0.95 };

export default {
  id: "steam-cannon",
  name: "Steam Cannon",
  short: "Steam cannon",
  unit: U,
  view: { W: 1000, H: 640, azimuth: 28, elevation: 21, pad: 22, fit: [w(-0.95, -2.35, -0.25), w(1.35, -2.35, -0.25), w(-0.95, 2.95, -0.25), w(1.35, 2.95, -0.25), w(0, -3.17, 1.1), w(0, -2.9, 2.28), w(0.9, 1.88, 1.65)] },
  target: { kind: "wall", distance: 300, maxRange: 650, height: 9 },
  ammo: [
    { id: "iron", name: "Iron ball", look: "iron", mass: 5.6, radius: 0.0555, cd: 0.47, seal: AMMO_SEAL.iron },
    { id: "stone", name: "Stone ball", look: "stone", mass: 2.3, radius: 0.058, cd: 0.5, seal: AMMO_SEAL.stone },
    { id: "shell", name: "Fire-shell", look: "pot", mass: 1.9, radius: 0.058, cd: 0.56, seal: AMMO_SEAL.shell, fire: true },
  ],
  controls: [
    { id: "bellows", name: "Bellows", min: 6, max: 40, step: 1, value: 26, unit: "/min" },
    { id: "water", name: "Water charge", min: 20, max: 400, step: 10, value: 140, unit: "g" },
    { id: "elev", name: "Elevation", min: ELEV[0], max: ELEV[1], step: 0.5, value: 20, unit: "°", digits: 1 },
    { id: "distance", name: "Wall distance", min: 100, max: 600, step: 10, value: 300, unit: "m" },
  ],
  actions: [
    { id: "heat", name: "Heat", key: "h", hold: true },
    { id: "load", name: "Load", key: "l" },
    { id: "fire", name: "Fire", key: " ", primary: true },
  ],
  toggles: [
    { id: "cut", name: "Cutaway" },
    { id: "strobe", name: "Strobe" },
  ],
  focus: [
    { id: "breech", name: "Breech" },
    { id: "brazier", name: "Brazier" },
    { id: "bellows", name: "Bellows" },
    { id: "valve", name: "Valve & reservoir" },
    { id: "barrel", name: "Barrel" },
    { id: "carriage", name: "Carriage" },
  ],
  phases: ["rest", "heat", "load", "ready", "valve", "flash", "flight", "impact"],
  hint: "Space · fire   H · heat   L · load",
  tourGap: 10,
  holdShot: true,
  hot: new Map(),

  build(B, M) {
    const mini = !!B.mini;
    if (!mini) {
      B.plinth({ x: -0.95 * S, y: -2.35 * S, w: 2.3 * S, d: 5.3 * S, r: 10 }, { h: 12, foot: 6, ruler: "y", label: { x: 0.5 * S, y: 2.45 * S, w: 44, d: 20, r: 1.5 } });
      B.halo("g.halo", [w(-0.7, -0.95, 0), w(0.7, -0.95, 0), w(0.5, 2.45, 0), w(-0.5, 2.45, 0)], 0, { blur: 6 });
    }
    const car = { mat: "oak", sys: "carriage" };
    // Bracket cheeks: seven convex pieces each, cut to the profile of a stepped carriage.
    const PIECES = [
      [[-0.85, 0.58], [-0.52, 0.58], [-0.52, 0.86], [-0.85, 0.8]],
      [[-0.52, 0.58], [-0.38, 0.58], [-0.38, 0.885], [-0.52, 0.86]],
      [[-0.38, 0.33], [-0.045, 0.33], [-0.045, 0.97], [-0.11, 0.97], [-0.38, 0.885]],
      [[-0.045, 0.33], [0.045, 0.33], [0.045, ZT - 0.042], [-0.045, ZT - 0.042]],
      [[0.045, 0.33], [0.2, 0.33], [0.2, 0.68], [0.11, 0.97], [0.045, 0.97]],
      [[0.2, 0.33], [2.0, 0.33], [2.0, 0.62], [0.2, 0.66]],
      [[2.0, 0.33], [2.45, 0.08], [2.45, 0.34], [2.0, 0.62]],
    ];
    for (const side of [1, -1]) {
      const near = side > 0;
      const x0 = side > 0 ? CHEEK[0] : -CHEEK[1];
      const F = { o: w(x0, 0, 0), a: XH, u: [0, 1, 0], v: [0, 0, 1] };
      PIECES.forEach((poly, i) => {
        const pts = poly.map(([y, z]) => [y * S, z * S]);
        const nails = [];
        const over = i === 5 || i === 2 ? (() => {
          const xs = near ? CHEEK[1] : null;
          if (xs === null) return "";
          const dots = (i === 5 ? [0.35, 0.75, 1.15, 1.55, 1.9] : [-0.3, -0.15]).flatMap((y) => [B.at(w(xs, y, 0.43)), B.at(w(xs, y, i === 5 ? 0.6 : 0.82))]);
          return B.D(dots, { size: 0.55, tone: "hi" });
        })() : "";
        const grain = near ? B.L(k.pathOf([B.at(w(CHEEK[1], poly[0][0] + 0.02, (poly[0][1] + poly[3][1]) / 2)), B.at(w(CHEEK[1], poly[1][0] - 0.02, (poly[1][1] + poly[2][1]) / 2))]), { tone: "faint" }) : "";
        B.prism(`g.cheek${side}.${i}`, F, pts, 0, (CHEEK[1] - CHEEK[0]) * S, { ...car, tone: "mid", cut: near && i >= 2 && i <= 4 ? true : undefined, over, inner: grain });
      });
      // Iron cap square over the trunnion, and its two bolts.
      // Iron cap square strapped over the trunnion, its legs bolted down into the bracket.
      const cq = { mat: "iron", sys: "carriage", tone: "hi", cut: near ? true : undefined };
      B.beam(`g.capsq${side}`, w(side * 0.25, -0.105, ZT + 0.054), w(side * 0.25, 0.105, ZT + 0.054), { w: 0.07 * S, h: 0.024 * S, up: [0, 0, 1], ...cq, nails: [{ s: 0.01 * S, face: "v", x: [-0.5, 0.5] }, { s: 0.2 * S, face: "v", x: [-0.5, 0.5] }] });
      for (const y of [-0.095, 0.095]) B.beam(`g.capleg${side}${y}`, w(side * 0.25, y, ZT), w(side * 0.25, y, ZT + 0.042), { w: 0.07 * S, h: 0.02 * S, up: [0, 1, 0], ...cq, nails: near ? [{ s: 0.021 * S, face: "u", x: 0 }] : [] });
      // Iron trail shoe and a tie strap along the bottom of each cheek.
      B.beam(`g.shoe${side}`, w(side * 0.25, 2.3, 0.03), w(side * 0.25, 2.47, 0.03), { w: 0.11 * S, h: 0.05 * S, up: [0, 0, 1], mat: "iron", sys: "carriage", tone: "hi" });
      // Axle arm beyond each hub, with the linchpin through it.
      B.cyl(`g.arm${side}`, w(side * 0.63, WHEEL.y, WHEEL.z), w(side * 0.68, WHEEL.y, WHEEL.z), 0.032 * S, { mat: "iron", sys: "carriage", cut: near ? true : undefined, faceRing: [{ s: 0.05 * S, r: 0.016 * S }] });
      B.cyl(`g.linch${side}`, w(side * 0.66, WHEEL.y, WHEEL.z + 0.032), w(side * 0.66, WHEEL.y, WHEEL.z + 0.08), 0.008 * S, { mat: "iron", sys: "carriage", cut: near ? true : undefined });
    }
    // Axle-tree under the front of the cheeks.
    B.beam("g.axletree", w(-0.43, WHEEL.y, WHEEL.z), w(0.43, WHEEL.y, WHEEL.z), { w: 0.14 * S, h: 0.16 * S, up: [0, 0, 1], ...car, grain: 1, bands: [{ at: 0.04 * S, w: 0.03 * S }, { at: 0.82 * S, w: 0.03 * S }], bandMat: "iron" });
    // Transoms: front, trail.
    B.beam("g.transomF", w(-CHEEK[0], -0.76, 0.7), w(CHEEK[0], -0.76, 0.7), { w: 0.1 * S, h: 0.16 * S, up: [0, 0, 1], ...car, tone: "mid" });
    B.beam("g.transomT", w(-CHEEK[0], 2.1, 0.43), w(CHEEK[0], 2.1, 0.43), { w: 0.14 * S, h: 0.14 * S, up: [0, 0, 1], ...car, tone: "mid" });
    // The quoin bed between the cheeks.
    B.slab("g.bed", { x: -CHEEK[0] * S, y: BED.y0 * S, w: 2 * CHEEK[0] * S, d: (BED.y1 - BED.y0) * S, r: 0.5 }, BED.z0 * S, (BED.z1 - BED.z0) * S, { mat: "oak", sys: "carriage", tone: "mid", steps: 2, inner: B.L(k.pathOf([B.at(w(0, BED.y0, BED.z1)), B.at(w(0, BED.y1, BED.z1))]), { tone: "faint" }) });
    // Bellows platform across the cheeks, three boards with nail rows.
    [[1.0, 1.38], [1.39, 1.77], [1.78, 2.13]].forEach(([y0, y1], i) => {
      B.slab(`g.board${i}`, { x: -0.42 * S, y: y0 * S, w: 0.84 * S, d: (y1 - y0) * S, r: 0.4 }, 0.62 * S, 0.03 * S, { mat: "wood", sys: "bellows", tone: "mid", steps: 2, over: B.D([w(0.25, (y0 + y1) / 2, 0.65), w(0.25, y0 + 0.05, 0.65), w(-0.25, (y0 + y1) / 2, 0.65)].map(B.at), { size: 0.45, tone: "hi" }) });
    });
    // Lever post on the platform, its fork plates and braces.
    const P0 = BELLOWS.pivot;
    B.beam("g.post", w(0, P0[1], 0.65), w(0, P0[1], P0[2] - 0.08), { w: 0.05 * S, h: 0.07 * S, up: [0, 1, 0], mat: "oak", sys: "bellows", tone: "mid", pegs: [{ s: 0.1 * S, face: "u", x: 0 }] });
    for (const dy of [-0.0425, 0.0425]) B.beam(`g.fork${dy}`, w(0, P0[1] + dy, P0[2] - 0.08), w(0, P0[1] + dy, P0[2] + 0.07), { w: 0.06 * S, h: 0.015 * S, up: [0, 1, 0], mat: "iron", sys: "bellows", tone: "hi" });
    B.cyl("g.pin", w(0, P0[1] - 0.06, P0[2]), w(0, P0[1] + 0.06, P0[2]), 0.009 * S, { mat: "iron", sys: "bellows", faceRing: [{ s: 0, r: 0.005 * S }] });
    B.beam("g.braceF", w(0, P0[1] - 0.035, 0.98), w(0, 1.62, 0.65), { w: 0.035 * S, h: 0.03 * S, up: [0, -1, 1], mat: "oak", sys: "bellows", tone: "mid" });
    B.beam("g.braceB", w(0, P0[1] + 0.035, 0.98), w(0, 2.1, 0.65), { w: 0.035 * S, h: 0.03 * S, up: [0, 1, 1], mat: "oak", sys: "bellows", tone: "mid" });
    // Wind trunk: the iron box-pipe the two nozzles blow into, on saddle blocks across the cheeks.
    B.cyl("g.trunk", w(-0.24, TRUNK.y, TRUNK.z), w(0.24, TRUNK.y, TRUNK.z), TRUNK.r * S, { mat: "iron", sys: "bellows", tone: "hi", faceRing: [{ s: 0.48 * S, r: 0.02 * S }], seams: [0.04 * S, 0.44 * S] });
    for (const side of [1, -1]) B.slab(`g.saddle${side}`, { x: (side * 0.25 - 0.04) * S, y: (TRUNK.y - 0.045) * S, w: 0.08 * S, d: 0.09 * S, r: 0.3 }, 0.62 * S, (TRUNK.z - TRUNK.r - 0.62) * S, { mat: "oak", sys: "bellows", tone: "mid", steps: 2 });
    B.cyl("g.trunkStub", w(0.085, TRUNK.y - TRUNK.r + 0.004, TRUNK.z), w(0.085, TRUNK.y - TRUNK.r - 0.03, TRUNK.z), 0.026 * S, { mat: "iron", sys: "bellows", tone: "hi" });
    this.bake(B, M);
    if (mini) return;
    // Ready tray with three cups, the water cask, and the rammer's chocks.
    B.slab("rack.tray", { x: (RACK.x - 0.13) * S, y: -2.12 * S, w: 0.26 * S, d: 0.56 * S, r: 2 }, 0, 0.04 * S, { mat: "oak", sys: "carriage", tone: "mid", steps: 3, bevel: 0.4, groove: 2.4 });
    RACK.ys.forEach((y, i) => B.ring(`rack.cup${i}`, w(RACK.x, y, 0.04), w(RACK.x, y, 0.055), 0.03 * S, 0.05 * S, { mat: "iron", sys: "carriage" }));
    looks.barrel(B, "cask", w(0.95, -1.18, 0.15), 0.13 * S, { axis: [0, 0, 1], sys: "valve" });
    for (const y of [-1.85, -0.35]) B.slab(`chock${y}`, { x: (RAMMER.x - 0.05) * S, y: (y - 0.04) * S, w: 0.1 * S, d: 0.08 * S, r: 0.5 }, 0, 0.035 * S, { mat: "oak", sys: "carriage", tone: "mid", steps: 2 });
  },

  init(M) {
    const st = { mode: "rest", pump: 0, pumping: false, pressAt: 0, pressed: false, phase: 0, Tb: 40, Tc: TC_BANK, wet: 0, boil: 0, fire: 0, loaded: false, loadedAmmo: 0, load: 0, recoil: 0, runFrom: 0, auto: false, autoHeat: false, sim: null, flight: null, lastT: null, glowT: 0, heatT: 0 };
    // Settle the banked fire and the breech to their idle balance.
    for (let i = 0; i < 400; i++) heatStep(st, M.ctrl || { bellows: 26 }, 30);
    st.fire = 0;
    return st;
  },

  act(M, id, down) {
    const st = M.state;
    if (id === "heat") {
      if (down) {
        if (st.pressed) return;
        st.pressed = true;
        st.pressAt = performance.now();
        st.wasPumping = st.pumping;
        st.pumping = true;
        st.autoHeat = false;
      } else if (st.pressed) {
        st.pressed = false;
        const held = performance.now() - st.pressAt > 350;
        if (held || st.wasPumping) st.pumping = false;
      }
      return;
    }
    if (st.mode === "shot") return;
    if (id === "load") return this.startLoad(M);
    if (id === "fire") {
      if (st.mode === "ready" && st.Tb >= 100 && !st.autoHeat) return this.fire(M);
      st.auto = true;
      if (!st.loaded && st.mode !== "loading") this.startLoad(M);
      if (st.Tb < 100 || st.autoHeat) {
        st.pumping = true;
        st.autoHeat = true;
      }
      if (st.mode === "ready" && !st.autoHeat) this.fire(M);
    }
  },

  startLoad(M) {
    const st = M.state;
    if (st.loaded || st.mode === "loading" || st.mode === "shot") return;
    st.mode = "loading";
    st.load = 0;
    st.runFrom = st.recoil;
    st.loadingAmmo = M.ammoIndex;
    M.setPhase("load");
  },

  onControl(M, id) {
    if (id === "distance") {
      M.def.target.distance = M.ctrl.distance;
      M.range.mount(M.def, M);
    }
    if (id === "elev") {
      M.fx.setOccluders(this.occluders(M));
      // Re-bake at most every 120 ms while the slider moves, and once more when it stops.
      this.bakeWanted = true;
      if (performance.now() - (this.bakedAt || 0) > 120) this.rebake(M);
    }
  },

  onToggle(M, id) {
    if (id === "cut") this.rebake(M);
  },

  // Everything that only changes with the elevation or the cutaway is drawn once as static parts.
  bake(B, M, all = true) {
    const mini = !!B.mini;
    const e = rad(M.ctrl.elev ?? 21);
    const cut = !!(M.toggles && M.toggles.cut) && !mini;
    drawBarrel(B, this.hot, e, cut, mini);
    if (all) drawWheels(B, 0, mini, "g.w");
    if (mini) return;
    if (all) {
      drawBellowsBase(B);
      drawRammer(B, null, e, false, "ramh");
    }
    drawFurnace(B, this.hot, e);
    drawValve(B, e);
    drawQuoin(B, e);
    drawHose(B, e);
  },
  rebake(M) {
    this.bakeWanted = false;
    this.bakedAt = performance.now();
    const B = M.B;
    const was = B.dynamic;
    B.dynamic = false;
    this.bake(B, M, false);
    B.dynamic = was;
    M.scene.seal();
    M.dirty = true;
  },

  fire(M) {
    const st = M.state;
    const ammo = M.def.ammo[st.loadedAmmo];
    const e = rad(M.ctrl.elev);
    const sim = simulateShot({ Tb: st.Tb, wet0: st.wet, mw: M.ctrl.water / 1000, ammo, e });
    sim.Tb0 = st.Tb;
    st.sim = sim;
    st.heard = {};
    st.mode = "shot";
    st.auto = false;
    st.lastT = null;
    st.wet = 0;
    st.loaded = false;
    const marks = [[T_OPEN[0], "valve"]];
    if (sim.tFlash !== null) marks.push([sim.tFlash, "flash"]);
    let T = sim.end;
    if (!sim.stuck) {
      const f = sim.rec.at(sim.tExit);
      const p = bw(e, S_MUZZLE + ammo.radius, 0, 0);
      p[1] += f.yc * S;
      const d = AX(e);
      const vel = add(mul(d, sim.vExit), [0, f.vc, 0]);
      const flight = M.launch({ p, v: vel, t0: sim.tExit, spin: 5, ammo });
      st.flight = flight;
      marks.push([sim.tExit, "muzzle"], [sim.tExit + flight.impact.t, "impact"]);
      T = Math.max(T, sim.tExit + flight.impact.t + 2.4);
    } else {
      M.lastFlight = null;
      M.flight = null;
      st.flight = null;
    }
    M.startShot(T, marks);
    M.setPhase("valve");
  },

  endShot(M) {
    const st = M.state;
    const sim = st.sim;
    if (sim) {
      st.Tb -= sim.Tb0 - (MSKIN * sim.Ts + (MB - MSKIN) * sim.Tk) / MB;
      st.wet = sim.liquidEnd / 1000;
      st.recoil = sim.recoil;
      st.loaded = sim.stuck;
    }
    st.mode = st.loaded ? "ready" : "rest";
    M.setPhase(this.phaseOf(M));
  },

  tour(M) {
    if (M.shot && M.shot.finished) {
      this.endShot(M);
      M.shot = null;
    }
    const st = M.state;
    if (st.mode !== "rest" && st.mode !== "ready") return;
    // The tour keeps the fire up: a breech that has cooled below a dull red is blown again first.
    if (st.Tb < 520) {
      st.pumping = true;
      st.autoHeat = true;
    }
    this.act(M, "fire", true);
  },

  phaseOf(M) {
    const st = M.state;
    if (st.mode === "shot" && M.shot && st.sim) {
      const t = M.shot.t;
      const sim = st.sim;
      if (sim.tFlash === null || t < sim.tFlash) return "valve";
      if (sim.stuck || t < sim.tExit) return "flash";
      return st.flight && t < sim.tExit + st.flight.impact.t ? "flight" : "impact";
    }
    if (st.mode === "loading") return "load";
    if (st.pumping) return "heat";
    if (st.loaded) return "ready";
    return "rest";
  },

  update(M, dt) {
    const st = M.state;
    let moving = false;
    if (this.bakeWanted && performance.now() - (this.bakedAt || 0) > 120) this.rebake(M);
    // Bellows stroke envelope and phase (eased in and out, never popping).
    const want = st.pumping ? 1 : 0;
    const prevPump = st.pump;
    st.pump += (want - st.pump) * (1 - Math.exp(-dt / 0.35));
    if (Math.abs(st.pump - want) < 0.002) st.pump = want;
    if (st.pump > 0.001) {
      st.phase += TAU * (M.ctrl.bellows / 60) * 2.2 * dt;
      moving = true;
    } else if (Math.abs(Math.sin(st.phase)) > 0.002) {
      st.phase += TAU * 0.4 * dt * Math.sign(Math.sin(st.phase) * Math.cos(st.phase) < 0 ? 1 : -1) * 0;
    }
    if (prevPump !== st.pump) moving = true;
    // The fire and the breech (time-lapse).
    {
      const before = st.Tb, cBefore = st.Tc;
      heatStep(st, M.ctrl, dt * (st.mode === "shot" ? 1 : LAPSE));
      if (Math.abs(st.Tb - before) > 0.004 || Math.abs(st.Tc - cBefore) > 0.02 || st.boil > 0) moving = true;
      // Auto-heat stops at a dull red, or wherever this bellows rate can no longer raise the breech.
      const rise = dt > 0 ? (st.Tb - before) / (dt * LAPSE) : 1;
      if (st.autoHeat && (st.Tb >= 560 || (st.Tb > 140 && st.pump > 0.95 && rise < 0.03))) {
        st.autoHeat = false;
        st.pumping = false;
      }
    }
    // Loading: run out, ball up, rammer in, rammer out, rammer home.
    if (st.mode === "loading") {
      const run = st.runFrom > 0.004 ? 1.3 : 0;
      st.load += dt;
      if (st.load >= run + LOAD.total) {
        st.mode = "ready";
        st.loaded = true;
        st.loadedAmmo = st.loadingAmmo;
        st.recoil = 0;
      } else if (st.load < run) st.recoil = st.runFrom * (1 - ease(st.load / run));
      else st.recoil = 0;
      moving = true;
    }
    if (st.mode === "ready" && st.auto && !st.autoHeat && st.Tb >= 100) this.fire(M);
    if (st.mode === "shot" && M.shot) {
      this.shotFx(M, st, M.shot.t);
      if (M.shot.playing && dt > 0) this.shotSounds(M, st, M.shot.t);
      moving = true;
    }
    if (dt > 0) this.sounds(M, st, dt);
    this.fireFx(M, st, dt);
    M.setPhase(this.phaseOf(M));
    return moving;
  },

  // ---------------------------------------------------------------- sound
  sounds(M, st, dt) {
    const sfx = M.sfx;
    if (!sfx) return;
    // A wheeze from each bellows on every stroke; the coals crackle as they are blown.
    const stroke = Math.floor(st.phase / Math.PI);
    if (st.pump > 0.3 && stroke !== st.lastStroke) sfx("pump", { gap: 0.15 });
    st.lastStroke = stroke;
    const glow = smoothstep(450, 900, st.Tc);
    if (Math.random() < dt * (0.4 + 4 * airOf(st, M.ctrl)) * glow) sfx("crackle", { gap: 0.08 });
    if (st.boil > 0 && Math.random() < dt * 1.5) sfx("hiss", { size: 0.6, gain: 0.35, gap: 0.5 });
    if (st.mode === "loading") {
      const run = st.runFrom > 0.004 ? 1.3 : 0;
      const u = st.load - run;
      const heard = (st.loadHeard ||= {});
      if (run && st.load < run && !heard.run) (heard.run = true), sfx("creak", { pitch: 0.6 });
      if (u > LOAD.ram[0] && !heard.ram) (heard.ram = true), sfx("clank", { pitch: 0.7 });
      if (u > LOAD.ram[1] - 0.05 && !heard.seat) (heard.seat = true), sfx("thunk", { pitch: 0.8 });
      if (u > LOAD.home[1] - 0.05 && !heard.home) (heard.home = true), sfx("thud", { pitch: 1.4, gain: 0.3 });
    } else st.loadHeard = null;
  },
  shotSounds(M, st, t) {
    const sfx = M.sfx;
    const sim = st.sim;
    if (!sfx || !sim) return;
    const h = st.heard;
    if (!h.key && t >= 0.05) (h.key = true), sfx("clank", { pitch: 1.2 });
    if (!h.flash && sim.tFlash !== null && t >= sim.tFlash) (h.flash = true), sfx("hiss", { size: sim.stuck ? 2.4 : 0.5, gain: sim.stuck ? 0.6 : 0.7, gap: 0 });
    if (!sim.stuck && !h.bang && t >= sim.tExit) {
      h.bang = true;
      const ke = 0.5 * sim.ammo.mass * sim.vExit * sim.vExit;
      sfx("bang", { gain: clamp(ke / 12000, 0.3, 1.2), gap: 0 });
      sfx("hiss", { size: 2, gain: 0.5, gap: 0 });
    }
    if (!h.creak && !sim.stuck && sim.recoil > 0.04 && t >= sim.tExit + 0.05) (h.creak = true), sfx("creak", { pitch: 0.55 });
    if (!h.close && t >= sim.close) (h.close = true), sfx("clank", { pitch: 1 });
  },

  // ---------------------------------------------------------------- effects
  fireFx(M, st, dt) {
    if (M.calm || dt <= 0) return;
    const e = rad(M.ctrl.elev);
    const air = airOf(st, M.ctrl);
    const off = [0, st.recoil * S, 0];
    const light = document.body.dataset.theme !== "dark";
    const R = Math.random;
    const coalTop = () => add(bw(e, -0.62 + R() * 0.42, (R() - 0.5) * 0.26, -0.06 + R() * 0.05), off);
    // Heat shimmer: thin smoke off the coal bed, more when the fire is blown.
    const glowing = smoothstep(380, 700, st.Tc);
    if (R() < dt * (1.5 + 7 * air) * (0.3 + glowing)) M.fx.emit("smoke", coalTop(), { v: [0, 0, 0.25 * S], spread: 0.06 * S, size: 0.08 * S, grow: 0.42 * S, life: 2.6, alpha: 0.16 + 0.12 * air, buoy: 0.18 * S, drag: 0.9, heat: 0.6 });
    // Embers lift off the coals on every stroke of the bellows.
    if (R() < dt * 26 * air * glowing) M.fx.emit("ember", coalTop(), { v: [(R() - 0.5) * 0.15 * S, (R() - 0.5) * 0.15 * S, (0.5 + R() * 0.7) * S], spread: 0.05 * S, size: 0.014 * S, life: 0.9 + R() * 0.8, heat: 0.75 + 0.25 * R(), buoy: 0.1 * S, drag: 1.4, cool: 0.6 });
    if (R() < dt * 4 * st.pump * glowing * smoothstep(0.6, 0.95, Math.sin(st.phase * 2) ** 2)) M.fx.emit("spark", coalTop(), { n: 2, v: [0, 0, 1.6 * S], spread: 0.6 * S, size: 0.01 * S, life: 0.45, heat: 0.95, grav: 0.4, drag: 0.8 });
    if (!light && R() < dt * 5 * glowing) M.fx.emit("glow", add(bw(e, -0.42, 0, -0.08), off), { size: 0.5 * S, grow: 0.6 * S, life: 0.8, alpha: 0.18 * glowing, heat: clamp((st.Tc - 400) / 900, 0, 1) });
    // Water left in a wet breech boils off through the muzzle.
    if (st.boil > 0 && st.mode !== "shot" && R() < dt * 30) M.fx.emit("steam", add(bw(e, S_MUZZLE + 0.04), off), { v: mul(AX(e), 0.4 * S), spread: 0.08 * S, size: 0.06 * S, grow: 0.3 * S, life: 1.6, alpha: 0.5, buoy: 0.3 * S, drag: 1.2 });
  },

  shotFx(M, st, t) {
    const sim = st.sim;
    const prev = st.lastT;
    st.lastT = t;
    if (M.calm || prev === null || t <= prev || t - prev > 0.25) return;
    const e = rad(M.ctrl.elev);
    const d = AX(e);
    const f = sim.rec.at(t);
    const off = [0, f.yc * S, 0];
    const dtS = t - prev;
    const R = Math.random;
    const muzzle = add(bw(e, S_MUZZLE + 0.02), off);
    // Steam that leaks past the ball runs ahead of it out of the muzzle.
    const leak = f.leak;
    if (leak > 0.01) M.fx.emit("steam", muzzle, { n: Math.min(6, Math.ceil(leak * dtS * 4000)), v: mul(d, (8 + leak * 30) * S * 0.12), spread: 0.3 * S, size: 0.05 * S, grow: 0.4 * S, life: 1.2, alpha: 0.6, buoy: 0.25 * S, drag: 2.5 });
    // The report: the chamber blows down through the muzzle behind the ball.
    if (!sim.stuck && prev < sim.tExit && t >= sim.tExit) {
      const big = clamp(sim.flashed / 120, 0.4, 1.6);
      M.fx.emit("steam", muzzle, { n: Math.round(70 * big), v: mul(d, 9 * S), spread: 3.2 * S, size: 0.12 * S, grow: 0.9 * S * big, life: 2.6, alpha: 0.85, buoy: 0.35 * S, drag: 2.6 });
      M.fx.emit("mist", muzzle, { n: Math.round(26 * big), v: mul(d, 16 * S), spread: 5.5 * S, size: 0.08 * S, grow: 0.5 * S, life: 0.9, alpha: 0.6, drag: 4 });
      M.fx.emit("steam", add(bw(e, S_PIPE, 0, 0.44), off), { n: 10, v: [0, 0, 1.2 * S], spread: 0.6 * S, size: 0.05 * S, grow: 0.3 * S, life: 1.4, alpha: 0.7, buoy: 0.3 * S, drag: 2 });
    }
    if (f.out > 0.002) M.fx.emit("steam", muzzle, { n: Math.min(8, Math.ceil(f.out * dtS * 60)), v: mul(d, clamp(f.out * 6, 1, 12) * S * 0.5), spread: 0.6 * S, size: 0.08 * S, grow: 0.6 * S, life: 2, alpha: 0.65, buoy: 0.3 * S, drag: 2.2 });
    // Steam forced back up the open stopcock bubbles out of the vessel's mouth; joints weep.
    if (f.pipe > 0.002 && R() < 0.8) M.fx.emit("steam", add(bw(e, S_PIPE, 0, 0.44), off), { n: Math.min(4, Math.ceil(f.pipe * dtS * 3000)), v: add(mul(NR(e), 0.9 * S), [0, 0, 0.3 * S]), spread: 0.25 * S, size: 0.04 * S, grow: 0.26 * S, life: 1.2, alpha: 0.6, buoy: 0.35 * S, drag: 1.8 });
    if (f.p > 3 && R() < dtS * 40 * smoothstep(3, 12, f.p)) {
      M.fx.emit("steam", add(bw(e, -0.66, 0.06, 0.07), off), { v: [0.5 * S, 0.4 * S, 0.4 * S], spread: 0.15 * S, size: 0.03 * S, grow: 0.18 * S, life: 0.8, alpha: 0.5, buoy: 0.3 * S, drag: 2.5 });
      M.fx.emit("steam", add(bw(e, S_PIPE, 0.02, 0.15), off), { v: [0.6 * S, 0, 0.3 * S], spread: 0.15 * S, size: 0.03 * S, grow: 0.16 * S, life: 0.7, alpha: 0.5, buoy: 0.3 * S, drag: 2.5 });
    }
    // Water that did not flash keeps boiling off in wisps after the shot.
    if ((sim.stuck || t > sim.tExit) && f.ml > 2 && R() < dtS * 25) M.fx.emit("steam", muzzle, { v: mul(d, 0.5 * S), spread: 0.1 * S, size: 0.05 * S, grow: 0.3 * S, life: 1.5, alpha: 0.45, buoy: 0.3 * S, drag: 1.4 });
    // Dust where the trail shoe drags over the plinth while the carriage runs back.
    if (f.vc > 0.15 && R() < dtS * 60) M.fx.emit("dust", add(w(0, 2.45, 0.02), off), { n: 2, v: [0, 0.3 * S, 0.15 * S], spread: 0.2 * S, size: 0.05 * S, grow: 0.2 * S, life: 0.9, alpha: 0.5, grav: 0.1, drag: 3 });
  },

  // ---------------------------------------------------------------- pose
  pose(M) {
    const st = M.state;
    const e = rad(M.ctrl.elev);
    const pose = { e, yc: st.recoil, handle: 0, ball: null, ram: null, f: null, wheel: 0 };
    if (st.mode === "shot" && M.shot && st.sim) {
      const sim = st.sim;
      const t = M.shot.t;
      const f = sim.rec.at(t);
      pose.f = f;
      pose.yc = f.yc;
      pose.handle = handleTurn(t, sim.close);
      const ammo = sim.ammo;
      if (sim.stuck || t < sim.tExit) pose.ball = { s: S_SEAT + ammo.radius + f.x, ammo, inBore: true };
    } else if (st.mode === "loading") {
      const run = st.runFrom > 0.004 ? 1.3 : 0;
      const u = st.load - run;
      const ammo = M.def.ammo[st.loadingAmmo];
      Object.assign(pose, loadPose(u, ammo, e));
    } else if (st.loaded) {
      const ammo = M.def.ammo[st.loadedAmmo];
      pose.ball = { s: S_SEAT + ammo.radius, ammo, inBore: true };
    }
    pose.wheel = -pose.yc / WHEEL.R;
    return pose;
  },

  draw(B, M) {
    if (B.mini) return;
    const st = M.state;
    const pose = this.pose(M);
    const e = pose.e;
    const cut = !!M.toggles.cut;
    B.keep("key", [e.toFixed(4), pose.handle.toFixed(3)], () => drawKey(B, e, pose.handle));
    // The lever rocks through the same poses stroke after stroke: each 1° pose is built once per builder.
    const q = Math.round(bellowsAngle(st) / BELLOWS.step);
    this.posed(M, B, "bellows", q, () => drawBellows(B, q * BELLOWS.step));
    // The rammer has a static copy on its chocks; only while it moves is a live copy drawn.
    const away = !!pose.ram;
    if (away) B.keep("rammer", [pose.ram.map((x) => x.toFixed(4)).join(), e.toFixed(4), cut], () => drawRammer(B, pose.ram, e, cut, "ram"));
    const shownAmmo = st.mode === "loading" ? st.loadingAmmo : st.loaded ? st.loadedAmmo : -1;
    B.keep("rack", [M.ammoIndex, shownAmmo, st.mode], () => drawRack(B, M, shownAmmo, st.mode === "loading" || st.loaded));
    drawBall(B, M, pose, cut);
    if (cut) drawInterior(B, M, pose);
    if (M.toggles.strobe && st.sim && M.shot) drawStrobe(B, M, st.sim, M.shot.t, e);
    this.paint(M, pose, away);
  },

  // A many-entry memo of the parts a block emits, keyed by a quantized pose.
  posed(M, B, name, q, fn) {
    if (!B.dynamic) return fn();
    if (!this.poses || this.poses.B !== B) this.poses = { B, map: new Map() };
    const key = name + q;
    const hit = this.poses.map.get(key);
    const scene = M.scene;
    if (hit) {
      for (const part of hit) scene.put(part);
      return;
    }
    const list = [];
    const put = scene.put;
    scene.put = (part) => {
      list.push(part);
      put.call(scene, part);
    };
    try {
      fn();
    } finally {
      scene.put = put;
    }
    this.poses.map.set(key, list);
  },

  // Live inks and the recoil, written straight onto the parts' own groups (no geometry rebuilt).
  paint(M, pose, away = false) {
    const st = M.state;
    const light = document.body.dataset.theme !== "dark";
    const Tmetal = shotTemp(st, pose.f);
    const air = airOf(st, M.ctrl);
    const stroke = st.pump * (0.5 + 0.5 * Math.sin(st.phase * 2));
    for (const [id, spec] of this.hot) {
      const p = M.scene.parts.get(id);
      if (!p) continue;
      let T, ash = 0;
      if (spec.kind === "coal") {
        const local = st.Tc * spec.f + (st.Tc - 300) * 0.12 * (spec.seed - 0.5);
        T = Math.round((local + 60 * stroke * spec.f * smoothstep(500, 900, st.Tc)) / 6) * 6;
        ash = clamp(spec.ash * (1 - 0.8 * air), 0, 1);
        ash = Math.round(ash * 10) / 10;
      } else if (spec.kind === "grate") T = Math.round((TA + (st.Tc - TA) * 0.72 * spec.f) / 6) * 6;
      else T = Math.round((TA + (Tmetal - TA) * spec.f) / 4) * 4;
      const key = `${T}|${light}|${ash}`;
      if (p.el.__ink === key) continue;
      p.el.__ink = key;
      for (const [name, value] of hotTokens(spec.mat, T, light, ash)) p.el.style.setProperty(name, value);
    }
    const at0 = M.B.at([0, 0, 0]);
    const [ox, oy] = sub(M.B.at(w(0, pose.yc, 0)), at0);
    const tr = Math.abs(pose.yc) < 1e-5 ? "" : `translate(${ox.toFixed(2)} ${oy.toFixed(2)})`;
    // A rolling wheel: its felloes and spokes lie in the wheel's plane, so turning it about the axle
    // is one affine map on screen, L = A·R(φ)·A⁻¹ with A the screen images of ŷ and ẑ.
    const spin = {};
    if (Math.abs(pose.wheel) > 1e-5) {
      const a = sub(M.B.at([0, 1, 0]), at0), b = sub(M.B.at([0, 0, 1]), at0);
      const det = a[0] * b[1] - b[0] * a[1];
      const c = Math.cos(pose.wheel), sn = Math.sin(pose.wheel);
      const AR = [[a[0] * c + b[0] * sn, -a[0] * sn + b[0] * c], [a[1] * c + b[1] * sn, -a[1] * sn + b[1] * c]];
      const iv = [[b[1] / det, -b[0] / det], [-a[1] / det, a[0] / det]];
      const L = [[AR[0][0] * iv[0][0] + AR[0][1] * iv[1][0], AR[0][0] * iv[0][1] + AR[0][1] * iv[1][1]], [AR[1][0] * iv[0][0] + AR[1][1] * iv[1][0], AR[1][0] * iv[0][1] + AR[1][1] * iv[1][1]]];
      for (const side of [1, -1]) {
        const cc = M.B.at(w(side * WHEEL.x, WHEEL.y, WHEEL.z));
        const ex = cc[0] - (L[0][0] * cc[0] + L[0][1] * cc[1]) + ox, ey = cc[1] - (L[1][0] * cc[0] + L[1][1] * cc[1]) + oy;
        spin[side] = `matrix(${L[0][0].toFixed(5)} ${L[1][0].toFixed(5)} ${L[0][1].toFixed(5)} ${L[1][1].toFixed(5)} ${ex.toFixed(2)} ${ey.toFixed(2)})`;
      }
    }
    for (const p of M.scene.parts.values()) {
      const id = p.id;
      const hide = away && id.startsWith("ramh.");
      if (!!p.el.__hid !== hide) {
        p.el.__hid = hide;
        p.el.style.display = hide || p.hidden ? "none" : "";
      }
      if (id.charCodeAt(0) !== 103 || id.charCodeAt(1) !== 46) continue;
      let t = tr;
      if (spin[1] && id.charCodeAt(2) === 119 && /.(rim|tyre|spoke)d/.test(id)) t = id.startsWith("g.w1.") ? spin[1] : spin[-1];
      if (p.el.__tr === t) continue;
      p.el.__tr = t;
      if (t) p.el.setAttribute("transform", t);
      else p.el.removeAttribute("transform");
    }
  },

  occluders(M) {
    const e = rad(M.ctrl.elev);
    const box = (pts) => {
      const ws = pts.map((p) => W(p));
      return { min: [0, 1, 2].map((i) => Math.min(...ws.map((p) => p[i]))), max: [0, 1, 2].map((i) => Math.max(...ws.map((p) => p[i]))) };
    };
    const corners = (s0, s1, x, n0, n1) => [s0, s1].flatMap((s) => [-x, x].flatMap((xx) => [n0, n1].map((nn) => bp(e, s, xx, nn))));
    return [box(corners(-0.66, -0.16, 0.17, -0.29, -0.12)), box(corners(-0.7, -0.2, 0.08, -0.08, 0.06)), box(corners(-0.2, 0.6, 0.07, -0.07, 0.05))];
  },

  readouts(M) {
    const st = M.state;
    const sim = st.sim;
    const rows = [];
    const shot = st.mode === "shot" && M.shot && sim;
    const f = shot ? sim.rec.at(M.shot.t) : null;
    const T = shotTemp(st, f);
    const mm = Math.floor(st.fire / 60), ss = Math.floor(st.fire % 60);
    rows.push(["Breech", fmtInt(T), "°C"], ["Coals", fmtInt(st.Tc), "°C"], ["Fire time", `${mm}:${String(ss).padStart(2, "0")}`, "min"], ["Bellows", st.pump > 0.05 ? fmtInt(M.ctrl.bellows) : "idle", st.pump > 0.05 ? "/min" : ""]);
    rows.push(["Heat above 100 °C", fmtInt((MB * CB * Math.max(0, T - 100)) / 1000), "kJ"], ["Water charge", fmtInt(M.ctrl.water), "g"], ["To flash it", fmtInt((M.ctrl.water * qFlash(180)) / 1e6), "kJ"]);
    const inBore = f && !sim.stuck && M.shot.t < sim.tExit;
    if (f) rows.push(["Pressure", fmt(f.p, 1), "bar"], ["Steam formed", fmtInt(f.flashed), "g"], ["Water lying", fmtInt(f.ml), "g"], ["Ball in bore", inBore ? fmt(f.v, 1) : sim.stuck ? "seated" : "out", inBore ? "m/s" : ""], ["Recoil", fmt(f.yc * 100, 0), "cm"]);
    if (sim && !inBore) rows.push(["Peak pressure", fmt(sim.pk, 1), "bar"], ["Steam on ball", fmtInt(sim.flashedExit), "g"], ["Unflashed at muzzle", fmtInt(sim.unflashed), "g"], ["Muzzle velocity", sim.stuck ? "hang fire" : fmt(sim.vExit, 1), sim.stuck ? "" : "m/s"]);
    if (sim && !f) rows.push(["Recoil", fmt(sim.recoil * 100, 0), "cm"]);
    if (st.wet > 0.0005) rows.push(["Water in breech", fmtInt(st.wet * 1000), "g"]);
    return rows;
  },

  simulateShot,
  heatStep,
};

const shotTemp = (st, f) => (f && st.sim ? st.Tb - (st.sim.Tb0 - (MSKIN * f.Ts + (MB - MSKIN) * f.Tk) / MB) : st.Tb);

// ---------------------------------------------------------------- loading choreography
const LOAD = { ball: [0, 0.8], mouth: [0.8, 1.05], ramIn: [0.25, 1.25], ram: [1.25, 2.6], out: [2.6, 3.4], home: [3.4, 4.2], total: 4.25 };
const span = (u, [a, b]) => clamp((u - a) / (b - a), 0, 1);
// The rammer lies on two chocks beside the carriage, head toward the wheels.
function rammerHome() {
  return { head: [RAMMER.x, -0.32, RAMMER.z], dir: [0, -1, 0] };
}
function loadPose(u, ammo, e) {
  const d = AX(e);
  const r = ammo.radius;
  const sOut = S_MUZZLE + r + 0.03;
  const sIn = S_MUZZLE - r - 0.01;
  const sSeat = S_SEAT + r;
  const cup = [RACK.x, RACK.ys[["iron", "stone", "shell"].indexOf(ammo.id)], RACK.z + r];
  let ball;
  if (u < LOAD.ball[1]) {
    // Lifted from its cup in an arc that stays in front of the wheel.
    const q = ease(span(u, LOAD.ball));
    const target = bp(e, sOut);
    const ctrl = [0.9, -1.9, 1.5];
    ball = { p: [0, 1, 2].map((i) => (1 - q) * (1 - q) * cup[i] + 2 * (1 - q) * q * ctrl[i] + q * q * target[i]), inBore: false, ammo };
  } else if (u < LOAD.ram[0]) ball = { s: sOut + (sIn - sOut) * ease(span(u, LOAD.mouth)), inBore: true, ammo };
  else ball = { s: sIn + (sSeat - sIn) * ease(span(u, LOAD.ram)), inBore: true, ammo };
  // The rammer: off its chocks, round in front of the wheel, aligned with the bore, in, out, home.
  const home = rammerHome();
  const ahead = (s) => ({ head: bp(e, s), dir: d });
  const mouth = S_MUZZLE + 0.04;
  const touch = Math.min(mouth, ball.inBore ? ball.s + r + 0.005 : mouth);
  let ram;
  if (u < LOAD.ramIn[1]) ram = swingRam(home, ahead(mouth), ease(span(u, LOAD.ramIn)));
  else if (u < LOAD.ram[1]) ram = ahead(touch);
  else if (u < LOAD.out[1]) ram = ahead(touch + (mouth - touch) * ease(span(u, LOAD.out)));
  else ram = swingRam(home, ahead(mouth), 1 - ease(span(u, LOAD.home)));
  return { ball, ram: [...ram.head, ...ram.dir] };
}
function swingRam(a, b, q) {
  const c = [1.2, -1.9, 1.2];
  const head = [0, 1, 2].map((i) => (1 - q) * (1 - q) * a.head[i] + 2 * (1 - q) * q * c[i] + q * q * b.head[i]);
  return { head, dir: unit(add(lerp(a.dir, b.dir, q), [0, 0, Math.sin(Math.PI * q) * 0.9])) };
}

// ---------------------------------------------------------------- the barrel
// Bands along the bore: [s0, s1, profile r(s) as [[ds, r(, smooth)]], mat, heat factor, sys, cut?]
const BANDS = [
  [-0.765, -0.705, [[0, 0.028], [0.06, 0.028]], "copper", 0.6, "breech"],
  [-0.705, -0.675, [[0, 0.05], [0.012, 0.075, 1], [0.03, 0.088]], "copper", 0.75, "breech"],
  [-0.675, -0.645, [[0, 0.096], [0.03, 0.096]], "copper", 0.85, "breech"],
  [-0.645, -0.615, [[0, 0.088], [0.03, 0.088]], "copper", 0.95, "breech"],
  [-0.615, -0.585, [[0, 0.096], [0.03, 0.096]], "iron", 0.9, "brazier"],
  [-0.585, -0.275, [[0, 0.088], [0.31, 0.088]], "copper", 1, "breech"],
  [-0.275, -0.245, [[0, 0.096], [0.03, 0.096]], "iron", 0.85, "brazier"],
  [-0.245, -0.2, [[0, 0.088], [0.045, 0.088]], "copper", 0.88, "breech"],
  [-0.2, -0.175, [[0, 0.094], [0.025, 0.094]], "copper", 0.7, "breech"],
  [-0.175, 0.12, [[0, 0.082], [0.295, 0.082]], "copper", 0.35, "barrel"],
  [0.12, 0.15, [[0, 0.088], [0.03, 0.088]], "copper", 0.22, "barrel"],
  [0.15, 0.62, [[0, 0.078], [0.47, 0.0745]], "copper", 0.12, "barrel"],
  [0.62, 0.65, [[0, 0.08], [0.03, 0.08]], "copper", 0.08, "barrel"],
  [0.65, 1.12, [[0, 0.0735], [0.47, 0.07]], "copper", 0.05, "barrel"],
  [1.12, 1.16, [[0, 0.068], [0.04, 0.068]], "copper", 0.04, "barrel"],
  [1.16, 1.3, [[0, 0.072], [0.06, 0.084, 1], [0.12, 0.086, 1], [0.14, 0.084]], "copper", 0.04, "barrel"],
];
function drawBarrel(B, hot, e, cut, mini) {
  const d = AX(e);
  for (const [i, [s0, s1, prof, mat, f, sys]] of BANDS.entries()) {
    if (mini && (s1 - s0 < 0.05)) continue;
    const id = `g.b${i}`;
    const F = BF(e, s0);
    const seams = mat === "iron" && !mini ? undefined : undefined;
    if (prof.length === 2 && prof[0][1] === prof[1][1]) B.cyl(id, bw(e, s0), bw(e, s1), prof[0][1] * S, { F, mat, sys, cut: true, tone: "hi", steps: 32 });
    else lathe(B, id, F, prof.map(([ds, r, sm]) => (sm ? [ds * S, r * S, 1] : [ds * S, r * S])), { mat, sys, cut: true, tone: "hi" });
    hot.set(id, { kind: "metal", mat, f });
    if (cut) halfShell(B, hot, `g.bh${i}`, e, s0, s1, prof, mat, f, sys);
  }
  // Cascabel knob.
  B.ball("g.knob", bw(e, -0.8), 0.045 * S, { mat: "copper", sys: "breech", tone: "hi" });
  hot.set("g.knob", { kind: "metal", mat: "copper", f: 0.5 });
  // Trunnions with their rimbases.
  for (const side of [1, -1]) {
    const near = side > 0;
    B.cyl(`g.rimbase${side}`, bw(e, 0, side * 0.066), bw(e, 0, side * 0.1), 0.058 * S, { mat: "copper", sys: "barrel", cut: near ? true : undefined, F: { o: bw(e, 0, side * 0.066), a: [side, 0, 0], u: d, v: NR(e) } });
    B.cyl(`g.trunnion${side}`, bw(e, 0, side * 0.1), bw(e, 0, side * 0.31), 0.042 * S, { mat: "copper", sys: "barrel", cut: near ? true : undefined, faceRing: [{ s: 0.21 * S, r: 0.026 * S }] });
    hot.set(`g.rimbase${side}`, { kind: "metal", mat: "copper", f: 0.3 });
    hot.set(`g.trunnion${side}`, { kind: "metal", mat: "copper", f: 0.25 });
  }
}
// The far half of a band, cut along the plane that holds the bore axis and faces the viewer.
function halfShell(B, hot, id, e, s0, s1, prof, mat, f, sys) {
  const d = AX(e), n = NR(e);
  const V = B.V;
  const ca = Math.atan2(dot(V, n), dot(V, XH));
  const rOut = prof.reduce((m, p) => Math.max(m, p[1]), 0);
  const solidEnd = s1 <= S_BREECH + 1e-6;
  const rIn = solidEnd ? 0 : s0 < S_BREECH ? 0 : RB;
  const N = solidEnd || rIn === 0 ? 1 : 9;
  const F = BF(e, s0);
  if (rIn === 0) {
    const poly = [];
    for (let j = 0; j <= 12; j++) {
      const a = ca + Math.PI / 2 + (j / 12) * Math.PI;
      poly.push([Math.cos(a) * rOut * S, Math.sin(a) * rOut * S]);
    }
    B.prism(`${id}`, F, poly, 0, (s1 - s0) * S, { mat, sys, tone: "hi" });
    hot.set(id, { kind: "metal", mat, f });
    return;
  }
  for (let j = 0; j < N; j++) {
    const a0 = ca + Math.PI / 2 + (j / N) * Math.PI;
    const a1 = ca + Math.PI / 2 + ((j + 1) / N) * Math.PI;
    const poly = [[Math.cos(a0) * rIn, Math.sin(a0) * rIn], [Math.cos(a0) * rOut, Math.sin(a0) * rOut], [Math.cos(a1) * rOut, Math.sin(a1) * rOut], [Math.cos(a1) * rIn, Math.sin(a1) * rIn]].map(([x, y]) => [x * S, y * S]);
    B.prism(`${id}.${j}`, F, poly, 0, (s1 - s0) * S, { mat, sys, tone: "hi" });
    hot.set(`${id}.${j}`, { kind: "metal", mat, f });
  }
}

// ---------------------------------------------------------------- the fire-cage and its coals
function drawFurnace(B, hot, e) {
  const d = AX(e), n = NR(e);
  const ir = { mat: "iron", sys: "brazier", tone: "hi" };
  const bar = (id, a, b, wdt, up, o = {}) => B.beam(id, W(a), W(b), { w: wdt * S, h: wdt * S, up, ...ir, ...o });
  const P = (s, x, nn) => bp(e, s, x, nn);
  const S0 = -0.66, S1 = -0.16, X = 0.158, N0 = -0.268, N1 = 0.02;
  // Ash pan.
  B.prism("g.f.pan", BF(e, S0), [[-0.172 * S, -0.29 * S], [0.172 * S, -0.29 * S], [0.172 * S, N0 * S], [-0.172 * S, N0 * S]], 0, (S1 - S0) * S, { ...ir, tone: "mid", over: B.D([P(S0 + 0.03, 0.17, -0.279), P(S1 - 0.03, 0.17, -0.279)].map((p) => B.at(W(p))), { size: 0.5, tone: "hi" }) });
  // Corner posts.
  for (const sx of [-1, 1]) for (const ss of [S0 + 0.012, S1 - 0.012]) bar(`g.f.post${sx}${ss.toFixed(2)}`, P(ss, sx * X, N0), P(ss, sx * X, N1 + 0.012), 0.024, d, { cut: sx > 0 ? true : undefined });
  // Side rails at the grate, the middle and the rim; a strap outside each side.
  for (const sx of [-1, 1]) {
    for (const nn of [-0.205, -0.11, -0.01]) bar(`g.f.rail${sx}${nn}`, P(S0 + 0.024, sx * X, nn), P(S1 - 0.024, sx * X, nn), 0.018, n, { cut: sx > 0 ? true : undefined });
    B.beam(`g.f.strap${sx}`, W(P(-0.41, sx * 0.175, N0)), W(P(-0.41, sx * 0.175, N1)), { w: 0.03 * S, h: 0.01 * S, up: [sx, 0, 0], ...ir, cut: sx > 0 ? true : undefined, nails: [{ s: 0.06 * S, face: "v", x: 0 }, { s: 0.15 * S, face: "v", x: 0 }, { s: 0.25 * S, face: "v", x: 0 }] });
  }
  // Front and back walls: a rail at the grate, a rail under the breech, bars beside it.
  for (const [tag, ss] of [["F", S1 - 0.012], ["K", S0 + 0.012]]) {
    bar(`g.f.wall${tag}0`, P(ss, -X + 0.012, -0.205), P(ss, X - 0.012, -0.205), 0.018, n);
    bar(`g.f.wall${tag}1`, P(ss, -X + 0.012, -0.118), P(ss, X - 0.012, -0.118), 0.018, n);
    for (const sx of [-1, 1]) {
      bar(`g.f.wall${tag}v${sx}`, P(ss, sx * 0.112, -0.109), P(ss, sx * 0.112, N1 + 0.006), 0.016, d, { cut: sx > 0 && tag === "F" ? true : undefined });
      bar(`g.f.wall${tag}w${sx}`, P(ss, sx * 0.08, N0), P(ss, sx * 0.08, -0.214), 0.016, d);
    }
  }
  // Grate bars.
  [-0.125, -0.075, -0.025, 0.025, 0.075, 0.125].forEach((x, i) => {
    bar(`g.f.grate${i}`, P(S0 + 0.024, x, -0.214), P(S1 - 0.024, x, -0.214), 0.016, n);
    hot.set(`g.f.grate${i}`, { kind: "grate", mat: "iron", f: 1 });
  });
  // Hanger straps from the breech rings out to the side rims.
  for (const s of [-0.6, -0.26]) for (const sx of [-1, 1]) B.beam(`g.f.hang${s}${sx}`, W(P(s, sx * 0.096, -0.002)), W(P(s, sx * (X - 0.009), -0.002)), { w: 0.026 * S, h: 0.012 * S, up: n, ...ir, cut: sx > 0 ? true : undefined, nails: [{ s: 0.04 * S, face: "v", x: 0 }] });
  // Lug and its brackets under the pan: it rides the quoin.
  B.cyl("g.f.lug", W(P(LUG.s, -0.1, LUG.nn)), W(P(LUG.s, 0.1, LUG.nn)), LUG.r * S, { mat: "iron", sys: "carriage", tone: "hi" });
  for (const sx of [-1, 1]) B.prism(`g.f.lugb${sx}`, { o: W(P(LUG.s, sx * 0.1, 0)), a: [sx, 0, 0], u: d, v: n }, [[-0.03 * S, -0.29 * S], [0.03 * S, -0.29 * S], [0.012 * S, LUG.nn * S], [-0.012 * S, LUG.nn * S]], 0, 0.012 * S, { ...ir, tone: "mid" });
  // Tuyere stub through the back wall, below the grate.
  B.cyl("g.f.tuyere", W(P(S0, 0.085, -0.24)), W(P(S0 - 0.05, 0.085, -0.24)), 0.026 * S, { ...ir, sys: "bellows", faceRing: [{ s: 0.05 * S, r: 0.015 * S }] });
  drawCoals(B, hot, e);
}

// Charcoal lumps on the grate, heaped against the sides, clear of the breech.
const COALS = (() => {
  const R = rng(11);
  const out = [];
  const tries = 900;
  for (let i = 0; i < tries && out.length < 46; i++) {
    const l = 0.04 + R() * 0.035, wd = 0.026 + R() * 0.02, h = 0.022 + R() * 0.016;
    const rb = 0.5 * Math.hypot(l, wd, h);
    const x = (R() * 2 - 1) * (0.143 - rb);
    const s = -0.64 + rb + R() * (0.46 - 2 * rb);
    const top = -0.13 + 0.12 * Math.min(1, Math.abs(x) / 0.13) ** 1.5;
    const nn = -0.2 + rb * 0.7 + R() * (top + 0.2 - rb);
    if (nn - rb * 0.6 < -0.205 || nn > top) continue;
    if (Math.hypot(x, nn) - rb < 0.1) continue;
    if (out.some((c) => Math.hypot(c.s - s, c.x - x, c.nn - nn) < 0.86 * (c.rb + rb))) continue;
    const yaw = R() * Math.PI, pitch = (R() - 0.5) * 0.7;
    out.push({ s, x, nn, l, wd, h, rb, yaw, pitch, seed: R(), ash: 0.25 + R() * 0.75, f: 0.86 + R() * 0.2 - 0.08 * Math.abs(x) / 0.14 + (nn < -0.1 ? 0.05 : 0) });
  }
  return out;
})();
function drawCoals(B, hot, e) {
  const d = AX(e), n = NR(e);
  COALS.forEach((c, i) => {
    const dir = unit(add(add(mul(d, Math.cos(c.yaw) * Math.cos(c.pitch)), mul(XH, Math.sin(c.yaw) * Math.cos(c.pitch))), mul(n, Math.sin(c.pitch))));
    const up = unit(cross(dir, cross(n, dir)));
    const ctr = bp(e, c.s, c.x, c.nn);
    const a = add(ctr, mul(dir, -c.l / 2)), b = add(ctr, mul(dir, c.l / 2));
    const id = `g.coal${i}`;
    B.beam(id, W(a), W(b), { w: c.wd * S, h: c.h * S, up: up, mat: "pitch", sys: "brazier", tone: "hi", crease: "none" });
    hot.set(id, { kind: "coal", mat: "coal", f: c.f, seed: c.seed, ash: c.ash });
  });
}

// ---------------------------------------------------------------- water vessel and stopcock
function drawValve(B, e) {
  const d = AX(e), n = NR(e);
  const P = (s, x, nn) => bw(e, s, x, nn);
  const v = { sys: "valve" };
  const Fn = (s, nn, x = 0) => ({ o: P(s, x, nn), a: n, u: XH, v: mul(d, -1) });
  // Boss on the breech, the pipe, the cock's plug and the pipe on to the vessel.
  B.cyl("g.v.boss", P(S_PIPE, 0, 0.084), P(S_PIPE, 0, 0.1), 0.03 * S, { mat: "bronze", ...v, F: Fn(S_PIPE, 0.084) });
  B.cyl("g.v.pipe0", P(S_PIPE, 0, 0.1), P(S_PIPE, 0, 0.126), 0.016 * S, { mat: "bronze", ...v, F: Fn(S_PIPE, 0.1) });
  B.cyl("g.v.plug", P(S_PIPE, -0.036, 0.15), P(S_PIPE, 0.042, 0.15), 0.026 * S, { mat: "bronze", ...v, tone: "hi", faceRing: [{ s: 0.078 * S, r: 0.015 * S }] });
  B.cyl("g.v.pipe1", P(S_PIPE, 0, 0.174), P(S_PIPE, 0, 0.205), 0.016 * S, { mat: "bronze", ...v, F: Fn(S_PIPE, 0.174) });
  B.cyl("g.v.shank", P(S_PIPE, 0.042, 0.15), P(S_PIPE, 0.058, 0.15), 0.011 * S, { mat: "iron", ...v, tone: "hi" });
  // Struts from the hanger rings up to the vessel foot.
  B.beam("g.v.strut0", P(-0.6, 0, 0.096), P(S_PIPE - 0.038, 0, 0.205), { w: 0.016 * S, h: 0.01 * S, up: XH, mat: "iron", ...v });
  B.beam("g.v.strut1", P(-0.26, 0, 0.096), P(S_PIPE + 0.038, 0, 0.205), { w: 0.016 * S, h: 0.01 * S, up: XH, mat: "iron", ...v });
  drawVessel(B, e);
}
// The key: a square shank and a lever; closed it lies along the barrel, open it stands up the pipe.
function drawKey(B, e, turn) {
  const d = AX(e), n = NR(e);
  const v = { sys: "valve" };
  const phi = turn * (Math.PI / 2);
  const dir = add(mul(d, -Math.cos(phi)), mul(n, Math.sin(phi)));
  const root = bp(e, S_PIPE, 0.064, 0.15);
  const tip = add(root, mul(dir, 0.12));
  B.beam("g.v.key", W(add(root, mul(dir, -0.012))), W(tip), { w: 0.012 * S, h: 0.018 * S, up: XH, mat: "iron", ...v, tone: "hi", nails: [{ s: 0.012 * S, face: "u", x: 0 }] });
  B.ball("g.v.grip", W(add(tip, mul(dir, 0.01))), 0.015 * S, { mat: "iron", ...v, tone: "hi" });
}
// The bronze vessel, its lid and knob, two loop handles.
function drawVessel(B, e) {
  const d = AX(e), n = NR(e);
  const P = (s, x, nn) => bw(e, s, x, nn);
  const v = { sys: "valve" };
  const F = { o: P(S_PIPE, 0, 0.205), a: n, u: XH, v: mul(d, -1) };
  const prof = [[0, 0.05], [0.02, 0.066, 1], [0.07, 0.083, 1], [0.12, 0.079, 1], [0.16, 0.06, 1], [0.18, 0.048], [0.19, 0.054], [0.205, 0.054]];
  lathe(B, "g.v.vessel", F, prof.map(([s, r, sm]) => (sm ? [s * S, r * S, 1] : [s * S, r * S])), { mat: "bronze", ...v, tone: "hi", seams: [[0.07 * S, 0.083 * S]] });
  const FL = { o: P(S_PIPE, 0, 0.41), a: n, u: XH, v: mul(d, -1) };
  lathe(B, "g.v.lid", FL, [[0, 0.05 * S], [0.008 * S, 0.05 * S], [0.02 * S, 0.034 * S, 1], [0.028 * S, 0.012 * S]], { mat: "bronze", ...v, tone: "hi" });
  B.ball("g.v.knob", P(S_PIPE, 0, 0.444), 0.011 * S, { mat: "bronze", ...v });
  for (const sx of [-1, 1]) B.ring(`g.v.loop${sx}`, P(S_PIPE + 0.006, sx * 0.1, 0.3), P(S_PIPE - 0.006, sx * 0.1, 0.3), 0.012 * S, 0.02 * S, { mat: "bronze", ...v, F: { o: P(S_PIPE + 0.006, sx * 0.1, 0.3), a: mul(d, -1), u: XH, v: n } });
}

// ---------------------------------------------------------------- the quoin
function quoinAt(e) {
  const zL = ZT + LUG.s * Math.sin(e) + (LUG.nn - LUG.r) * Math.cos(e);
  const yL = -LUG.s * Math.cos(e) + (LUG.nn - LUG.r) * Math.sin(e);
  const h = zL - BED.z1;
  const yThin = yL + (h - QUOIN.thin) / QUOIN.slope;
  return { yThin, yThick: yThin - QUOIN.len, yL, zL };
}
function drawQuoin(B, e) {
  const q = quoinAt(e);
  const z0 = BED.z1;
  const poly = [[q.yThick, z0], [q.yThin, z0], [q.yThin, z0 + QUOIN.thin], [q.yThick, z0 + QUOIN.thin + QUOIN.slope * QUOIN.len]].map(([y, z]) => [y * S, z * S]);
  const F = { o: w(-QUOIN.half, 0, 0), a: XH, u: [0, 1, 0], v: [0, 0, 1] };
  const grain = B.L(k.pathOf([B.at(w(QUOIN.half, q.yThick + 0.02, z0 + 0.04)), B.at(w(QUOIN.half, q.yThin - 0.02, z0 + 0.03))]), { tone: "faint" });
  B.prism("g.quoin", F, poly, 0, 2 * QUOIN.half * S, { mat: "oak", sys: "carriage", tone: "hi", inner: grain });
  B.ring("g.quoinGrip", w(0, q.yThin, z0 + 0.035), w(0, q.yThin + 0.012, z0 + 0.035), 0.012 * S, 0.022 * S, { mat: "iron", sys: "carriage", F: { o: w(0, q.yThin, z0 + 0.035), a: [0, 1, 0], u: XH, v: [0, 0, 1] } });
}

// ---------------------------------------------------------------- leather hose, trunk → fire-cage
function drawHose(B, e) {
  const a = [0.085, TRUNK.y - TRUNK.r - 0.03, TRUNK.z];
  const b = bp(e, -0.71, 0.085, -0.24);
  const d = AX(e);
  const a1 = add(a, [0, -0.06, 0]);
  const b1 = add(b, mul(d, -0.06));
  const mid = lerp(a1, b1, 0.5);
  mid[2] -= 0.05;
  B.rope("g.hose", [W(a), W(a1), W(mid), W(b1), W(b)], 0.026 * S, { mat: "hide", sys: "bellows", twist: true, lay: 0, pitch: 0.05 * S, maxLength: 12 });
}

// ---------------------------------------------------------------- bellows and lever
function bellowsAngle(st) {
  return 0.44 * st.pump * Math.sin(st.phase);
}
function drawBellows(B, psi) {
  const P0 = BELLOWS.pivot;
  const lev = { mat: "oak", sys: "bellows", tone: "hi" };
  const rot = (v) => rotate(v, [0, 1, 0], psi);
  const at = (x, z = 0) => add(P0, rot([x, 0, z]));
  // The rocking lever and its grip.
  B.beam("g.lever", W(at(-0.32)), W(at(0.8)), { w: 0.04 * S, h: 0.05 * S, up: rot([0, 0, 1]), ...lev, grain: 1, nails: [{ s: 0.12 * S, face: "-u", x: 0 }, { s: 0.52 * S, face: "-u", x: 0 }] });
  B.cyl("g.grip", W(at(0.8)), W(at(0.96)), 0.02 * S, { mat: "oak", sys: "bellows", tone: "hi", ribs: { count: 10 } });
  BELLOWS.xs.forEach((xc, i) => {
    const side = xc > 0 ? 1 : -1;
    const top = at(side * BELLOWS.arm, -0.02);
    const eyeZ = top[2] - BELLOWS.rod;
    const th = Math.asin(clamp((eyeZ - (BELLOWS.z0 + 0.045)) / BELLOWS.eye, 0.02, 0.4));
    drawOneBellows(B, `g.bl${i}`, xc, th);
    const along = [0, Math.cos(th), Math.sin(th)];
    const nrm = [0, -Math.sin(th), Math.cos(th)];
    const hinge = [xc, BELLOWS.yh, BELLOWS.z0];
    const eye = add(add(hinge, mul(along, BELLOWS.eye)), mul(nrm, 0.045));
    B.cyl(`g.rod${i}`, W(eye), W(top), 0.007 * S, { mat: "iron", sys: "bellows", tone: "hi" });
    B.cyl(`g.rodEye${i}`, W(add(top, [-0.012, 0, 0])), W(add(top, [0.012, 0, 0])), 0.012 * S, { mat: "iron", sys: "bellows", tone: "hi", faceRing: [{ s: 0.024 * S, r: 0.005 * S }] });
  });
}
function drawOneBellows(B, id, xc, th) {
  const sys = "bellows";
  const hinge = [xc, BELLOWS.yh, BELLOWS.z0];
  const along = (t) => [0, Math.cos(t), Math.sin(t)];
  const nrm = (t) => [0, -Math.sin(t), Math.cos(t)];
  const ptOn = (t, a, c, off = 0) => add(add(add(hinge, mul(along(t), a)), [c, 0, 0]), mul(nrm(t), off));
  const pear = PEAR.map(([a, c]) => [a * S, c * S]);
  // Top board, hinged at the nozzle end.
  const tb = 0.025;
  B.prism(`${id}.top`, { o: W(ptOn(th, 0, 0)), a: nrm(th), u: along(th), v: XH }, pear, 0, tb * S, { mat: "oak", sys, tone: "hi", over: B.D([ptOn(th, 0.3, -0.12, tb), ptOn(th, 0.3, 0.12, tb), ptOn(th, 0.62, -0.15, tb), ptOn(th, 0.62, 0.15, tb)].map((p) => B.at(W(p))), { size: 0.5, tone: "hi" }) });
  // Weight stone on the top board, and the iron eye the rod hooks into.
  B.prism(`${id}.weight`, { o: W(ptOn(th, 0.4, 0, tb)), a: nrm(th), u: along(th), v: XH }, polyRect(0.14 * S, 0.12 * S), 0, 0.05 * S, { mat: "granite", sys, tone: "hi" });
  B.cyl(`${id}.eye`, W(ptOn(th, BELLOWS.eye, -0.014, tb + 0.016)), W(ptOn(th, BELLOWS.eye, 0.014, tb + 0.016)), 0.016 * S, { mat: "iron", sys, tone: "hi", faceRing: [{ s: 0.028 * S, r: 0.007 * S }] });
  // Leather pleats between the boards: two folds, each bulging out between two ribs.
  const NF = 2;
  const ringAt = (t, f) => scaleRing(f).map(([a, c]) => W(ptOn(t, a, c)));
  for (let j = 0; j < NF; j++) {
    const t0 = (th * j) / NF, t1 = (th * (j + 0.5)) / NF, t2 = (th * (j + 1)) / NF;
    loft(B, `${id}.pleat${j}a`, ringAt(t0, 0.9), ringAt(t1, 1.1), { mat: "hide", sys, tone: "hi" });
    loft(B, `${id}.pleat${j}b`, ringAt(t1, 1.1), ringAt(t2, 0.9), { mat: "hide", sys, tone: "hi" });
  }
}
// The parts of the bellows that never move: bottom boards on the platform and the iron nozzles.
function drawBellowsBase(B) {
  const sys = "bellows";
  const pear = PEAR.map(([a, c]) => [a * S, c * S]);
  BELLOWS.xs.forEach((xc, i) => {
    const hinge = [xc, BELLOWS.yh, BELLOWS.z0];
    B.prism(`g.blb${i}.bottom`, { o: W(add(hinge, [0, 0, -0.025])), a: [0, 0, 1], u: [0, 1, 0], v: XH }, pear, 0, 0.025 * S, { mat: "oak", sys, tone: "mid", over: B.D([[0.3, -0.12], [0.3, 0.12], [0.62, 0.15], [0.62, -0.15]].map(([a, c]) => B.at(W(add(hinge, [c, a, 0])))), { size: 0.45, tone: "hi" }) });
    B.turned(`g.blb${i}.nozzle`, { o: w(xc, BELLOWS.yh, TRUNK.z), a: [0, -1, 0], u: XH, v: [0, 0, 1] }, [[0, 0.03 * S], [0.04 * S, 0.026 * S, 1], [0.1 * S, 0.018 * S, 1], [(BELLOWS.yh - TRUNK.y - TRUNK.r) * S, 0.015 * S]], { mat: "iron", sys, tone: "hi" });
  });
}

// ---------------------------------------------------------------- wheels
function drawWheels(B, phase, mini, base) {
  for (const side of [1, -1]) {
    const near = side > 0;
    const F = { o: w(side * WHEEL.x, WHEEL.y, WHEEL.z), a: [side, 0, 0], u: [0, 1, 0], v: [0, 0, 1] };
    const ph = side > 0 ? phase : -phase;
    B.wheel(`${base}${side}`, F, { R: WHEEL.R * S, rim: 0.075 * S, width: 0.07 * S, spokes: 8, hub: 0.085 * S, hubLen: 0.2 * S, phase: ph, segments: mini ? 10 : near ? 16 : 12, spokeW: 0.04 * S, mat: "oak", sys: "carriage", tyre: mini || !near ? 0 : 0.012 * S, cut: near ? true : undefined });
  }
}

// ---------------------------------------------------------------- rammer
function drawRammer(B, ram, e, cut, base) {
  let head, dir;
  if (!ram) ({ head, dir } = rammerHome());
  else {
    head = ram.slice(0, 3);
    dir = ram.slice(3, 6);
  }
  const o = { sys: "carriage" };
  const back = add(head, mul(dir, RAMMER.head));
  const ferr = add(back, mul(dir, 0.03));
  const end = add(ferr, mul(dir, RAMMER.pole));
  // Inside the bore only the part beyond the muzzle shows, unless the barrel is cut open.
  const d = AX(e);
  const sOf = (p) => dot(sub(p, [0, 0, ZT]), d);
  const inBore = ram && sOf(head) < S_MUZZLE + 0.002 && Math.abs(dot(dir, d) - 1) < 1e-3;
  const id = inBore ? "g.ram" : base;
  if (!inBore || cut) {
    B.cyl(`${id}.head`, W(head), W(back), RAMMER.rh * S, { mat: "oak", ...o, tone: "hi", faceRing: [{ s: 0, r: RAMMER.rh * 0.6 * S }] });
    B.cyl(`${id}.ferrule`, W(back), W(ferr), 0.026 * S, { mat: "iron", ...o, tone: "hi" });
    B.cyl(`${id}.pole`, W(ferr), W(end), RAMMER.r * S, { mat: "oak", ...o, tone: "hi" });
  } else {
    const t = (S_MUZZLE + 0.004 - sOf(ferr)) / RAMMER.pole;
    const from = t > 0 ? add(ferr, mul(dir, t * RAMMER.pole)) : ferr;
    B.cyl(`${id}.pole`, W(from), W(end), RAMMER.r * S, { mat: "oak", ...o, tone: "hi" });
  }
}

// ---------------------------------------------------------------- ammunition
function drawRack(B, M, shown, away) {
  M.def.ammo.forEach((a, i) => {
    if (away && shown === i) return;
    const c = w(RACK.x, RACK.ys[i], RACK.z + a.radius);
    looks.draw(a.look, B, `pile.${a.id}`, c, a.radius * S, { lit: M.ammoIndex === i, seed: 3 + i, axis: [0, 0, 1], wick: true });
  });
}
function drawBall(B, M, pose, cut) {
  const b = pose.ball;
  if (!b) return;
  const a = b.ammo;
  const e = pose.e;
  if (b.inBore) {
    const s = b.s;
    const inside = s < S_MUZZLE + a.radius * 0.2;
    if (inside && !cut) return;
    const c = bw(e, s);
    looks.draw(a.look, B, inside ? "g.ball" : "ball", c, a.radius * S, { seed: 5, axis: AX(e), lit: false, sys: "breech", wick: false });
  } else {
    looks.draw(a.look, B, "ball", W(b.p), a.radius * S, { seed: 5, axis: [0, 0, 1], lit: false, wick: true });
  }
}

// ---------------------------------------------------------------- cutaway contents
function drawInterior(B, M, pose) {
  const st = M.state;
  const e = pose.e;
  const d = AX(e), n = NR(e);
  const light = document.body.dataset.theme !== "dark";
  const f = pose.f;
  // Water lying in the chamber: from the record during a shot, or what a fizzle left behind.
  const ml = f ? f.ml / 1000 : st.wet;
  if (ml > 0.0005) {
    const depth = clamp(Math.sqrt(ml / 1000 / ((S_SEAT - S_BREECH) * 0.09)) * 0.07, 0.006, 0.05);
    const F = BF(e, S_BREECH);
    const half = Math.sqrt(Math.max(0, RB * RB - (RB - depth) ** 2));
    const poly = [[-half * 0.92, -RB + 0.002], [half * 0.92, -RB + 0.002], [half, -RB + depth], [-half, -RB + depth]].map(([x, y]) => [x * S, y * S]);
    const cols = (light ? ["#c3d6e2", "#d3e3ec", "#e2eef4", "#9fbccd", "#adc6d5", "#bad0dc", "#c6d9e3"] : ["#1e2c36", "#24343f", "#2b3e4a", "#151f26", "#19242c", "#1d2a33", "#22303a"]).map(hex);
    const paths = G.prismOf(F, poly, 0.004 * S, (S_SEAT - S_BREECH - 0.004) * S, B.P);
    const pts = [];
    for (const [x, y] of poly) for (const s of [0.004 * S, (S_SEAT - S_BREECH - 0.004) * S]) pts.push(framePoint(F, s, x, y));
    B.raw("g.water", `<g style="${tokenStyle(cols)}">${B.S(paths, { tone: "mid" })}</g>`, shapeOf(pts, { axes: [d, XH, n], edges: [d, XH, n] }), { sys: "valve" });
  }
  // Water falling from the pipe while the cock is open.
  if (f && f.min < M.ctrl.water - 0.5 && M.shot.t > T_OPEN[0] + 0.01) {
    const top = bp(e, S_PIPE, 0, RB);
    const bot = bp(e, S_PIPE, 0, -RB + 0.012);
    B.cyl("g.stream", W(top), W(bot), 0.007 * S, { mat: "lead", sys: "valve", tone: "mid" });
  }
  // Steam behind the ball: a pale column whose density follows the chamber pressure.
  if (f && f.p > 1.15) {
    const sBall = pose.ball ? pose.ball.s - pose.ball.ammo.radius : S_MUZZLE;
    const s1 = Math.min(sBall - 0.002, S_MUZZLE);
    const F = BF(e, S_BREECH + 0.004);
    const L = Math.max(0.01, s1 - S_BREECH - 0.004);
    const paths = G.solidOf([[0, (RB - 0.003) * S], [L * S, (RB - 0.003) * S]], F, B.P, { smooth: "auto", steps: 24 });
    const a = clamp(0.18 + 0.05 * (f.p - 1), 0.18, 0.82);
    const cols = (light ? ["#f2f4f6", "#f6f8f9", "#fbfcfc", "#d9dee3", "#e1e5e9", "#e8ebee", "#eff1f3"] : ["#5a6168", "#626a72", "#6c747c", "#454b51", "#4c5258", "#52595f", "#585f66"]).map(hex);
    const pts = [];
    for (const s of [0, L * S]) for (let j = 0; j < 8; j++) pts.push(framePoint(F, s, Math.cos((j / 8) * TAU) * RB * S, Math.sin((j / 8) * TAU) * RB * S));
    B.raw("g.steam", `<g style="${tokenStyle(cols)};opacity:${a.toFixed(3)}">${B.S(paths, { tone: "lo" })}</g>`, shapeOf(pts, { axes: [d], edges: [d, XH, n] }), { sys: "breech" });
  }
}

// ---------------------------------------------------------------- strobe
function drawStrobe(B, M, sim, now, e) {
  const lines = [];
  const rings = [];
  const r = sim.ammo.radius;
  const t0 = sim.tStart ?? sim.tFlash ?? T_OPEN[1];
  const t1 = Math.min(now, sim.stuck ? sim.end : sim.tExit + 0.02);
  const KS = B.KS;
  for (let t = t0; t <= t1; t += 0.0015) {
    const f = sim.rec.at(t);
    const c = B.at(bw(e, S_SEAT + r + f.x, 0, 0).map((x, i) => x + (i === 1 ? f.yc * S : 0)));
    rings.push(`<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${(r * S * KS * 0.96).toFixed(2)}"/>`);
  }
  // The carriage running back: the cheek's top edge every 60 ms.
  for (let t = sim.tExit ?? 0.4; t <= Math.min(now, sim.end); t += 0.06) {
    const f = sim.rec.at(t);
    if (f.yc < 0.004) continue;
    const pts = [[-0.85, 0.8], [-0.38, 0.885], [-0.11, 0.97], [0.11, 0.97], [0.2, 0.68], [2.0, 0.62], [2.45, 0.34]].map(([y, z]) => B.at(w(M.toggles.cut ? -CHEEK[0] : CHEEK[1], y + f.yc, z)));
    lines.push(k.pathOf(pts));
  }
  // The stopcock key's sweep.
  for (let t = 0; t <= Math.min(now, 0.3); t += 0.03) {
    const phi = handleTurn(t, sim.close) * (Math.PI / 2);
    const dir = add(mul(AX(e), -Math.cos(phi)), mul(NR(e), Math.sin(phi)));
    const root = bp(e, S_PIPE, 0.064, 0.15);
    lines.push(k.pathOf([B.at(W(root)), B.at(W(add(root, mul(dir, 0.13))))]));
  }
  const svg = `<g class="iso-line" data-tone="lit" style="fill:none;stroke:var(--accent);stroke-width:0.9px">${rings.join("")}</g>` + B.L(lines.join(""), { tone: "lo" });
  B.marks("strobe", svg, [w(0, 0, 1)], { r: 400, layer: 6 });
}

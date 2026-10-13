// 09 · Archimedes' Claw — the "iron hand" that defended the sea walls of Syracuse, 214–212 BC
// (Polybius VIII.6, Plutarch Marcellus 15, Livy XXIV.34). Authored in metres; S converts to world units.
//
// TRUTH (metres, kilograms, seconds)
//  · Scene: a 23 m stretch of the Achradina sea wall, 4.6 m thick ashlar with a rubble core, wall walk
//    7.4 m above the sea, merlons to 9.55 m; the harbour basin in front (46 m, quay kerbs), the city
//    ground behind. U = 0.16 m per unit, so the diorama spans ~360 units.
//  · Crane: a 0.56 m oak post on a 1.85 m turntable; beam pivot 13.6 m above the sea. Outer arm 10.0 m to
//    the chain sheave, inner arm 5.0 m to the counterweight pin (lever 2 : 1); armed at −9°, lifts to 32°,
//    raising the sheave up to 6.9 m. Beam 2.6 t (outer) +
//    1.2 t (inner). Counterweight: a box of lead pigs (9.5 t/m³ stacked), 10–100 t, torque m·g·5.0·cos α.
//  · Windlass on the turntable: 1.25 m handspikes on a 0.20 m drum (6.25 : 1) driving an 8-part tackle
//    hung 2.6 m inboard of the pivot. A 20-man gang at 320 N each = 6.4 kN → 320 kN on the tackle.
//    Mechanical advantage handspike → claw, before the counterweight: 6.25 × 8 × 2.6 / 10 = 13 : 1.
//    The windlass stalls (pawl holds) when the load needs more than the gang can push.
//  · Iron hand: four hinged wrought-iron fingers on a crown, 420 kg, 1.65 m long, on a 25 kg/m chain
//    over a 0.3 m sheave. Released by a trip cord that pulls the collar up and opens the fingers.
//  · Ship: a Roman quinquereme shortened to 28.2 m overall (26.6 m hull + 1.6 m bronze ram), 4.7 m beam
//    (6.1 m over the outriggers), 1.5 m draught, three oar banks a side. Displacement integrated from the
//    drawn hull ≈ 89 t, GM 0.62 m: heave and pitch ≈ 3 s, roll ≈ 6 s.
//  · Hydrostatics: 28 strips, each immersed section clipped exactly by the (tilted) waterline → buoyancy,
//    centre of buoyancy, moments. Damped rigid body in surge, sway, heave, pitch and roll with added mass;
//    chain = 3 MN/m spring with slack; contact with the wall face; flooding over submerged gunwales
//    (weir 1.7 h^1.5 per metre), through the lower oarports and holes (0.62 A √2gh) with the floodwater's
//    free surface running to the low side.
//  · Weights: lead pig 300 kg (0.62 × 0.24 × 0.19 m), granite boulder 500 kg (r 0.36 m) dropped ≈ 9 m
//    (≈ 13 m/s, 26 / 44 kJ). Planking takes 6 + 14 kJ (lead) and 12 + 28 kJ (boulder) for deck + bottom.
//
// PARTS (≈ 150): plinth, land block, label plate, wall body, footing course, 3 breastworks, 12 merlons
//  + 12 capstones, 3 quay kerbs with a metre rule, 2 bollards, turntable curb; turntable deck, post with
//  3 bands, crosshead, 2 cheeks, pivot pin stubs + washers, 4 struts; windlass: 2 cheeks, 2 sills, drum,
//  rope coil, ratchet, pawl, 2 hubs, 8 handspikes; tackle: 2 blocks, strap, falls; check rope + bollard;
//  beam: 6 timbers, 11 iron bands, end fork, sheave + pin, CW pin; chain drum: 2 brackets, drum, coil,
//  ratchet, 2 bars; counterweight: 2 hangers, yoke, floor, 4 walls, 4 corner irons, lead fill; chain;
//  claw: eye, shank ×2, collar, crown, 4 fingers × 3 + 4 points; hook; ammunition rack: claw, 3 lead
//  pigs, 3 boulders on chocks; ship: 14 hull strakes-sections, ram (2 + 3 fins), stem ×4, sternpost ×4,
//  aplustre ×2, 2 outriggers (5 + 1), bulwarks (4 + 3) with 14 shields, forecastle, catheads, mast,
//  yard, 2 crutches, 2 steering oars + blades, 88 oars.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import * as GL from "../../vendor/anatomy/kit/gl.mjs";
import { add, sub, mul, dot, cross, unit, len, lerp, clamp, rad, deg, ease, smoothstep, fmt, fmtInt, TAU, rng } from "../engine/vec.js";
import * as PH from "../engine/physics.js";
import * as looks from "../engine/looks.js";
import { polyRect, polyRound, polyCircle, polySaw, createBuilder } from "../engine/geo.js";
import { shapeOf } from "../engine/scene.js";

const ID = "claw";
const U = 0.16;
const S = 1 / U;
const w = (x, y, z) => [x * S, y * S, z * S];
const W = (p) => [p[0] * S, p[1] * S, p[2] * S];
const RHO = 1025;
const GR = 9.81;

// ---------------------------------------------------------------- the scene
const ZBED = -1.6;
const WALL = { x0: -11.5, x1: 11.5, y0: -2.3, y1: 2.3, top: 7.4 };
const FOOT = { y1: 2.9, top: 0.45 };
const PARA = { y0: 1.7, top: 8.45, cap: 9.35, capTop: 9.55 };
const LAND = { y0: -7.5, top: 1.5 };
const SEA = { x0: -10.5, x1: 10.5, y0: 2.3, y1: 46.0 };
const KERB = { top: 0.55 };
const PL = { x0: -11.5, x1: 11.5, y0: -7.5, y1: 47.0 };

// ---------------------------------------------------------------- the crane
const TT = { x: 0, y: -0.3, r: 1.85 };
const ZCURB = WALL.top + 0.15;
const ZDECK = ZCURB + 0.25;
const ZP = 13.6;
const PIV = [TT.x, TT.y, ZP];
const RO = 10.0, RI = 5.0, RT = 2.6, RSH = 0.3, RCD = 0.2, S_CD = 1.6;
const A0 = rad(-9);
const AL_MAX = rad(32);
const M_CLAW = 420;
const CLAW_LEN = 1.65;
const CLAW_GRIP = 1.3;
const MBO = 2600, DBO = 4.8, MBI = 1200, DBI = 2.5;
const TACKLE = 8, WR = 1.25 / 0.2, CREW = 6400;
const MA = (WR * TACKLE * RT) / RO;
const CH_HOIST = 0.35;
const REACH = RO * Math.cos(A0) + RSH;
const I_BEAM = MBO * DBO * DBO * 1.3 + MBI * DBI * DBI * 1.3;
const spotAt = (y) => Math.acos((y - TT.y) / (RO * Math.cos(A0) + RSH));
const SPOT = { claw: spotAt(0.72), lead: spotAt(-0.55), boulder: spotAt(-1.55) };
const ITEM_TOP = { claw: CLAW_LEN, lead: 0.56, boulder: 0.06 + 0.712 + 0.1 };
const WEIGHTS = {
  lead: { m: 300, size: 0.19, deck: 6000, bottom: 14000, hole: 0.35, r: 0.3 },
  boulder: { m: 500, size: 0.71, deck: 12000, bottom: 28000, hole: 0.6, r: 0.48 },
};
const BOULDER_R = 0.356;

function crane(sg, al) {
  const ca = Math.cos(al), sa = Math.sin(al), cs = Math.cos(sg), ss = Math.sin(sg);
  const dh = [ss, cs, 0];
  const lt = [cs, -ss, 0];
  const d = [ca * ss, ca * cs, sa];
  const n = [-sa * ss, -sa * cs, ca];
  const on = (s, nn = 0, l = 0) => [PIV[0] + d[0] * s + n[0] * nn + lt[0] * l, PIV[1] + d[1] * s + n[1] * nn + lt[1] * l, PIV[2] + d[2] * s + n[2] * nn + lt[2] * l];
  const deck = (r, l = 0, z = 0) => [TT.x + dh[0] * r + lt[0] * l, TT.y + dh[1] * r + lt[1] * l, ZDECK + z];
  const sheave = on(RO);
  return { sg, al, dh, lt, d, n, on, deck, sheave, dep: add(sheave, mul(dh, RSH)) };
}
const upperBlock = (cr) => cr.on(-RT, -0.3 - 0.62);
const lowerBlock = (cr) => cr.deck(-1.72, 0, 0.36);
const tackleLen = (cr) => len(sub(upperBlock(cr), lowerBlock(cr)));
const depZ = (al) => ZP + RO * Math.sin(al);
const chFloor = (kind) => depZ(A0) - (WALL.top + ITEM_TOP[kind]);

// Statics of the beam: what the windlass gang must push for a chain pull T along u.
function statics(cr, T, u, mcw) {
  const at = cr.lt;
  const tq = (p, F) => dot(cross(sub(p, PIV), F), at);
  const ca = Math.cos(cr.al);
  const tauB = -GR * (MBO * DBO - MBI * DBI) * ca;
  const tauW = mcw * GR * RI * ca;
  const tauC = T > 0 ? tq(cr.dep, mul(u, T)) : 0;
  const up = upperBlock(cr);
  const arm = tq(up, unit(sub(lowerBlock(cr), up)));
  const Ft = -(tauB + tauW + tauC) / arm;
  return { Ft, Fw: Ft / (TACKLE * WR), tauW, tauC };
}

// ---------------------------------------------------------------- the galley's hull
const S_STERN = -13.6, S_BOW = 13.0, S_RAM = 14.6, BMAX = 2.35;
function hullAt(s) {
  const u = clamp(s >= 0 ? s / S_BOW : s / S_STERN, 0, 1);
  const B = BMAX * Math.max(0.1, Math.sqrt(Math.max(0, 1 - Math.pow(u, 2.3))));
  const hk = -1.5 + 1.65 * Math.pow(smoothstep(-6.8, S_STERN, s), 1.4) + 1.0 * Math.pow(smoothstep(7.8, S_BOW, s), 1.6);
  const hs = 1.25 + 0.95 * Math.pow(smoothstep(3, S_BOW, s), 2) + 1.15 * Math.pow(smoothstep(-3, S_STERN, s), 2);
  return { B, hk, hs };
}
const SF = [0, 0.18, 0.42, 0.62, 1];
const SGF = [0.06, 0.62, 0.9, 0.99, 1];
// Section (t, h): 0 keel, 1–5 port side keel → gunwale, 6–10 starboard gunwale → keel.
function sectionTH(s) {
  const { B, hk, hs } = hullAt(s);
  const half = SF.map((f, i) => [SGF[i] * B, hk + f * (hs - hk)]);
  return [[0, hk - 0.12], ...half, ...half.slice().reverse().map(([t, h]) => [-t, h])];
}
function sideT(s, h) {
  const p = sectionTH(s);
  for (let i = 1; i < 5; i++) {
    const a = p[i], b = p[i + 1];
    if (h <= b[1] || i === 4) return a[0] + (b[0] - a[0]) * clamp((h - a[1]) / (b[1] - a[1] || 1), 0, 1);
  }
  return p[5][0];
}
const FC = { s0: 9.2, s1: 12.3, h: 0.32 };
function deckH(s, t) {
  const { B, hs } = hullAt(s);
  if (Math.abs(t) > B + 0.05) return null;
  return hs + (s > FC.s0 && s < FC.s1 && Math.abs(t) < B - 0.1 ? FC.h : 0);
}

// Area and centroid of a convex polygon below the line a·t + b·h = c (allocation-free; the result
// object is reused, read it at once).
const CA = { A: 0, t: 0, h: 0 };
function clipArea(poly, a, b, c) {
  const n = poly.length;
  let fx = 0, fy = 0, px = 0, py = 0, cnt = 0, A = 0, cx = 0, cy = 0;
  for (let i = 0; i < n; i++) {
    const p = poly[i], q = poly[i + 1 === n ? 0 : i + 1];
    const fp = a * p[0] + b * p[1] - c, fq = a * q[0] + b * q[1] - c;
    for (let k2 = 0; k2 < 2; k2++) {
      let x, y;
      if (k2 === 0) {
        if (!(fp < 0)) continue;
        x = p[0];
        y = p[1];
      } else {
        if (fp < 0 === fq < 0) continue;
        const u = fp / (fp - fq);
        x = p[0] + (q[0] - p[0]) * u;
        y = p[1] + (q[1] - p[1]) * u;
      }
      if (cnt === 0) {
        fx = x;
        fy = y;
      } else {
        const cr = px * y - x * py;
        A += cr;
        cx += (px + x) * cr;
        cy += (py + y) * cr;
      }
      px = x;
      py = y;
      cnt++;
    }
  }
  if (cnt < 3) return null;
  const cr = px * fy - fx * py;
  A += cr;
  cx += (px + fx) * cr;
  cy += (py + fy) * cr;
  A /= 2;
  if (Math.abs(A) < 1e-9) return null;
  CA.A = Math.abs(A);
  CA.t = cx / (6 * A);
  CA.h = cy / (6 * A);
  return CA;
}

const NST = 28;
const HDS = (S_BOW - S_STERN) / NST;
const HS = Array.from({ length: NST }, (_, i) => {
  const s = S_STERN + (i + 0.5) * HDS;
  return { s, poly: sectionTH(s) };
});
const HYD = (() => {
  let V0 = 0, LCB = 0, VCB = 0, AWP = 0, IL = 0, IT = 0, VDECK = 0;
  for (const st of HS) {
    const r = clipArea(st.poly, 0, 1, 0);
    V0 += r.A * HDS;
    LCB += r.A * HDS * st.s;
    VCB += r.A * HDS * r.h;
    const r2 = clipArea(st.poly, 0, 1, hullAt(st.s).hs - 0.02);
    VDECK += r2.A * HDS;
  }
  LCB /= V0;
  VCB /= V0;
  for (const st of HS) {
    let tw = 0;
    const p = st.poly;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      if (a[1] < 0 !== b[1] < 0) tw = Math.max(tw, Math.abs(a[0] + (b[0] - a[0]) * (-a[1] / (b[1] - a[1]))));
    }
    AWP += 2 * tw * HDS;
    IL += 2 * tw * HDS * (st.s - LCB) ** 2;
    IT += (2 / 3) * tw ** 3 * HDS;
  }
  return { V0, LCB, VCB, AWP, IL, IT, VDECK };
})();
const MASS = RHO * HYD.V0;
const SG = HYD.LCB;
const GM0 = 0.62;
const HG = HYD.VCB + HYD.IT / HYD.V0 - GM0;
const FCAP = 0.9 * (RHO * HYD.VDECK - MASS);
const VCAP = (0.55 * FCAP) / RHO;
const IP = MASS * 6.8 * 6.8;
const IR = MASS * 1.85 * 1.85;
const KZ0 = RHO * GR * HYD.AWP;
const KP0 = RHO * GR * HYD.IL;
const GUN = [];
for (let s = S_STERN + 0.6; s < S_BOW - 0.3; s += 0.8) {
  const h = hullAt(s);
  GUN.push([s, h.B, h.hs, 0.8, 1], [s, -h.B, h.hs, 0.8, 1]);
}
for (let s = -6.3; s <= 6.4; s += 0.98) {
  const t = sideT(s, 0.55);
  GUN.push([s, t, 0.55, 1, 0.032], [s, -t, 0.55, 1, 0.032]);
}
const BED = [-12, -6, 0, 6, 12];
const CONTACT = [[S_RAM, 0, -0.05], [S_RAM - 0.35, 0, 0.3], [13.35, 0, 3.3], [12.4, 0.5, 2.3], [12.4, -0.5, 2.3], [10.6, 2.05, 2.05], [10.6, -2.05, 2.05]];

function axesOf(th, ph) {
  const c = Math.cos(th), sn = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph);
  return { S: [0, -c, sn], T: [cp, sp * sn, sp * c], H: [-sp, cp * sn, cp * c] };
}
function shipFrame(y) {
  const A = axesOf(y[3], y[4]);
  return { O: [y[0], y[1], y[2]], S: A.S, T: A.T, H: A.H };
}
const xf = (F, s, t, h) => [F.O[0] + F.S[0] * s + F.T[0] * t + F.H[0] * h, F.O[1] + F.S[1] * s + F.T[1] * t + F.H[1] * h, F.O[2] + F.S[2] * s + F.T[2] * t + F.H[2] * h];
const xfU = (F, p) => [(F.O[0] + F.S[0] * p[0] + F.T[0] * p[1] + F.H[0] * p[2]) * S, (F.O[1] + F.S[1] * p[0] + F.T[1] * p[1] + F.H[1] * p[2]) * S, (F.O[2] + F.S[2] * p[0] + F.T[2] * p[1] + F.H[2] * p[2]) * S];
const shipY = (d) => WALL.y1 + d + S_RAM;
const toLocal = (F, p) => {
  const r = sub(p, F.O);
  return [dot(r, F.S), dot(r, F.T), dot(r, F.H)];
};

// The ship's equations of motion. y = [x, y, z, θ, φ, vx, vy, vz, θ', φ', Vflood, s_f, t_f].
function shipDeriv(y, ext, out) {
  const th = y[3], ph = y[4];
  const c = Math.cos(th), sn = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph);
  const Sy = -c, Sz = sn, Tx = cp, Ty = sp * sn, Tz = sp * c, Hx = -sp, Hy = cp * sn, Hz = cp * c;
  const Ox = y[0], Oy = y[1], Oz = y[2];
  const vx = y[5], vy = y[6], vz = y[7], wt = y[8], wp = y[9];
  const Vf = Math.max(0, y[10]), sf = clamp(y[11], S_STERN + 3, S_BOW - 3), tf = clamp(y[12], -0.36, 0.36);
  const mf = RHO * Vf;
  const hf = -1.2 + Vf / (1.2 * HYD.AWP);
  let mt = MASS + mf, ms = MASS * SG + mf * sf, mtt = mf * tf, mh = MASS * HG + mf * hf;
  for (const L of ext.loads) {
    mt += L.m;
    ms += L.m * L.s;
    mtt += L.m * L.t;
    mh += L.m * L.h;
  }
  const sC = ms / mt, tC = mtt / mt, hC = mh / mt;
  const Gx = Ox + Tx * tC + Hx * hC, Gy = Oy + Sy * sC + Ty * tC + Hy * hC, Gz = Oz + Sz * sC + Tz * tC + Hz * hC;
  let Fx = 0, Fy = 0, Fz = -mt * GR, Mx = 0, My = 0, Mz = 0, V = 0;
  for (const st of HS) {
    const r = clipArea(st.poly, Tz, Hz, -(Oz + Sz * st.s));
    if (!r) continue;
    const f = RHO * GR * r.A * HDS;
    V += r.A * HDS;
    Fz += f;
    Mx += (Oy + Sy * st.s + Ty * r.t + Hy * r.h - Gy) * f;
    My -= (Ox + Tx * r.t + Hx * r.h - Gx) * f;
  }
  const ox = -wt, oy = Sy * wp, oz = Sz * wp;
  const wpt = (s, t, h) => [Ox + Tx * t + Hx * h, Oy + Sy * s + Ty * t + Hy * h, Oz + Sz * s + Tz * t + Hz * h];
  const pvel = (p) => {
    const rx = p[0] - Gx, ry = p[1] - Gy, rz = p[2] - Gz;
    return [vx + oy * rz - oz * ry, vy + oz * rx - ox * rz, vz + ox * ry - oy * rx];
  };
  const force = (p, f0, f1, f2) => {
    Fx += f0;
    Fy += f1;
    Fz += f2;
    const rx = p[0] - Gx, ry = p[1] - Gy, rz = p[2] - Gz;
    Mx += ry * f2 - rz * f1;
    My += rz * f0 - rx * f2;
    Mz += rx * f1 - ry * f0;
  };
  let T = 0;
  const chn = ext.chain;
  if (chn) {
    const pb = wpt(chn.s, chn.t, chn.h);
    const dx = chn.tip[0] - pb[0], dy = chn.tip[1] - pb[1], dz = chn.tip[2] - pb[2];
    const L = Math.hypot(dx, dy, dz);
    if (L > chn.L) {
      const ux = dx / L, uy = dy / L, uz = dz / L;
      const v = pvel(pb);
      T = Math.max(0, 3.0e6 * (L - chn.L) - 2.0e5 * (v[0] * ux + v[1] * uy + v[2] * uz));
      force(pb, ux * T, uy * T, uz * T);
    }
  }
  for (const st of BED) {
    const p = wpt(st, 0, hullAt(st).hk - 0.12);
    if (p[2] < -6) force(p, 0, 0, Math.max(0, 4e6 * (-6 - p[2]) - 8e5 * pvel(p)[2]));
  }
  let knock = 0;
  for (const cc of CONTACT) {
    const p = wpt(cc[0], cc[1], cc[2]);
    const face = p[2] < FOOT.top ? FOOT.y1 : WALL.y1;
    const pen = face - p[1];
    if (pen > 0 && p[2] < PARA.capTop) {
      const v = pvel(p);
      const N = Math.max(0, 4e6 * pen - 1.4e6 * v[1]);
      force(p, 0, N, -Math.sign(v[2]) * Math.min(0.3 * N, Math.abs(v[2]) * 2e5));
      knock = Math.max(knock, -v[1]);
    }
  }
  const wet = clamp(V / HYD.V0, 0.12, 1.4);
  Fz -= 2 * 0.2 * Math.sqrt(KZ0 * mt * 1.8) * wet * vz;
  Fx -= 0.5 * mt * vx * wet;
  Fy -= 0.45 * mt * vy * wet;
  const Mp = -Mx - 2 * 0.12 * Math.sqrt(KP0 * IP * 1.8) * wet * wt;
  const Mr = My * Sy + Mz * Sz - 2 * 0.12 * Math.sqrt(mt * GR * GM0 * IR * 1.2) * wet * wp - 4e5 * Math.abs(wp) * wp * wet;
  // Inside water surface (world z): bilge under the floodwater plus its depth. Inflow stops when it
  // reaches the sea outside, so a holed hull fills to the waterline and floats waterlogged.
  const sfc = clamp(sf, S_STERN + 1, S_BOW - 1);
  const Zin = Oz + Sz * sfc + Tz * tf + Hz * (hullAt(sfc).hk + 0.05) + Vf / (0.6 * HYD.AWP);
  let q = 0, qs = 0, qt = 0;
  for (const gp of GUN) {
    const pz = Oz + Sz * gp[0] + Tz * gp[1] + Hz * gp[2];
    const head = Math.min(-pz, -Zin);
    if (head > 0) {
      const dq = gp[4] < 1 ? 0.62 * gp[4] * Math.sqrt(2 * GR * head) : 1.7 * Math.pow(head, 1.5) * gp[3];
      q += dq;
      qs += dq * gp[0];
      qt += dq * gp[1];
    }
  }
  for (const ho of ext.holes) {
    const pz = Oz + Sz * ho.s + Tz * ho.t + Hz * ho.h;
    const head = Math.min(-pz, -Zin);
    if (head > 0) {
      const dq = 0.62 * ho.A * Math.sqrt(2 * GR * head);
      q += dq;
      qs += dq * ho.s;
      qt += dq * ho.t;
    }
  }
  if (Vf > VCAP) q *= Math.max(0, 1 - (Vf - VCAP) / (0.05 * VCAP));
  // Floodwater runs along the bilge to the low end and side; near waterlogged it no longer sloshes.
  const fs = clamp(1 - Vf / VCAP, 0, 1);
  const sIn = q > 1e-6 ? qs / q : sf, tIn = q > 1e-6 ? qt / q : tf;
  const sT = clamp(SG + 0.35 * ((q > 1e-6 ? sIn : sf) - SG) - 22 * Math.sin(th), S_STERN + 3, S_BOW - 3);
  const tT = clamp(0.8 * (q > 1e-6 ? tIn : tf) - 1.2 * Math.sin(ph), -0.32, 0.32);
  const dsf = Vf > 0.02 ? (fs * (sT - y[11])) / 2.5 + (q * (sIn - y[11])) / Math.max(Vf, 0.5) : (sIn - y[11]) * 5;
  const dtf = Vf > 0.02 ? (fs * (tT - y[12])) / 1.5 + (q * (clamp(tIn, -0.36, 0.36) - y[12])) / Math.max(Vf, 0.5) : (tIn - y[12]) * 5;
  if (out) {
    out.T = T;
    out.V = V;
    out.q = q;
    out.qs = sIn;
    out.qt = tIn;
    out.knock = knock;
    out.mt = mt;
  }
  return [vx, vy, vz, wt, wp, Fx / (mt * 1.5), Fy / (mt * 1.05), Fz / (mt * 1.8), Mp / (IP * 1.8 + mf * 30), Mr / (IR * 1.2 + mf), q, dsf, dtf];
}
export function shipStep(y, ext, h, out) {
  const n = y.length;
  const k1 = shipDeriv(y, ext, out);
  const y2 = new Array(n);
  for (let i = 0; i < n; i++) y2[i] = y[i] + (h / 2) * k1[i];
  const k2 = shipDeriv(y2, ext, null);
  for (let i = 0; i < n; i++) y2[i] = y[i] + (h / 2) * k2[i];
  const k3 = shipDeriv(y2, ext, null);
  for (let i = 0; i < n; i++) y2[i] = y[i] + h * k3[i];
  const k4 = shipDeriv(y2, ext, null);
  const o = new Array(n);
  for (let i = 0; i < n; i++) o[i] = y[i] + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  return o;
}
// A sudden blow J (N·s, world) at local point (s, t, h).
function impulse(y, s, t, h, J) {
  const F = shipFrame(y);
  const p = xf(F, s, t, h);
  const g = xf(F, SG, 0, HG);
  const r = sub(p, g);
  const m = cross(r, J);
  const mt = MASS + RHO * Math.max(0, y[10]);
  y[5] += J[0] / (mt * 1.5);
  y[6] += J[1] / (mt * 1.05);
  y[7] += J[2] / (mt * 1.8);
  y[8] += -m[0] / (IP * 1.8);
  y[9] += dot(m, F.S) / (IR * 1.2);
}
function freshShip(d) {
  return { y: [0, shipY(d), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], holes: [], loads: [], dis: 0, seed: 7 };
}
const stemZ = (y) => xf(shipFrame(y), S_BOW + 0.3, 0, hullAt(S_BOW).hs + 1.0)[2] - (hullAt(S_BOW).hs + 1.0);

// ---------------------------------------------------------------- the recorded shots
// flags: { drop, lift, hold, release, weight }
export function simulate(M, st, flags) {
  const dt = 1 / 100;
  const sg = st.sg;
  const mcw = M.ctrl.cw * 1000;
  const chMax = M.ctrl.chain;
  const alT = Math.min(AL_MAX, Math.asin(clamp(Math.sin(A0) + M.ctrl.lift / RO, -1, 1)));
  let y = st.ship.y.slice();
  const holes = st.ship.holes.map((h) => ({ ...h }));
  const loads = st.ship.loads.map((h) => ({ ...h }));
  const ext = { chain: null, loads, holes };
  const out = {};
  let al = st.al, dl = 0, dlv = 0, al0 = st.al;
  let ch = st.ch, chv = 0;
  let grip = st.grip, grip0 = st.grip;
  let cm = st.cm;
  let att = st.att ? st.att.slice() : null;
  let catchP = null;
  let Lc = st.Lc;
  let px = st.pend ? st.pend[0] : 0, py = st.pend ? st.pend[1] : 0, pvx = 0, pvy = 0;
  const kind = flags.weight ? M.ammo.id : "claw";
  const wt = flags.weight ? WEIGHTS[kind] : null;
  let wm = flags.weight ? 0 : -1, wz = 0, wv = 0, wxy = null, wloc = null;
  const rec = PH.timeline();
  const events = [];
  const marks = [];
  const phases = [];
  const stats = { E: 0, v: 0, T: 0, kind, landed: st.landed || null, slam: 0 };
  let phase = flags.drop ? "drop" : flags.lift ? "lift" : flags.release ? "release" : flags.weight ? "trip" : "settle";
  let tp = 0, t = 0, T = 0, Fw = 0, stallT = 0, holdT = 0, liftDur = 4, endAt = Infinity;
  let relAt = null, slamDone = false, lastKnock = -9, wetClaw = cm === 3;
  const ev = (k, p, o = {}) => events.push({ t, k, p, ...o });
  const mark = (label) => marks.push([t, label]);
  const phaseMark = (name) => phases.push([t, name]);
  phaseMark(flags.weight ? "drop" : phase === "drop" ? "drop" : phase === "lift" ? "lift" : "release");
  if (phase === "drop") {
    mark("drop");
    cm = 1;
  }
  if (phase === "settle") endAt = 0.5;
  if (phase === "trip") mark("trip");
  let i = 0;
  for (; t < 60; i++) {
    const cr = crane(sg, al + dl);
    const dep = cr.dep;
    const F = shipFrame(y);
    let ring;
    ext.chain = null;
    // ---- the claw
    if (phase === "drop") {
      if (cm !== 2) {
        chv = Math.min(11, chv + (cm === 3 ? 0 : 0.72 * GR) * dt);
        if (cm === 3) chv += (1.6 - chv) * Math.min(1, dt * 5);
        ch += chv * dt;
      }
      ring = cm === 2 ? cm2ring(CLAW_LEN + (CLAW_GRIP - CLAW_LEN) * clamp((grip - grip0) / Math.max(0.05, 1 - grip0), 0, 1)) : [dep[0], dep[1], dep[2] - ch];
      const tipZ = ring[2] - CLAW_LEN;
      const loc = toLocal(F, [ring[0], ring[1], 0]);
      const dH = deckH(loc[0], loc[1]);
      const on = cm === 1 && dH !== null && loc[0] > S_STERN + 0.4 && loc[0] < S_BOW + 0.4;
      if (on) {
        const zd = xf(F, loc[0], loc[1], dH)[2];
        if (tipZ <= zd) {
          att = [loc[0], loc[1], dH];
          cm = 2;
          stats.landed = "ship";
          stats.v = chv;
          ch -= tipZ - zd;
          impulse(y, att[0], att[1], att[2], [0, 0, -M_CLAW * chv * 0.6]);
          ev("bite", [ring[0], ring[1], zd], { v: chv });
          mark("bite");
          Lc = ch + CLAW_LEN + 0.12;
          chv = 0;
          endAt = t + 0.9;
        }
      }
      if (cm === 1 && tipZ <= 0 && !on) {
        cm = 3;
        stats.landed = "water";
        stats.v = chv;
        ev("dunk", [ring[0], ring[1], 0], { s: 0.55 });
        mark("splash");
      }
      if (cm !== 2 && ch >= chMax) {
        ch = chMax;
        if (chv > 0.5) ev("clank", ring, { v: chv });
        chv = 0;
        if (cm === 1) {
          cm = 0;
          stats.landed = "air";
        }
        if (endAt === Infinity) endAt = t + 0.8;
      }
      if (cm === 2) grip = clamp(grip0 + (1 - grip0) * smoothstep(0, 0.35, t - (endAt - 0.9)), -0.4, 1);
      if (t >= endAt) {
        if (flags.lift) {
          phase = "lift";
          phaseMark("lift");
          mark("lift");
          tp = 0;
          al0 = al;
          liftDur = 1.4 + 4.0 * Math.abs(alT - al) / rad(36);
          endAt = Infinity;
          if (cm === 2) ev("creak", dep, {});
        } else phase = "done";
      }
    }
    if (phase === "lift" || phase === "hold") {
      if (phase === "lift") {
        const want = al0 + (alT - al0) * ease(clamp(tp / liftDur, 0, 1));
        if (want > al && Fw < CREW) al = Math.min(want, al + 0.16 * dt);
        if (Fw >= CREW) stallT += dt;
        if (al >= alT - 1e-4 || stallT > 1.6 || tp > liftDur + 3) {
          phase = "hold";
          holdT = 0;
          if (stallT > 1.6) ev("stall", dep, {});
          mark(stallT > 1.6 ? "stall" : "top");
        }
      } else {
        holdT += dt;
        if (holdT >= (flags.hold ?? 3)) {
          if (flags.release) {
            phase = "release";
            tp = 0;
            phaseMark("release");
            mark("release");
          } else phase = "done";
        }
      }
    }
    if (phase === "release" && relAt === null && tp >= 0.12) {
      relAt = t;
      if (cm === 2) {
        dlv += (T * RO * 0.09) / (I_BEAM + mcw * RI * RI);
        endAt = t + 11;
        const rw = cm2ring();
        const dd = sub(rw, dep);
        const L = len(dd);
        ch = Math.max(0.6, L);
        px = dd[0] / ch;
        py = dd[1] / ch;
        pvx = 0;
        pvy = 0;
        cm = 4;
        ev("release", rw, {});
        endAt = t + 11;
      } else {
        cm = cm === 3 ? 3 : 4;
        endAt = t + 3;
      }
    }
    if (phase === "release") grip = clamp(grip0 + (-0.4 - grip0) * smoothstep(0, 0.28, tp), -0.4, 1);
    function cm2ring(Lcl = CLAW_GRIP) {
      const pa = xf(F, att[0], att[1], att[2]);
      const u = unit(sub(dep, pa));
      return add(pa, mul(u, Lcl));
    }
    // chain coupling while bitten
    if (cm === 2 && (phase === "lift" || phase === "hold" || (phase === "release" && relAt === null))) {
      if (!catchP) {
        const B0 = hullAt(att[0]).B;
        const side = Math.abs(att[1]) < 0.12 ? 0 : Math.sign(att[1]);
        catchP = att[0] > 12.2 || side === 0 ? [att[0], 0, hullAt(att[0]).hs] : [att[0], side * B0 * 0.98, hullAt(att[0]).hs];
      }
      if (T < 3000) {
        const dd = sub(catchP, att);
        const L = len(dd);
        if (L > 1e-3) att = add(att, mul(dd, Math.min(1, (1.6 * dt) / L)));
      }
      ext.chain = { s: att[0], t: att[1], h: att[2], L: Lc, tip: dep };
    }
    // ---- the weight
    if (flags.weight) {
      if (phase === "trip") {
        ring = [dep[0], dep[1], dep[2] - ch];
        if (tp >= 0.3) {
          phase = "fall";
          wm = 1;
          wxy = [ring[0], ring[1]];
          wz = ring[2] - 0.1 - wt.size;
          wv = 0;
          mark("loose");
          ev("trip", ring, {});
        }
      } else if (phase === "fall") {
        wv += GR * dt;
        wz -= wv * dt;
        const loc = toLocal(F, [wxy[0], wxy[1], 0]);
        const dH = deckH(loc[0], loc[1]);
        if (dH !== null && loc[0] > S_STERN + 0.3 && loc[0] < S_BOW + 0.3) {
          const zd = xf(F, loc[0], loc[1], dH)[2];
          if (wz <= zd) {
            const E = 0.5 * wt.m * wv * wv;
            stats.E = E;
            stats.v = wv;
            stats.landed = "ship";
            const hk = hullAt(loc[0]).hk;
            let vOut = 0;
            if (E > wt.deck + wt.bottom) {
              vOut = Math.sqrt((2 * (E - wt.deck - wt.bottom)) / wt.m);
              holes.push({ s: loc[0], t: loc[1], h: hk + 0.12, A: wt.hole, r: wt.r, seed: holes.length + 3 });
              wm = 2;
              ev("through", [wxy[0], wxy[1], 0], { s: 0.7 });
            } else if (E > wt.deck) {
              holes.push({ s: loc[0], t: loc[1], h: hk + 0.12, A: 0.04, r: wt.r * 0.8, seed: holes.length + 3 });
              loads.push({ m: wt.m, s: loc[0], t: loc[1], h: hk + 0.35 });
              wm = 3;
            } else {
              loads.push({ m: wt.m, s: loc[0], t: loc[1], h: dH + wt.size / 2 });
              wm = 4;
            }
            wloc = [loc[0], loc[1], dH];
            impulse(y, loc[0], loc[1], dH, [0, 0, -wt.m * (wv - vOut)]);
            ev("impact", [wxy[0], wxy[1], zd], { E, kind });
            mark("impact");
            phaseMark("impact");
            phase = "settle";
            endAt = t + 13;
          }
        }
        if (phase === "fall" && wz <= 0) {
          stats.E = 0.5 * wt.m * wv * wv;
          stats.v = wv;
          stats.landed = "water";
          wm = 2;
          ev("plunge", [wxy[0], wxy[1], 0], { s: 0.9 });
          mark("splash");
          phaseMark("impact");
          phase = "settle";
          endAt = t + 7;
        }
      }
    }
    // ---- the claw's position
    if (!ring) {
      if (cm === 2) ring = cm2ring();
      else {
        if (cm === 4 || cm === 0 || cm === 3) {
          const gl = GR / Math.max(0.6, ch + 0.8);
          pvx += (-gl * px - 0.5 * pvx) * dt;
          pvy += (-gl * py - 0.5 * pvy) * dt;
          px += pvx * dt;
          py += pvy * dt;
        }
        ring = [dep[0] + ch * px, dep[1] + ch * py, dep[2] - ch * Math.sqrt(Math.max(0.2, 1 - px * px - py * py))];
      }
    }
    if (cm === 3 && (phase === "lift" || phase === "hold") && ring[2] - CLAW_LEN > 0.05 && !wetClaw) {
      wetClaw = true;
      ev("emerge", [ring[0], ring[1], 0.3], {});
    }
    if (cm === 3 && ring[2] - CLAW_LEN > 0.05) wetClaw = true;
    // ---- statics and the beam's spring-back
    {
      let Tc = 0, u = [0, 0, -1];
      if (ext.chain) {
        Tc = T;
        u = unit(sub(xf(F, att[0], att[1], att[2]), dep));
      } else if (cm !== 2 && kind === "claw") Tc = (M_CLAW + 25 * ch) * GR * (cm === 3 && ring[2] - CLAW_LEN < 0 ? 0.87 : 1);
      if (flags.weight && wm === 0) Tc = (wt.m + 25 * ch) * GR;
      const sx = statics(crane(sg, al), Tc, u, mcw);
      Fw = sx.Fw;
    }
    dlv += (-((2 * Math.PI * 1.05) ** 2) * dl - 2 * 0.1 * (2 * Math.PI * 1.05) * dlv) * dt;
    dl += dlv * dt;
    // ---- the ship
    y = shipStep(y, ext, dt, out);
    T = ext.chain ? out.T : 0;
    stats.T = Math.max(stats.T, T);
    if (out.knock > 0.35 && t - lastKnock > 0.8) {
      lastKnock = t;
      const Fk = shipFrame(y);
      ev("knock", xf(Fk, S_RAM - 0.2, 0, 0.3), { v: out.knock });
    }
    if (relAt !== null && !slamDone && t > relAt + 0.2) {
      const Fk = shipFrame(y);
      const bow = xf(Fk, S_BOW - 1.2, 0, hullAt(S_BOW - 1.2).hk);
      const vb = y[7] + (-y[8]) * 0 + y[8] * (S_BOW - 1.2 - SG) * Math.cos(y[3]);
      if (bow[2] < 0.3 && vb < -1.0) {
        slamDone = true;
        const KE = 0.5 * out.mt * (y[5] ** 2 + y[6] ** 2 + y[7] ** 2) + 0.5 * IP * y[8] ** 2 + 0.5 * IR * y[9] ** 2;
        stats.E = Math.max(stats.E, KE);
        stats.v = Math.abs(vb);
        stats.slam = Math.abs(vb);
        ev("slam", [bow[0], bow[1], 0], { v: Math.abs(vb) });
        mark("slam");
        phaseMark("impact");
      }
      if (t > relAt + 3 && !slamDone) {
        slamDone = true;
        phaseMark("impact");
      }
    }
    if (i % 2 === 0) {
      const tipW = wm === 1 ? [wxy[0], wxy[1], wz + wt.size + 0.1] : null;
      rec.push(t, {
        y: [y[0], y[1], y[2], y[3], y[4]],
        v: [y[5], y[6], y[7], y[8], y[9]],
        f: [y[10], y[11], y[12]],
        al,
        dl,
        ch,
        gr: grip,
        cm,
        r: ring.slice(),
        a: att ? att.slice() : [0, 0, 0],
        T,
        Fw,
        wm,
        wz,
        wp: tipW || [0, 0, 0],
        q: out.q,
        qs: out.qs,
        qt: out.qt,
        hl: holes.length,
        ld: loads.length,
      });
    }
    t += dt;
    tp += dt;
    if ((phase === "settle" || (phase === "release" && relAt !== null)) && t >= endAt) phase = "done";
    if (phase === "done") break;
  }
  return {
    rec,
    events,
    marks,
    phases,
    T: t,
    stats,
    kind,
    final: { y, holes, loads, al, ch, grip, cm, att, Lc, landed: stats.landed, wm, wloc, pend: [px, py], lifted: cm === 2 && !!flags.lift && !flags.release },
  };
}

// ---------------------------------------------------------------- drawing helpers
let LIGHTV = null;
// A convex polyhedron drawn with the kit's shading rules. faces: vertex index loops.
function polyPaths(B, verts, faces, open) {
  const V = B.V;
  const Lg = (LIGHTV = G.lightOf(B.P));
  const scr = verts.map(B.at);
  let cx = 0, cy = 0, cz = 0;
  for (const p of verts) {
    cx += p[0];
    cy += p[1];
    cz += p[2];
  }
  cx /= verts.length;
  cy /= verts.length;
  cz /= verts.length;
  const info = faces.map((f) => {
    let nx = 0, ny = 0, nz = 0, fx = 0, fy = 0, fz = 0;
    for (let i = 0; i < f.length; i++) {
      const a = verts[f[i]], b = verts[f[(i + 1) % f.length]];
      nx += (a[1] - b[1]) * (a[2] + b[2]);
      ny += (a[2] - b[2]) * (a[0] + b[0]);
      nz += (a[0] - b[0]) * (a[1] + b[1]);
      fx += a[0];
      fy += a[1];
      fz += a[2];
    }
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-9) return { f, n: [0, 0, 1], vis: false, deg: true };
    nx /= l;
    ny /= l;
    nz /= l;
    if (nx * (fx / f.length - cx) + ny * (fy / f.length - cy) + nz * (fz / f.length - cz) < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    return { f, n: [nx, ny, nz], vis: nx * V[0] + ny * V[1] + nz * V[2] > 1e-6 };
  });
  const edges = new Map();
  info.forEach((F, fi) => {
    if (F.deg) return;
    const f = F.f;
    for (let i = 0; i < f.length; i++) {
      const a = f[i], b = f[(i + 1) % f.length];
      if (a === b) continue;
      const key = a < b ? a * 4096 + b : b * 4096 + a;
      let e = edges.get(key);
      if (!e) edges.set(key, (e = { a, b, fs: [] }));
      e.fs.push(fi);
    }
  });
  const buckets = [[], [], [], [], []];
  for (const F of info) if (F.vis) buckets[G.bandOf(F.n[0] * Lg[0] + F.n[1] * Lg[1] + F.n[2] * Lg[2])].push(k.pathOf(F.f.map((i) => scr[i]), true));
  const outline = [], crease = [];
  for (const e of edges.values()) {
    if (e.fs.length === 1) {
      if (!open && info[e.fs[0]].vis) outline.push(k.pathOf([scr[e.a], scr[e.b]]));
      continue;
    }
    const f0 = info[e.fs[0]], f1 = info[e.fs[1]];
    if (f0.vis !== f1.vis) outline.push(k.pathOf([scr[e.a], scr[e.b]]));
    else if (f0.vis && dot(f0.n, f1.n) < 0.975) crease.push(k.pathOf([scr[e.a], scr[e.b]]));
  }
  return {
    paths: { fill: k.pathOf(G.hullOf(scr), true), outline: outline.join(""), crease: crease.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((l) => l.join("")) },
    info,
  };
}
// The part of a convex point set above z = zc.
function clipAbove(verts, zc) {
  const up = [], dn = [];
  for (const p of verts) (p[2] >= zc ? up : dn).push(p);
  if (!dn.length) return { all: true, pts: verts };
  if (!up.length) return { none: true, pts: [] };
  const pts = up.slice();
  for (const a of up)
    for (const b of dn) {
      const u = (a[2] - zc) / (a[2] - b[2]);
      pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, zc]);
    }
  return { pts };
}
// Where visible faces cross the water plane.
function waterline(B, verts, info, zc) {
  const segs = [];
  for (const F of info) {
    if (!F.vis) continue;
    const hit = [];
    const f = F.f;
    for (let i = 0; i < f.length; i++) {
      const a = verts[f[i]], b = verts[f[(i + 1) % f.length]];
      if (a[2] >= zc !== b[2] >= zc) {
        const u = (a[2] - zc) / (a[2] - b[2]);
        hit.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, zc]);
      }
    }
    if (hit.length === 2) segs.push(k.pathOf([B.at(hit[0]), B.at(hit[1])]));
  }
  return segs.join("");
}
// A box between two local points (ship coordinates), w across `side`, h along `up`.
function boxLocal(a, b, wd, ht, up) {
  const ax = unit(sub(b, a));
  let side = cross(up, ax);
  if (len(side) < 1e-6) side = cross([0, 1, 0], ax);
  side = unit(side);
  const u2 = cross(ax, side);
  const v = [];
  for (const p of [a, b]) for (const [x, yy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) v.push(add(p, add(mul(side, (x * wd) / 2), mul(u2, (yy * ht) / 2))));
  return { v, f: [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]] };
}
// Lofts between rings of equal count: one part per span, caps only at the ends.
function loft(rings) {
  const out = [];
  const n = rings[0].length;
  for (let i = 0; i < rings.length - 1; i++) {
    const v = [...rings[i], ...rings[i + 1]];
    const f = [];
    for (let j = 0; j < n; j++) f.push([j, (j + 1) % n, n + ((j + 1) % n), n + j]);
    if (i === 0) f.push(Array.from({ length: n }, (_, j) => j));
    if (i === rings.length - 2) f.push(Array.from({ length: n }, (_, j) => n + j));
    out.push({ v, f, open: true });
  }
  return out;
}
const along = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

// ---------------------------------------------------------------- the galley, built once in ship coordinates
const HULL_ST = [-13.6, -12.5, -11.0, -9.2, -7.0, -4.7, -2.35, 0, 2.35, 4.7, 7.0, 9.0, 10.8, 12.0, 13.0];
const OAR_BANKS = [
  { h: 1.12, L: 4.4, n: 15, s0: -6.9, rig: true },
  { h: 0.92, L: 3.9, n: 15, s0: -6.6 },
  { h: 0.55, L: 3.3, n: 14, s0: -6.3 },
];
const OUT_T = 3.0;
const outT = (s) => {
  const tin = sideT(s, 1.1);
  return tin + (OUT_T - tin) * smoothstep(8.6, 6.4, Math.abs(s));
};
const SHIELDS = Array.from({ length: 14 }, (_, i) => -7.3 + i * 1.18);
function shipGeo() {
  const parts = [];
  const P = (id, geo, o = {}) => parts.push({ id, v: geo.v, f: geo.f, open: geo.open, ...o });
  // Hull: lofted sections with strakes, wales, oarports and the painted eye.
  const rings = HULL_ST.map((s) => sectionTH(s).map(([t, h]) => [s, t, h]));
  loft(rings).forEach((g, i) => {
    const A = rings[i], Bq = rings[i + 1];
    const lines = [];
    const sA = HULL_ST[i], sB = HULL_ST[i + 1];
    for (let j = 1; j <= 4; j++) for (const gg of [0.33, 0.67]) lines.push([along(A[j], A[j + 1], gg), along(Bq[j], Bq[j + 1], gg), "faint"]);
    for (const gg of [0.1, 0.2]) lines.push([along(A[4], A[5], gg), along(Bq[4], Bq[5], gg), "hi"]);
    lines.push([A[5], Bq[5], "mid"]);
    for (const gg of [0.25, 0.5, 0.75]) lines.push([along(A[5], A[6], gg), along(Bq[5], Bq[6], gg), "faint"]);
    const ports = [];
    for (const bk of OAR_BANKS.slice(1))
      for (let q = 0; q < bk.n; q++) {
        const s = bk.s0 + q * 0.98;
        if (s >= sA && s < sB) ports.push([s, sideT(s, bk.h) + 0.01, bk.h]);
      }
    const eye = sA <= 11.2 && sB > 11.2 ? 11.2 : null;
    P(`ship.hull${i}`, g, { mat: "wood", lines, ports, eye, seg: i, s0: sA, s1: sB, crease: "faint" });
  });
  // Bronze ram with its three fins.
  const ramRing = (s, tw, h0, h1) => [[s, -tw, h0], [s, tw, h0], [s, tw * 1.05, (h0 + h1) / 2], [s, tw, h1], [s, -tw, h1], [s, -tw * 1.05, (h0 + h1) / 2]];
  loft([ramRing(12.6, 0.3, -0.62, 0.42), ramRing(13.7, 0.22, -0.52, 0.3), ramRing(14.45, 0.07, -0.47, 0.24)]).forEach((g, i) => P(`ship.ram${i}`, g, { mat: "bronze", tone: "hi" }));
  [-0.38, -0.1, 0.16].forEach((h, i) => P(`ship.fin${i}`, boxLocal([13.95, 0, h], [S_RAM, 0, h], 0.5, 0.05, [0, 0, 1]), { mat: "bronze", tone: "hi" }));
  // Stem and stern posts.
  const stem = [[12.75, 0, 0.38], [13.15, 0, 1.4], [13.38, 0, 2.4], [13.3, 0, 3.15], [13.02, 0, 3.5]];
  for (let i = 0; i < stem.length - 1; i++) P(`ship.stem${i}`, boxLocal(stem[i], stem[i + 1], 0.24 - i * 0.02, 0.3 - i * 0.03, [1, 0, 0]), { mat: "oak" });
  const stern = [[-13.45, 0, 0.15], [-14.05, 0, 1.0], [-14.5, 0, 2.2], [-14.55, 0, 3.4], [-14.15, 0, 4.3]];
  for (let i = 0; i < stern.length - 1; i++) P(`ship.stern${i}`, boxLocal(stern[i], stern[i + 1], 0.3 - i * 0.03, 0.34 - i * 0.04, [-1, 0, 0]), { mat: "oak" });
  [-1, 1].forEach((sd, i) => P(`ship.aplustre${i}`, boxLocal([-14.25, 0, 4.15], [-13.55, sd * 0.32, 4.95], 0.08, 0.2, [0, 0, 1]), { mat: "wood" }));
  // Outriggers (oar-boxes): the near one lofted onto the curving hull, the far one straight.
  const outRing = (s, sd) => {
    const tin = sideT(s, 1.08) - 0.03, to = outT(s);
    return [[s, sd * tin, 0.95], [s, sd * to, 1.0], [s, sd * to, 1.22], [s, sd * tin, 1.22]];
  };
  loft([-8.6, -6.4, -2.2, 2.2, 6.4, 8.6].map((s) => outRing(s, 1))).forEach((g, i) => P(`ship.rig${i}`, g, { mat: "wood", rig: true }));
  loft([-6.4, 6.4].map((s) => outRing(s, -1))).forEach((g, i) => P(`ship.rigFar${i}`, g, { mat: "wood" }));
  // Bulwarks (side screens) with the marines' shields on the near one.
  const bulRing = (s, sd) => {
    const { B, hs } = hullAt(s);
    const t0 = sd * (B - 0.07), t1 = sd * B;
    return [[s, t0, hs], [s, t1, hs], [s, t1, hs + 0.82], [s, t0, hs + 0.82]];
  };
  const BUL = [-8.0, -4.0, 0, 4.0, 8.4];
  const bulLines = (ss, sd, face) => {
    const out = [];
    for (let i = 0; i < ss.length - 1; i++) {
      const a = hullAt(ss[i]), b = hullAt(ss[i + 1]);
      const ta = sd * (a.B - face), tb = sd * (b.B - face);
      out.push([0.28, 0.55].map((dz) => [[ss[i], ta, a.hs + dz], [ss[i + 1], tb, b.hs + dz], "faint"]));
    }
    return out;
  };
  const nearL = bulLines(BUL, 1, 0), farL = bulLines([-8.0, -2.6, 2.8, 8.4], -1, 0.07);
  loft(BUL.map((s) => bulRing(s, 1))).forEach((g, i) => P(`ship.bul${i}`, g, { mat: "wood", lines: nearL[i], shields: SHIELDS.filter((s) => s >= BUL[i] && s < BUL[i + 1]) }));
  loft([-8.0, -2.6, 2.8, 8.4].map((s) => bulRing(s, -1))).forEach((g, i) => P(`ship.bulFar${i}`, g, { mat: "wood", lines: farL[i] }));
  // Forecastle deck, catheads, the lowered mast and yard on their crutches.
  const fcRing = (s) => {
    const { B, hs } = hullAt(s);
    const b = B - 0.12;
    return [[s, -b, hs], [s, b, hs], [s, b, hs + FC.h], [s, -b, hs + FC.h]];
  };
  loft([FC.s0, 10.8, FC.s1].map(fcRing)).forEach((g, i) => P(`ship.fore${i}`, g, { mat: "oak", fore: true }));
  const hc = hullAt(10.4).hs + FC.h;
  P("ship.cathead", boxLocal([10.4, -2.1, hc + 0.12], [10.4, 2.1, hc + 0.12], 0.26, 0.24, [0, 0, 1]), { mat: "oak" });
  const hm = hullAt(0).hs;
  const oct = (a, b, r, id, mat) => {
    const ring = (p) => Array.from({ length: 8 }, (_, j) => [p[0], p[1] + r * Math.cos((j / 8) * TAU + 0.39), p[2] + r * Math.sin((j / 8) * TAU + 0.39)]);
    loft([ring(a), ring(b)]).forEach((g) => P(id, g, { mat }));
  };
  for (const s of [-3.6, 4.4]) {
    P(`ship.crutch${s}a`, boxLocal([s, -0.62, hm], [s, 0.22, hm + 0.78], 0.09, 0.1, [1, 0, 0]), { mat: "oak" });
    P(`ship.crutch${s}b`, boxLocal([s, 0.62, hm], [s, -0.2, hm + 0.78], 0.09, 0.1, [1, 0, 0]), { mat: "oak" });
  }
  oct([-6.0, 0.02, hm + 0.84], [7.6, 0.02, hm + 0.84], 0.16, "ship.mast", "wood");
  oct([-5.2, -0.62, hm + 0.2], [6.4, -0.62, hm + 0.2], 0.19, "ship.yard", "hide");
  // Steering oars on their quarter brackets.
  const hq = hullAt(-11.4);
  P("ship.quarter", boxLocal([-11.4, -hq.B - 0.4, hq.hs + 0.05], [-11.4, hq.B + 0.4, hq.hs + 0.05], 0.22, 0.2, [0, 0, 1]), { mat: "oak" });
  for (const sd of [1, -1]) {
    const top = [-11.2, sd * (hq.B + 0.32), hq.hs + 0.6], bot = [-13.0, sd * (hq.B + 0.6), -0.9];
    P(`ship.helm${sd}`, boxLocal(top, along(top, bot, 0.7), 0.13, 0.13, [0, sd, 0]), { mat: "wood" });
    P(`ship.helmBlade${sd}`, boxLocal(along(top, bot, 0.62), bot, 0.07, 0.44, [1, 0, 0.6]), { mat: "wood" });
  }
  return parts;
}
const SHIP = shipGeo();
const SHIP_SEG = HULL_ST.length - 1;

function pathLocal(B, F, pts) {
  return k.pathOf(pts.map((p) => B.at(xfU(F, p))));
}
// A circle of radius r on the plane spanned by local directions e1, e2 around c.
function discLocal(B, F, c, e1, e2, r, n = 14) {
  return k.pathOf(Array.from({ length: n }, (_, j) => B.at(xfU(F, add(c, add(mul(e1, r * Math.cos((j / n) * TAU)), mul(e2, r * Math.sin((j / n) * TAU))))))), true);
}

// ---------------------------------------------------------------- the water (WebGL on M.sea)
const WATER_FRAG = `
uniform float uLight;uniform float uWave;uniform vec4 uSea;uniform float uS;
uniform vec4 uHull;uniform vec4 uHullAx;uniform vec4 uHullX;uniform vec4 uShade;uniform vec4 uRip[8];
float sdCap(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-6),0.,1.);return length(pa-ba*h);}
float sdEll(vec2 p,vec2 ab){float k0=length(p/ab);float k1=length(p/(ab*ab));return k0*(k0-1.)/max(k1,1e-5);}
vec4 wv(vec2 q,vec2 d,float lam,float amp,float ph){float kk=6.2832/lam;float om=sqrt(9.81*kk)*.5;float th=kk*dot(d,q)-om*uWave+ph;return vec4(amp*sin(th),amp*kk*cos(th)*d,th);}
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  vec3 P=onFloor(vb,0.);
  vec2 q=P.xy/uS;
  float pm=pixelOf()/uCam.z/uS;
  float mask=window(q.x,uSea.x,uSea.z,.7*pm)*window(q.y,uSea.y,uSea.w,.7*pm);
  if(mask<.002){gl_FragColor=vec4(0.);return;}
  vec2 d1=normalize(vec2(.22,-1.)),d2=normalize(vec2(-.6,-1.)),d3=normalize(vec2(1.,-.3)),d4=normalize(vec2(.05,-1.));
  vec4 w1=wv(q,d1,5.2,.05,0.);
  vec4 w2=wv(q,d2,3.3,.03,1.7);
  vec4 w3=wv(q,d3,2.1,.016,4.1);
  vec4 w4=wv(q,d4,9.5,.07,2.3);
  float fn=noise2(q*2.3+vec2(uWave*.6,0.))*.6+noise2(q*5.1-vec2(0.,uWave*.9))*.4;
  vec2 nn=vec2(noise2(q*1.7+vec2(uWave*.21,-uWave*.33)),noise2(q*1.7+vec2(5.2-uWave*.17,1.3+uWave*.27)))-.5;
  vec2 grad=w1.yz+w2.yz+w3.yz+w4.yz+nn*.05;
  vec3 n=normalize(vec3(-grad*1.5,1.));
  vec3 V=towardViewer();
  vec3 r=reflect(-V,n);
  float sky=smoothstep(.2,.8,r.z);
  float c1=abs(mod(w1.w-1.5708+3.1416,6.2832)-3.1416)/(6.2832/5.2);
  float i1=floor((w1.w-1.5708)/6.2832+.5);
  float a1=dot(q,vec2(-d1.y,d1.x));
  float l1=(1.-smoothstep(.45*pm,1.25*pm,c1))*smoothstep(.55,.7,noise2(vec2(a1*.5+i1*7.31,i1*3.17)));
  float c2=abs(mod(w2.w-1.5708+3.1416,6.2832)-3.1416)/(6.2832/3.3);
  float i2=floor((w2.w-1.5708)/6.2832+.5);
  float a2=dot(q,vec2(-d2.y,d2.x));
  float l2=(1.-smoothstep(.4*pm,1.1*pm,c2))*smoothstep(.6,.72,noise2(vec2(a2*1.1+i2*5.13,i2*2.71+9.)))*.6;
  float lines=max(l1,l2)*smoothstep(5.,10.,3.3/pm);
  vec2 rel=q-uHull.xy;
  vec2 ax=uHullAx.xy;
  vec2 lc=vec2(dot(rel,ax),dot(rel,vec2(-ax.y,ax.x)));
  float sdh=sdEll(lc,max(uHull.zw,vec2(.3)));
  float lev=uHullAx.z;
  float wf=.22+.9*lev;
  float foam=uHullX.w*(1.-smoothstep(0.,wf,sdh))*smoothstep(-.3,0.,sdh)*smoothstep(.25,.65,fn+.25*lev)*min(1.,.45+lev);
  foam+=uHullX.w*uHullX.x*(1.-smoothstep(-.2,.15,sdh))*smoothstep(.45,.7,fn);
  float sp=clamp(uHullAx.w/2.,0.,1.);
  float du=uHull.z-lc.x;
  float arm=abs(abs(lc.y)-.354*du);
  float kel=sp*smoothstep(0.,1.,du)*exp(-du/12.)*exp(-pow(arm/(.18+.035*du),2.))*(.5+.5*fn);
  float ds=-uHull.z-lc.x;
  float wake=sp*smoothstep(0.,.8,ds)*exp(-ds/7.)*(1.-smoothstep(uHull.w*.3,uHull.w*1.2,abs(lc.y)))*smoothstep(.35,.6,fn);
  foam+=uHullX.w*(kel*.8+wake*.7);
  float shd=uHullX.w*(1.-smoothstep(-.5,.6,sdCap(q,uShade.xy,uShade.zw)-uHullX.z));
  float ring=0.;float disc=0.;
  for(int i=0;i<8;i++){
    vec4 R=uRip[i];
    if(R.w<=0.)continue;
    float rr=length(q-R.xy);
    float c=2.+1.4*R.w;
    float rad=c*R.z;
    float env=R.w*smoothstep(0.,.1,R.z)*exp(-R.z/2.6);
    float wd=max(.09,1.1*pm);
    float s=0.;
    for(int j=0;j<3;j++){float rj=rad-float(j)*(.7+.25*R.w);s+=exp(-pow((rr-rj)/wd,2.))*pow(.62,float(j))*smoothstep(0.,.4,rj);}
    ring+=s*env/(1.+.18*rr);
    disc+=min(1.,R.w)*exp(-R.z/1.1)*(1.-smoothstep(rad*.5,rad*.5+.5,rr))*smoothstep(.3,.6,fn+.2);
  }
  vec3 deepL=mix(vec3(.675,.765,.805),vec3(.735,.815,.85),sky);
  vec3 deepD=mix(vec3(.075,.105,.125),vec3(.12,.155,.175),sky);
  vec3 col=mix(deepD,deepL,uLight);
  col*=1.-.12*shd;
  vec3 ink=mix(vec3(.25,.32,.36),vec3(.42,.52,.58),uLight);
  col=mix(col,ink,clamp(lines*.3+ring*.6,0.,1.));
  vec3 fc=mix(vec3(.62,.68,.71),vec3(.975,.985,.99),uLight);
  col=mix(col,fc,clamp(foam+disc,0.,1.));
  float nd=(hash12(gl_FragCoord.xy+fract(uTime*.61)*91.)+hash12(gl_FragCoord.yx*1.37+fract(uTime*.37)*57.)-1.)/255.;
  col=clamp(col+nd,0.,1.);
  gl_FragColor=vec4(col*mask,mask);
}`;
let WATER = null;
function waterOf(M) {
  if (!M.sea || typeof window === "undefined") return null;
  if (WATER && WATER.canvas === M.sea) return WATER;
  const cam = { ...M.glCamera() };
  const layer = GL.glLayer({
    canvas: M.sea,
    fragment: WATER_FRAG,
    view: [M.W, M.H],
    camera: cam,
    uniforms: ["uLight", "uWave", "uHull", "uHullAx", "uHullX", "uShade", "uRip"],
    fixed: { uSea: [SEA.x0 - 0.12, SEA.y0 - 0.12, SEA.x1 + 0.12, SEA.y1 + 0.12], uS: S },
  });
  if (!layer) {
    WATER = { canvas: M.sea, layer: null };
    return WATER;
  }
  WATER = { canvas: M.sea, layer, cam, prog: layer.gl.getParameter(layer.gl.CURRENT_PROGRAM), rip: new Float32Array(32), last: -1, watching: false };
  return WATER;
}
function watchWater() {
  if (!WATER || !WATER.layer || WATER.watching) return;
  WATER.watching = true;
  const tick = () => {
    const cur = window.__siege ? window.__siege.M : null;
    if (cur && cur.def && cur.def.id !== ID) {
      WATER.layer.clear();
      WATER.watching = false;
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------- the definition
export default {
  id: ID,
  name: "Archimedes' Claw",
  short: "Claw",
  unit: U,
  view: {
    W: 1000,
    H: 640,
    azimuth: 36,
    elevation: 26,
    pad: 22,
    fit: [w(PL.x0, PL.y0, ZBED - 2.9), w(PL.x1, PL.y0, ZBED - 2.9), w(PL.x0, PL.y1, ZBED - 2.9), w(PL.x1, PL.y1, ZBED - 2.9), w(0, 8.5, 19.1), w(0, -5.3, 14.6), w(0, -5.3, 6.3)],
  },
  ground: 0,
  target: null,
  ammo: [
    { id: "claw", name: "Iron hand", look: "iron", mass: M_CLAW, radius: 0.6, cd: 1.2 },
    { id: "lead", name: "Lead pig", look: "lead", mass: 300, radius: 0.16, cd: 0.9 },
    { id: "boulder", name: "Boulder", look: "granite", mass: 500, radius: BOULDER_R, cd: 0.47 },
  ],
  controls: [
    { id: "slew", name: "Beam slew", min: -24, max: 24, step: 0.5, value: 2.5, unit: "°", digits: 1 },
    { id: "chain", name: "Chain length", min: 4, max: 14, step: 0.5, value: 11, unit: "m", digits: 1 },
    { id: "cw", name: "Counterweight", min: 10, max: 100, step: 1, value: 78, unit: "t" },
    { id: "lift", name: "Lift height", min: 1.5, max: 6.8, step: 0.1, value: 6.2, unit: "m", digits: 1 },
    { id: "approach", name: "Ship distance", min: 2.5, max: 8, step: 0.5, value: 4.5, unit: "m", digits: 1 },
  ],
  actions: [
    { id: "drop", name: "Drop", key: "d" },
    { id: "lift", name: "Lift", key: "l" },
    { id: "release", name: "Release", key: "e" },
    { id: "loose", name: "Loose", key: " ", primary: true },
  ],
  toggles: [
    { id: "cut", name: "Cutaway" },
    { id: "strobe", name: "Strobe" },
  ],
  focus: [
    { id: "beam", name: "Beam & pivot" },
    { id: "cw", name: "Counterweight" },
    { id: "winch", name: "Windlass & blocks" },
    { id: "claw", name: "Chain & claw" },
    { id: "ship", name: "Ship" },
  ],
  phases: ["approach", "load", "armed", "drop", "lift", "release", "impact", "rearm"],
  hint: "Space · loose   D · drop   L · lift   E · release",
  tourGap: 14,

  build(B, M) {
    B.plinth({ x: PL.x0 * S, y: PL.y0 * S, w: (PL.x1 - PL.x0) * S, d: (PL.y1 - PL.y0) * S, r: 10 }, { z: ZBED * S, h: 12, foot: 6, ruler: false, label: false });
    // The harbour water's fallback tint (the WebGL sea covers it).
    const sea = [w(SEA.x0, SEA.y0, 0), w(SEA.x1, SEA.y0, 0), w(SEA.x1, SEA.y1, 0), w(SEA.x0, SEA.y1, 0)];
    const waves = [];
    for (let y = SEA.y0 + 2.5; y < SEA.y1 - 1; y += 2.6)
      for (let x = SEA.x0 + 1 + ((y * 7) % 3); x < SEA.x1 - 2; x += 4.4) waves.push(k.pathOf([B.at(w(x, y, 0)), B.at(w(x + 1.6, y - 0.25, 0))]));
    B.marks("sea.tint", `<path d="${k.pathOf(sea.map(B.at), true)}" style="fill:color-mix(in srgb,#7d9fb2 34%,var(--anatomy-paper));stroke:none"/>` + B.L(waves.join(""), { tone: "faint" }), sea, { layer: -1, r: 1 });
    // City ground behind the wall, with a paved strip and a label plate.
    const pave = [];
    for (let x = PL.x0 + 1.1; x < PL.x1; x += 1.1) pave.push(k.segment(w(x, LAND.y0, LAND.top), w(x, WALL.y0, LAND.top), B.P));
    B.slab("land", { x: PL.x0 * S, y: LAND.y0 * S, w: (PL.x1 - PL.x0) * S, d: (WALL.y0 - LAND.y0) * S, r: 0.5 }, ZBED * S, (LAND.top - ZBED) * S, { mat: "stone", tone: "mid", steps: 2, inner: B.L(pave.join(""), { tone: "faint" }) });
    const lp = { x: 7.6 * S, y: -7.15 * S, w: 2.9 * S, d: 1.0 * S, r: 1.2 };
    const lines = [0.3, 0.5, 0.7].map((f, i) => k.lineOnTop([lp.x + 3, lp.y + lp.d * f], [lp.x + lp.w - 4 - i * 4, lp.y + lp.d * f], LAND.top * S + 0.8, B.P)).join("");
    B.slab("label", lp, LAND.top * S, 0.8, { mat: "bronze", tone: "mid", steps: 3, inner: B.L(k.planOutline(k.insetPlan(lp, 1.2), LAND.top * S + 0.8, B.P, 3), { tone: "faint" }), over: B.L(lines, { tone: "lo", free: true }) + B.D([B.at([lp.x + 1.6, lp.y + lp.d / 2, LAND.top * S + 0.8]), B.at([lp.x + lp.w - 1.6, lp.y + lp.d / 2, LAND.top * S + 0.8])], { size: 0.5 }) });
    // The sea wall: ashlar courses on the sea face, the section at the near end, the wall walk.
    const crs = [];
    const zs = [];
    for (let z = FOOT.top + 0.55; z < WALL.top - 0.1; z += 0.58) zs.push(z);
    for (const z of zs) crs.push(k.segment(w(WALL.x0, WALL.y1, z), w(WALL.x1, WALL.y1, z), B.P));
    const bounds = [FOOT.top, ...zs, WALL.top];
    for (let c = 0; c < bounds.length - 1; c++)
      for (let x = WALL.x0 + (c % 2 ? 0.6 : 1.2); x < WALL.x1 - 0.2; x += 1.2) crs.push(k.segment(w(x, WALL.y1, bounds[c]), w(x, WALL.y1, bounds[c + 1]), B.P));
    for (const z of zs) crs.push(k.segment(w(WALL.x1, WALL.y1, z), w(WALL.x1, WALL.y1 - 0.75, z), B.P), k.segment(w(WALL.x1, WALL.y0 + 0.75, z), w(WALL.x1, WALL.y0, z), B.P));
    crs.push(k.segment(w(WALL.x1, WALL.y1 - 0.75, ZBED), w(WALL.x1, WALL.y1 - 0.75, WALL.top), B.P), k.segment(w(WALL.x1, WALL.y0 + 0.75, ZBED), w(WALL.x1, WALL.y0 + 0.75, WALL.top), B.P));
    for (let x = WALL.x0 + 1.15; x < WALL.x1; x += 1.15) crs.push(k.segment(w(x, WALL.y0, WALL.top), w(x, PARA.y0, WALL.top), B.P));
    const R = rng(11);
    const rubble = [];
    for (let i = 0; i < 26; i++) {
      const cy = WALL.y0 + 0.95 + R() * 2.7, cz = ZBED + 0.4 + R() * (WALL.top - ZBED - 0.8), rr = 0.18 + R() * 0.16;
      rubble.push(k.pathOf(Array.from({ length: 6 }, (_, j) => B.at(w(WALL.x1, cy + rr * Math.cos(j * 1.05 + i) * 1.2, cz + rr * Math.sin(j * 1.05 + i) * 0.8))), true));
    }
    B.slab("wall", { x: WALL.x0 * S, y: WALL.y0 * S, w: (WALL.x1 - WALL.x0) * S, d: (WALL.y1 - WALL.y0) * S, r: 0.3 }, ZBED * S, (WALL.top - ZBED) * S, { mat: "stone", tone: "hi", steps: 2, inner: B.L(crs.join(""), { tone: "faint" }) + B.L(rubble.join(""), { tone: "faint" }) });
    B.slab("wall.footing", { x: WALL.x0 * S, y: WALL.y1 * S, w: (WALL.x1 - WALL.x0) * S, d: (FOOT.y1 - WALL.y1) * S, r: 0.3 }, ZBED * S, (FOOT.top - ZBED) * S, { mat: "stone", tone: "mid", steps: 2, inner: B.L(k.segment(w(WALL.x0, FOOT.y1, 0), w(WALL.x1, FOOT.y1, 0), B.P), { tone: "faint" }) });
    // Parapet: breastwork and merlons with capstones; the stretch in front of the crane is the cutaway.
    for (const [x0, x1, cut] of [[WALL.x0, -5.4, false], [-5.4, 5.6, true], [5.6, WALL.x1, false]]) B.slab(`para.${x0}`, { x: x0 * S, y: PARA.y0 * S, w: (x1 - x0) * S, d: (WALL.y1 - PARA.y0) * S, r: 0.3 }, WALL.top * S, (PARA.top - WALL.top) * S, { mat: "stone", tone: "hi", steps: 2, cut: cut || undefined, seams: [(PARA.top - 0.52) * S] });
    for (let i = 0; i < 12; i++) {
      const xc = WALL.x0 + 0.85 + i * 1.98;
      const cut = Math.abs(xc) < 5.4 ? true : undefined;
      B.slab(`merlon${i}`, { x: (xc - 0.65) * S, y: PARA.y0 * S, w: 1.3 * S, d: (WALL.y1 - PARA.y0) * S, r: 0.3 }, PARA.top * S, (PARA.cap - PARA.top) * S, { mat: "stone", tone: "hi", steps: 2, cut });
      B.slab(`merlon${i}.cap`, { x: (xc - 0.72) * S, y: (PARA.y0 - 0.07) * S, w: 1.44 * S, d: (WALL.y1 - PARA.y0 + 0.14) * S, r: 0.4 }, PARA.cap * S, (PARA.capTop - PARA.cap) * S, { mat: "stone", tone: "hi", steps: 2, bevel: 0.4, cut });
    }
    // Quay kerbs round the basin, a metre rule from the wall face, bollards.
    const kerbs = [[SEA.x1, WALL.y1, PL.x1, PL.y1], [PL.x0, WALL.y1, SEA.x0, PL.y1], [SEA.x0, SEA.y1, SEA.x1, PL.y1]];
    kerbs.forEach(([x0, y0, x1, y1], i) => B.slab(`kerb${i}`, { x: x0 * S, y: y0 * S, w: (x1 - x0) * S, d: (y1 - y0) * S, r: 0.3 }, ZBED * S, (KERB.top - ZBED) * S, { mat: "stone", tone: "mid", steps: 2, seams: [(KERB.top - 0.16) * S] }));
    const strip = { x: (SEA.x1 + 0.12) * S, y: (WALL.y1 + 0.7) * S, w: 0.32 * S, d: (SEA.y1 - WALL.y1 - 1.4) * S, r: 0.5 };
    const ticks = k.topTicks(WALL.y1 * S + S, strip.y + strip.d - 2, S, 5, strip.x + 0.5, KERB.top * S + 0.5, [0.9, 1.7], B.P, "y");
    B.slab("ruler", strip, KERB.top * S, 0.5, { mat: "bronze", tone: "lo", steps: 2, over: B.L(ticks.minor, { tone: "lo" }) + B.L(ticks.major, { tone: "mid" }) });
    for (const y of [20, 34]) {
      B.cyl(`bollard${y}`, w(10.95, y, KERB.top), w(10.95, y, KERB.top + 0.42), 0.16 * S, { mat: "stone", tone: "hi", faceRing: [{ s: 0.42 * S, r: 0.1 * S }] });
    }
    // The turntable's stone curb on the wall walk.
    B.ring("tt.curb", w(TT.x, TT.y, WALL.top), w(TT.x, TT.y, ZCURB), 1.45 * S, 1.98 * S, { mat: "stone", tone: "mid", sys: "beam" });
    // Ammunition rack: chocks for the boulders, sleepers under the lead pigs.
    const bp = spotXY("boulder");
    for (const dy of [-0.22, 0.22]) B.beam(`rack.chock${dy}`, w(bp[0] - 1.2, bp[1] + dy, WALL.top + 0.06), w(bp[0] + 1.2, bp[1] + dy, WALL.top + 0.06), { w: 0.12 * S, h: 0.12 * S, up: [0, 0, 1], mat: "oak" });
    const lpp = spotXY("lead");
    for (const dy of [-0.18, 0.18]) B.beam(`rack.sleeper${dy}`, w(lpp[0] - 0.42, lpp[1] + dy, WALL.top + 0.04), w(lpp[0] + 0.42, lpp[1] + dy, WALL.top + 0.04), { w: 0.1 * S, h: 0.08 * S, up: [0, 0, 1], mat: "oak" });
  },

  init(M) {
    const d = M.ctrl.approach;
    const gallery = !!M.gallery;
    const start = gallery ? shipY(d) : Math.min(shipY(d) + 7, SEA.y1 - 0.9 - 14.6);
    const ship = freshShip(d);
    ship.y[1] = start;
    const sg = rad(M.ctrl.slew);
    return {
      mode: gallery ? "idle" : "approach",
      queue: [],
      sg,
      sgS: { x: sg, v: 0 },
      al: A0,
      ch: CH_HOIST,
      grip: 0,
      cm: 0,
      att: null,
      Lc: 0,
      pend: [0, 0],
      landed: null,
      lifted: false,
      carry: M.ammo.id,
      stock: { lead: 3, boulder: 3 },
      ship,
      row: { y0: start, y1: shipY(d), t: 0, dur: 1.6 + Math.abs(start - shipY(d)) / 1.5, ph: 0, rest: gallery ? 1 : 0 },
      rings: [],
      sim: null,
      lastT: 0,
      plan: null,
      foot: null,
      last: { E: 0, v: 0, T: 0 },
      rearm: null,
      drum: 0,
    };
  },

  // ------------------------------------------------------------ actions
  act(M, id) {
    const st = M.state;
    const kind = M.ammo.id;
    let q = null;
    if (id === "loose") {
      if (kind === "claw") {
        if (st.carry === "claw" && st.cm === 0) q = ["cycle"];
        else if (st.cm === 2 && st.lifted) q = ["release"];
        else if (st.cm === 2 || st.cm === 3 || (st.cm === 0 && st.landed === "air")) q = ["liftrel"];
        else q = ["load", "cycle"];
      } else q = st.carry === kind && st.cm === 0 ? ["drop"] : ["load", "drop"];
    }
    if (id === "drop") {
      if (kind === "claw") q = st.carry === "claw" && st.cm === 0 && !st.landed ? ["drop"] : st.cm === 0 && st.carry !== "claw" ? ["load", "drop"] : null;
      else q = st.carry === kind && st.cm === 0 ? ["drop"] : ["load", "drop"];
    }
    if (id === "lift" && kind === "claw" && (st.cm === 2 || st.cm === 3 || st.landed === "air") && !st.lifted) q = ["lift"];
    if (id === "release") {
      if (kind === "claw" && (st.cm === 2 || st.cm === 3 || st.landed)) q = st.cm === 2 && !st.lifted ? ["liftrel"] : ["release"];
      if (kind !== "claw") q = st.carry === kind && st.cm === 0 ? ["drop"] : ["load", "drop"];
    }
    if (!q) return;
    st.queue = q;
    if (st.mode === "idle") this.next(M);
  },

  next(M) {
    const st = M.state;
    if (st.mode !== "idle" || !st.queue.length) return;
    const step = st.queue.shift();
    const kind = M.ammo.id;
    if (step === "load") {
      if (st.cm !== 0 || st.landed) {
        st.queue = [];
        return;
      }
      if (st.carry === kind) return this.next(M);
      return this.startLoad(M, kind);
    }
    if (step === "cycle") {
      if (kind !== "claw" || st.carry !== "claw") return;
      return this.shoot(M, { drop: true, lift: true, hold: 2.4, release: true });
    }
    if (step === "drop") {
      if (kind === "claw") return st.carry === "claw" ? this.shoot(M, { drop: true }) : null;
      if (st.carry === kind) return this.shoot(M, { weight: true });
      return;
    }
    if (step === "lift") return this.shoot(M, { lift: true, hold: 3.2 });
    if (step === "liftrel") return this.shoot(M, { lift: true, hold: 2.2, release: true });
    if (step === "release") return this.shoot(M, { release: true });
  },

  shoot(M, flags) {
    const st = M.state;
    const sim = simulate(M, st, flags);
    st.sim = sim;
    st.flags = flags;
    st.mode = "shot";
    st.lastT = 0;
    st.fired = 0;
    M.startShot(sim.T, sim.marks);
    M.setPhase(sim.phases[0] ? sim.phases[0][1] : "drop");
    if (flags.drop || flags.weight) M.sfx?.("click", { gain: 0.6 });
    if (flags.lift && !flags.drop) M.sfx?.("creak", { pitch: 0.8 });
  },

  startLoad(M, kind) {
    const st = M.state;
    const steps = [];
    let at = st.sg;
    const go = (a) => {
      steps.push({ sg: a, dur: 0.7 + Math.abs(a - at) * 1.05 });
      at = a;
    };
    if (st.carry) {
      go(SPOT[st.carry]);
      steps.push({ ch: chFloor(st.carry), dur: 1.3 });
      steps.push({ put: true, dur: 0.35 });
      steps.push({ ch: CH_HOIST, dur: 1.0 });
    }
    go(SPOT[kind]);
    steps.push({ ch: chFloor(kind), dur: 1.3 });
    steps.push({ take: kind, dur: 0.4 });
    steps.push({ ch: CH_HOIST, dur: 1.2 });
    go(rad(M.ctrl.slew));
    st.plan = { steps, i: 0, t: 0, from: { sg: st.sg, ch: st.ch } };
    st.mode = "plan";
    M.setPhase("load");
  },

  onControl(M, id) {
    const st = M.state;
    if (id === "approach" && !st.live && (st.mode === "idle" || st.mode === "approach") && st.cm === 0 && !st.landed && st.ship.y[10] < 0.5 && !st.ship.holes.length) {
      const y0 = st.ship.y[1];
      const y1 = shipY(M.ctrl.approach);
      st.row = { y0, y1, t: 0, dur: 1.6 + Math.abs(y1 - y0) / 1.5, ph: st.row ? st.row.ph : 0, rest: 0 };
      st.mode = "approach";
      M.setPhase("approach");
    }
    M.dirty = true;
  },
  onAmmo(M) {
    const st = M.state;
    if (st.mode === "idle" && st.cm === 0 && !st.landed && st.carry !== M.ammo.id) {
      st.queue = ["load"];
      this.next(M);
    }
    M.dirty = true;
  },
  onToggle(M) {
    M.dirty = true;
  },

  endShot(M) {
    const st = M.state;
    const sim = st.sim;
    if (!sim) return;
    this.fireEvents(M, sim.T + 1e-3);
    const f = sim.final;
    st.ship.y = f.y.slice();
    st.live = true;
    st.endWall = typeof performance !== "undefined" ? performance.now() : 0;
    st.ship.holes = f.holes;
    st.ship.loads = f.loads;
    st.al = f.al;
    st.ch = f.ch;
    st.grip = f.grip;
    st.cm = f.cm;
    st.att = f.att;
    st.Lc = f.Lc;
    st.pend = [0, 0];
    st.last = { E: sim.stats.E, v: sim.stats.v, T: sim.stats.T, kind: sim.kind };
    st.sim = null;
    const flags = st.flags || {};
    if (flags.weight) {
      st.carry = null;
      st.cm = 0;
      st.landed = null;
      st.mode = "idle";
    } else if (flags.release) {
      st.ship.dis = Math.max(st.ship.dis, f.cm === 4 ? 1 : 0);
      st.landed = null;
      st.lifted = false;
      st.rearm = { t: 0, dur: 4.2, from: { al: st.al, ch: st.ch, grip: st.grip } };
      st.mode = "rearm";
      M.setPhase("rearm");
      return;
    } else {
      st.landed = f.landed;
      st.lifted = !!f.lifted;
      if (flags.drop && f.landed === "air") st.cm = 0;
      st.mode = "idle";
    }
    this.phaseIdle(M);
    this.next(M);
  },

  phaseIdle(M) {
    const st = M.state;
    M.setPhase(st.cm === 2 && st.lifted ? "lift" : st.cm !== 0 || st.landed ? "drop" : "armed");
  },

  tour(M) {
    const st = M.state;
    if (st.mode !== "idle" || st.live) return;
    if (performance.now() - (st.endWall || 0) < 9000) return;
    if (st.ship.y[10] > 1 || st.ship.holes.length || st.ship.dis > 0.5) {
      const d = M.ctrl.approach;
      st.ship = freshShip(d);
      st.live = false;
      const start = Math.min(shipY(d) + 7, SEA.y1 - 0.9 - 14.6);
      st.ship.y[1] = start;
      st.row = { y0: start, y1: shipY(d), t: 0, dur: 1.6 + Math.abs(start - shipY(d)) / 1.5, ph: 0, rest: 0 };
      st.mode = "approach";
      st.queue = M.ammo.id === "claw" ? [] : [];
      M.setPhase("approach");
      return;
    }
    this.act(M, "loose");
  },

  // ------------------------------------------------------------ time
  update(M, dt) {
    const st = M.state;
    let moving = false;
    // Rings on the water age in real time.
    st.rings = st.rings.filter((r) => M.time - r.tb < 9);
    if (st.mode === "idle" && st.cm === 0 && !st.landed) {
      const target = rad(M.ctrl.slew);
      if (Math.abs(st.sgS.x - target) > 1e-4 || Math.abs(st.sgS.v) > 1e-4) {
        const before = st.sgS.x;
        GL.settle(st.sgS, target, dt, 0.7, M.calm);
        st.sg = st.sgS.x;
        if (Math.abs(st.sg - before) > 1e-5) M.sfx?.("tick", { gap: 0.12, gain: 0.25 });
        moving = true;
      }
    } else st.sgS = { x: st.sg, v: 0 };
    if (st.mode === "approach") {
      const r = st.row;
      r.t += dt;
      const u = clamp(r.t / r.dur, 0, 1);
      const e = u * u * (3 - 2 * u);
      const yy = r.y0 + (r.y1 - r.y0) * e;
      const speed = Math.abs(r.y1 - r.y0) * 6 * u * (1 - u) / r.dur;
      const prevPh = r.ph;
      r.ph += dt * TAU * 0.55 * (u < 1 ? 1 : 0);
      r.rest = smoothstep(0.82, 1, u);
      st.ship.y[1] = yy;
      st.ship.y[2] = 0.03 * Math.sin(r.ph) * (1 - r.rest);
      st.ship.y[3] = rad(0.25) * Math.sin(r.ph + 0.6) * (1 - r.rest);
      st.speed = speed;
      // Oar blades catch the water once a stroke: rings and a little spray.
      if (Math.floor(prevPh / TAU) !== Math.floor(r.ph / TAU) && r.rest < 0.5) {
        const F = shipFrame(st.ship.y);
        for (const sd of [1, -1]) for (const s of [-5, 0, 5]) {
          const p = xf(F, s + 0.6, sd * 5.6, 0);
          if (st.rings.length < 30 && sd > 0) st.rings.push({ x: p[0], y: p[1], tb: M.time, s: 0.12 });
          if (!M.calm && sd > 0) M.fx.emit("splash", w(p[0], p[1], 0.05), { n: 4, v: [0, 0, 1.6 * S], spread: 0.7 * S, size: 0.35 * S, life: 0.7, grav: 1, alpha: 0.8 });
        }
        M.sfx?.("splash", { gain: 0.12, size: 0.4, gap: 0.3 });
      }
      if (u >= 1) {
        st.ship.y[2] = 0;
        st.ship.y[3] = 0;
        st.speed = 0;
        st.mode = "idle";
        this.phaseIdle(M);
        this.next(M);
      }
      moving = true;
    }
    if (st.mode === "plan") {
      const pl = st.plan;
      const step = pl.steps[pl.i];
      if (pl.t === 0) {
        pl.from = { sg: st.sg, ch: st.ch };
        if (step.put) {
          if (st.carry && st.carry !== "claw") st.stock[st.carry] = Math.min(3, st.stock[st.carry] + 1);
          st.carry = null;
          M.sfx?.("clank", { gain: 0.5 });
        }
        if (step.take) {
          st.carry = step.take;
          if (step.take !== "claw") st.stock[step.take] = Math.max(0, st.stock[step.take] - 1);
          st.grip = step.take === "claw" ? 0.45 : 0;
          M.sfx?.("clank", { gain: 0.6 });
        }
      }
      pl.t += dt;
      const u = M.calm ? 1 : ease(clamp(pl.t / step.dur, 0, 1));
      if (step.sg !== undefined) st.sg = pl.from.sg + (step.sg - pl.from.sg) * u;
      if (step.ch !== undefined) {
        const before = st.ch;
        st.ch = pl.from.ch + (step.ch - pl.from.ch) * u;
        st.drum += (st.ch - before) / RCD;
        if (Math.abs(st.ch - before) > 1e-4) M.sfx?.("tick", { gap: 0.09, gain: 0.3 });
      }
      if (pl.t >= step.dur || M.calm) {
        pl.i++;
        pl.t = 0;
        if (pl.i >= pl.steps.length) {
          st.plan = null;
          st.sgS = { x: st.sg, v: 0 };
          if (st.carry === "claw") st.grip = 0;
          st.mode = "idle";
          this.phaseIdle(M);
          this.next(M);
        }
      }
      moving = true;
    }
    if (st.mode === "rearm") {
      const r = st.rearm;
      r.t += dt;
      const u = M.calm ? 1 : ease(clamp(r.t / r.dur, 0, 1));
      const alPrev = st.al;
      st.al = r.from.al + (A0 - r.from.al) * u;
      st.ch = r.from.ch + (CH_HOIST - r.from.ch) * u;
      st.grip = r.from.grip + (0 - r.from.grip) * u;
      if (Math.abs(st.al - alPrev) > 1e-5) M.sfx?.("tick", { gap: 0.11, gain: 0.35 });
      if (u >= 1) {
        st.al = A0;
        st.ch = CH_HOIST;
        st.grip = 0;
        st.cm = 0;
        st.att = null;
        st.mode = "idle";
        this.phaseIdle(M);
        this.next(M);
      }
      moving = true;
    }
    // After a shot the ship keeps obeying the same equations live: settling, flooding, hanging.
    if (st.live && st.mode !== "shot" && st.mode !== "approach" && dt > 0) {
      const n = Math.min(8, Math.ceil(dt / 0.01));
      const h = dt / n;
      const ext = { chain: null, holes: st.ship.holes, loads: st.ship.loads };
      if (st.cm === 2 && st.att) ext.chain = { s: st.att[0], t: st.att[1], h: st.att[2], L: st.Lc, tip: crane(st.sg, st.al).dep };
      const out = {};
      for (let i = 0; i < n; i++) st.ship.y = shipStep(st.ship.y, ext, h, out);
      st.liveT = out.T;
      const v = st.ship.y;
      this.continuousFx(M, { y: v.slice(0, 5), v: v.slice(5, 10), q: out.q, qs: out.qs, qt: out.qt }, dt);
      if (Math.abs(v[5]) + Math.abs(v[6]) + Math.abs(v[7]) < 0.004 && Math.abs(v[8]) + Math.abs(v[9]) < 0.0006 && out.q < 0.003) {
        for (let i = 5; i < 10; i++) v[i] = 0;
        st.live = false;
        st.endWall = performance.now();
      }
      moving = true;
    }
    if (st.mode === "shot" && M.shot && st.sim) {
      const t = M.shot.t;
      this.fireEvents(M, t);
      const ph = st.sim.phases.filter((p) => p[0] <= t + 1e-6).pop();
      if (ph) M.setPhase(ph[1]);
      this.continuousFx(M, st.sim.rec.at(t), dt);
      moving = true;
    }
    return moving;
  },

  // One-shot effects at their recorded times (only while the shot plays forward).
  fireEvents(M, now) {
    const st = M.state;
    const sim = st.sim;
    if (!sim) return;
    const prev = st.lastT;
    st.lastT = now;
    if (now <= prev || now - prev > 0.6) return;
    for (const e of sim.events) {
      if (e.t <= prev || e.t > now) continue;
      const P = W(e.p);
      const calm = M.calm;
      const ring = (x, y, s) => st.rings.push({ x, y, tb: M.time - (now - e.t), s });
      if (e.k === "bite") {
        if (!calm) {
          M.fx.emit("splinter", P, { n: 10, v: [0, 0, 2.2 * S], spread: 1.6 * S, size: 0.16 * S, life: 1.4, grav: 1, bounce: 0.2 });
          M.fx.emit("dust", P, { n: 4, v: [0, 0, 0.5 * S], spread: 0.4 * S, size: 0.4 * S, grow: 1.4 * S, life: 1.6, alpha: 0.5, drag: 1.5 });
        }
        M.sfx?.("thunk", { gain: 0.9 });
        M.sfx?.("clank", { gain: 0.6, at: 0.05 });
      }
      if (e.k === "dunk" || e.k === "plunge" || e.k === "through" || e.k === "slam") {
        const big = e.k === "slam" ? clamp(e.v / 4, 0.6, 1.6) : e.k === "plunge" ? 1.1 : e.k === "through" ? 0.6 : 0.45;
        ring(e.p[0], e.p[1], big);
        if (e.k === "slam") {
          const F = shipFrame(sim.rec.at(e.t).y);
          for (const s of [-6, 2]) {
            const p = xf(F, s, 0, 0);
            ring(p[0], p[1], big * 0.5);
          }
        }
        if (!calm) {
          M.fx.emit("splash", P, { n: Math.round(46 * big), v: [0, 0, 5.2 * big * S], spread: 2.6 * big * S, size: 0.5 * S, grow: 0.8 * S, life: 1.7, grav: 1, alpha: 0.95, jitter: 0.7 * S });
          M.fx.emit("splash", P, { n: Math.round(20 * big), v: [0, 0, 2.2 * big * S], spread: 3.4 * big * S, size: 0.35 * S, life: 1.2, grav: 1, alpha: 0.9, jitter: 1.2 * S });
          M.fx.emit("mist", add(P, [0, 0, 0.8 * S]), { n: Math.round(18 * big), v: [0, 0, 1.8 * S], spread: 1.5 * big * S, size: 1.8 * S, grow: 6 * S, life: 2.8, alpha: 0.6, drag: 1.3, buoy: 0.4 * S, jitter: 1 * S });
          if (e.k === "slam") {
            const F = shipFrame(sim.rec.at(e.t).y);
            for (let i = 0; i < 6; i++) {
              const p = W(xf(F, -8 + i * 3.4, 2.6 * (i % 2 ? 1 : -1), 0.2));
              M.fx.emit("splash", p, { n: 14, v: [0, 0, 3 * S], spread: 1.6 * S, size: 0.3 * S, life: 1.3, grav: 1, alpha: 0.85 });
            }
            M.fx.emit("splinter", P, { n: 12, v: [0, 0, 3 * S], spread: 2 * S, size: 0.2 * S, life: 2, grav: 1 });
          }
        }
        M.sfx?.(e.k === "slam" ? "whump" : "splash", { gain: Math.min(1, 0.4 + big * 0.4), size: big });
        if (e.k === "slam") M.sfx?.("splash", { size: 1.6, gain: 0.9, at: 0.08 });
      }
      if (e.k === "impact") {
        const E = e.E / 1000;
        if (!calm) {
          M.fx.emit("splinter", P, { n: Math.round(14 + E * 0.9), v: [0, 0, 3.4 * S], spread: 2.4 * S, size: 0.2 * S, life: 2.2, grav: 1, bounce: 0.25 });
          M.fx.emit("debris", P, { n: Math.round(4 + E * 0.2), v: [0, 0, 2.4 * S], spread: 1.8 * S, size: 0.24 * S, life: 2, grav: 1, bounce: 0.2 });
          M.fx.emit("dust", P, { n: 8, v: [0, 0, 0.8 * S], spread: 0.8 * S, size: 0.6 * S, grow: 2.4 * S, life: 2.2, alpha: 0.6, drag: 1.4 });
        }
        M.sfx?.("crack", { gain: 1 });
        M.sfx?.("thud", { gain: 0.9, size: 1.2 });
      }
      if (e.k === "through" && !calm) M.fx.emit("liquid", add(P, [0, 0, 0.4 * S]), { n: 26, v: [0, 0, 5 * S], spread: 0.9 * S, size: 0.3 * S, life: 1.2, grav: 1, alpha: 0.9 });
      if (e.k === "emerge" && !calm) M.fx.emit("liquid", P, { n: 18, v: [0, 0, -0.5 * S], spread: 0.5 * S, size: 0.22 * S, life: 1.1, grav: 1, alpha: 0.8, jitter: 0.4 * S });
      if (e.k === "knock") {
        if (!calm) {
          M.fx.emit("debris", P, { n: 5, v: [0, 1.2 * S, 1.4 * S], spread: 1.2 * S, size: 0.16 * S, life: 1.6, grav: 1 });
          M.fx.emit("dust", P, { n: 5, v: [0, 0.4 * S, 0.5 * S], spread: 0.5 * S, size: 0.5 * S, grow: 1.8 * S, life: 1.8, alpha: 0.55, drag: 1.4 });
        }
        M.sfx?.("thud", { gain: 0.7 });
      }
      if (e.k === "release") {
        M.sfx?.("clank", { gain: 0.8 });
        M.sfx?.("creak", { pitch: 1.3, gain: 0.7, at: 0.05 });
      }
      if (e.k === "trip") M.sfx?.("clank", { gain: 0.6 });
      if (e.k === "clank") M.sfx?.("clank", { gain: 0.7 });
      if (e.k === "creak") M.sfx?.("creak", { pitch: 0.7 });
      if (e.k === "stall") M.sfx?.("creak", { pitch: 0.55, gain: 0.8 });
    }
  },

  // Water streaming off a lifted hull, pouring in over a drowned gunwale.
  continuousFx(M, f, dt) {
    if (M.calm || !f) return;
    const F = shipFrame(f.y);
    if (f.v[2] > 0.25 || f.v[3] > 0.04) {
      for (let i = 0; i < 2; i++) {
        const s = 5 + Math.random() * 8;
        const p = xf(F, s, (Math.random() - 0.5) * 1.6, hullAt(s).hk + 0.2);
        if (p[2] > 0.1 && p[2] < 3) M.fx.emit("liquid", W(p), { n: 1, v: [0, 0, -0.4 * S], spread: 0.2 * S, size: 0.18 * S, life: 0.9, grav: 1, alpha: 0.75 });
      }
    }
    if (f.q > 0.25) {
      const s = f.qs, t = f.qt;
      const p = xf(F, s, t, hullAt(clamp(s, S_STERN, S_BOW)).hs);
      M.fx.emit("splash", W(p), { n: Math.min(4, Math.round(f.q)), v: [0, 0, 0.8 * S], spread: 0.6 * S, size: 0.3 * S, life: 0.8, grav: 1, alpha: 0.8 });
    }
  },

  // ------------------------------------------------------------ the pose drawn this frame
  pose(M) {
    const st = M.state;
    if (st.mode === "shot" && M.shot && st.sim) {
      const f = st.sim.rec.at(M.shot.t);
      return {
        sg: st.sg,
        al: f.al + f.dl,
        alRaw: f.al,
        ch: f.ch,
        grip: f.gr,
        cm: Math.round(f.cm),
        ring: f.r,
        att: f.a,
        T: f.T,
        Fw: f.Fw,
        y: f.y,
        v: f.v,
        fl: f.f,
        wm: Math.round(f.wm),
        wz: f.wz,
        wp: f.wp,
        holes: st.sim.final.holes.slice(0, Math.round(f.hl)),
        loads: st.sim.final.loads.slice(0, Math.round(f.ld)),
        carry: st.sim.kind === "claw" ? "claw" : Math.round(f.wm) === 0 ? st.sim.kind : null,
        q: f.q,
        speed: 0,
        wloc: st.sim.final.wloc,
      };
    }
    const cr = crane(st.sg, st.al);
    const dep = cr.dep;
    let ring;
    if (st.cm === 2 && st.att) {
      const F = shipFrame(st.ship.y);
      const pa = xf(F, st.att[0], st.att[1], st.att[2]);
      ring = add(pa, mul(unit(sub(dep, pa)), CLAW_GRIP));
    } else ring = [dep[0], dep[1], dep[2] - st.ch];
    const mcw = M.ctrl.cw * 1000;
    const Tc = st.carry === "claw" || st.cm ? (M_CLAW + 25 * st.ch) * GR : st.carry ? (WEIGHTS[st.carry].m + 25 * st.ch) * GR : 25 * st.ch * GR;
    const sx = statics(cr, st.cm === 2 ? 0 : Tc, [0, 0, -1], mcw);
    return {
      sg: st.sg,
      al: st.al,
      alRaw: st.al,
      ch: st.ch,
      grip: st.grip,
      cm: st.cm,
      ring,
      att: st.att || [0, 0, 0],
      T: st.cm === 2 ? (st.lifted ? st.liveT ?? st.last.T : 0) : Tc,
      Fw: sx.Fw,
      y: st.ship.y.slice(0, 5),
      v: st.ship.y.slice(5, 10),
      fl: st.ship.y.slice(10, 13),
      wm: 0,
      wz: 0,
      wp: [0, 0, 0],
      holes: st.ship.holes,
      loads: st.ship.loads,
      carry: st.carry,
      q: 0,
      speed: st.mode === "approach" ? st.speed || 0 : 0,
      wloc: null,
    };
  },

  draw(B, M) {
    const st = M.state;
    const p = this.pose(M);
    const cr = crane(p.sg, p.al);
    const mcw = M.ctrl.cw;
    const tl = tackleLen(crane(p.sg, p.alRaw)) - tackleLen(crane(p.sg, A0));
    // The drum is redrawn in 1/48-turn steps (a pawl click is 1/14 turn).
    const drumW = Math.round(((tl * TACKLE) / 0.2) / (TAU / 48)) * (TAU / 48);
    B.keep("crane.base", [p.sg.toFixed(4)], () => drawBase(B, cr));
    B.keep("crane.winch", [p.sg.toFixed(4), drumW.toFixed(3)], () => drawWindlass(B, cr, drumW));
    B.keep("crane.beam", [p.sg.toFixed(4), p.al.toFixed(5), mcw, (p.ch + st.drum * 0).toFixed(3)], () => drawBeam(B, cr, mcw, p.ch));
    B.keep("crane.chain", [p.sg.toFixed(4), p.al.toFixed(5), p.ring.map((x) => x.toFixed(3)).join(), p.grip.toFixed(3), p.cm, p.carry, p.wm, p.y.map((x) => x.toFixed(4)).join()], () => drawChain(B, M, cr, p));
    const oarKey = st.mode === "approach" ? [st.row.ph.toFixed(3), st.row.rest.toFixed(3)] : [st.ship.dis, st.row ? st.row.rest : 1];
    B.keep("ship", [p.y.map((x) => x.toFixed(4)).join(), oarKey.join(), p.holes.length, p.fl[0].toFixed(2)], () => drawShip(B, M, p));
    B.keep("pile", [p.carry, st.stock.lead, st.stock.boulder, M.ammo.id], () => drawPile(B, M, p));
    if (p.wm === 1) drawWeight(B, "fallw", [p.wp[0] * S, p.wp[1] * S, p.wp[2] * S], st.sim.kind, { lit: true, falling: true });
    if (p.wm === 4 && p.wloc) {
      const F = shipFrame(p.y);
      const kd = st.sim ? st.sim.kind : "lead";
      const c = xf(F, p.wloc[0], p.wloc[1], p.wloc[2] + WEIGHTS[kd].size + 0.1);
      drawWeight(B, "deckw", W(c), kd, { lit: true, falling: true });
    }
    if (M.toggles.strobe && st.sim && M.shot) drawStrobe(B, M, st.sim, M.shot.t);
    // The sea needs the hull's waterline footprint and its shadow.
    st.footPose = { y: p.y, v: p.v, fl: p.fl, speed: p.speed };
  },

  occluders(M) {
    return [
      { min: w(WALL.x0, WALL.y0, ZBED), max: w(WALL.x1, WALL.y1, WALL.top) },
      { min: w(WALL.x0, PARA.y0, WALL.top), max: w(WALL.x1, WALL.y1, PARA.top) },
    ];
  },

  measure(M) {
    const st = M.state;
    const p = this.pose(M);
    const mf = RHO * Math.max(0, p.fl[0]);
    const lo = p.loads.reduce((s, l) => s + l.m, 0);
    const cr = crane(p.sg, p.alRaw);
    return {
      T: p.T,
      Fw: p.Fw,
      tauW: M.ctrl.cw * 1000 * GR * RI * Math.cos(p.alRaw),
      al: p.alRaw,
      bow: stemZ(p.y),
      pitch: p.y[3],
      heel: p.y[4],
      mass: MASS + mf + lo,
      flood: mf,
      tip: cr.dep[2],
      E: st.mode === "shot" && st.sim && M.shot && st.sim.events.some((e) => e.t <= M.shot.t && (e.k === "slam" || e.k === "impact" || e.k === "plunge")) ? st.sim.stats.E : st.mode === "shot" ? 0 : st.last.E,
      v: st.mode === "shot" && st.sim ? st.sim.stats.v : st.last.v,
    };
  },

  readouts(M) {
    const r = this.measure(M);
    return [
      ["Chain tension", fmtInt(r.T / 1000), "kN"],
      ["Mech. advantage", fmt(MA, 1), ": 1"],
      ["Counterweight", fmtInt(r.tauW / 1000), "kN·m"],
      ["Windlass push", fmt(Math.max(0, r.Fw) / 1000, 1), `kN / ${fmt(CREW / 1000, 1)}`],
      ["Beam tilt", fmt(deg(r.al), 1), "°"],
      ["Bow lift", fmt(r.bow, 2), "m"],
      ["Pitch", fmt(deg(r.pitch), 1), "°"],
      ["Heel", fmt(deg(r.heel), 1), "°"],
      ["Ship mass", fmt(r.mass / 1000, 1), "t"],
      ["Floodwater", fmt(r.flood / 1000, 1), "t"],
      ["Drop speed", fmt(r.v, 1), "m/s"],
      ["Impact energy", fmt(r.E / 1000, 1), "kJ"],
    ];
  },

  corner(M) {
    const r = this.measure(M);
    return `${M.phase} · ${fmtInt(r.T / 1000)} kN · bow ${r.bow >= 0 ? "+" : ""}${fmt(r.bow, 1)} m`;
  },

  ammoIcon(a) {
    const ic = looks.icon(() => {}, [1.2, 1.2, 1.2], { width: 64, height: 46 });
    const B = createBuilder(ic.collector, { unit: 1 });
    if (a.id === "claw") drawClaw(B, "ic", [0, 0, 1.15], [0, 0, -1], [1, 0, 0], 0.15, { k: 1.25 });
    else if (a.id === "lead") leadPig(B, "ic", [0, 0, -0.3], [1, 0, 0], 3.2, false);
    else looks.stone(B, "ic", [0, 0, 0], 1.0, { mat: "granite", seed: 4 });
    return ic.finish();
  },

  // ------------------------------------------------------------ the sea
  renderGl(M, light) {
    const L = waterOf(M);
    if (!L || !L.layer) return;
    const st = M.state;
    const busy = st.mode !== "idle" || !!M.shot || st.rings.length > 0;
    const now = performance.now() / 1000;
    if (!busy && !M.dirty && L.last >= 0 && now - L.last < 1 / 24 && now >= L.last && L.light === light && L.M === M) return;
    if (M.calm && !M.dirty && L.last >= 0 && L.light === light && !busy && L.M === M) return;
    L.last = now;
    L.M = M;
    L.light = light;
    const gl = L.layer.gl;
    gl.useProgram(L.prog);
    Object.assign(L.cam, M.glCamera());
    const fp = st.footPose || { y: st.ship.y, v: [0, 0, 0, 0, 0], fl: [0, 0, 0], speed: 0 };
    const F = shipFrame(fp.y);
    // Waterline footprint from the hull's station sections.
    let umin = 1e9, umax = -1e9;
    const Sh = unit([F.S[0], F.S[1], 0]);
    const Th = [-Sh[1], Sh[0], 0];
    for (const hs of HS) {
      const zs = F.O[2] + F.S[2] * hs.s;
      const r = clipArea(hs.poly, F.T[2], F.H[2], -zs);
      if (!r || r.A < 0.02) continue;
      const c = xf(F, hs.s, r.t, 0);
      const u = dot(sub(c, F.O), Sh);
      umin = Math.min(umin, u);
      umax = Math.max(umax, u);
    }
    const present = umax > umin ? 1 : 0;
    const cx = F.O[0] + Sh[0] * (umin + umax) * 0.5, cy = F.O[1] + Sh[1] * (umin + umax) * 0.5;
    const half = present ? (umax - umin) * 0.5 + HDS * 0.5 : 0.3;
    const lev = clamp(Math.abs(fp.v[2]) * 0.6 + Math.abs(fp.v[3]) * 5 + Math.abs(fp.v[4]) * 3 + fp.speed * 0.25 + Math.max(0, fp.fl[0]) * 0.012, 0, 1.4);
    const swamp = clamp((Math.max(0, fp.fl[0]) * RHO - 15000) / 60000, 0, 1);
    // Shadow of the hull cast toward the wall by the kit's light.
    const Lg = G.lightOf(M.P);
    const sh = (p) => [p[0] - (Lg[0] * p[2]) / Lg[2], p[1] - (Lg[1] * p[2]) / Lg[2]];
    const a = sh(xf(F, -11, 0, 1.6)), b = sh(xf(F, 11, 0, 2.0));
    const rip = L.rip;
    rip.fill(0);
    const rings = st.rings.slice(-8);
    rings.forEach((r, i) => rip.set([r.x, r.y, Math.max(0, M.time - r.tb), r.s], i * 4));
    L.layer.draw(
      {
        uLight: light,
        uWave: M.calm ? 3.0 : M.time,
        uHull: [cx, cy, Math.max(0.3, half), 2.0],
        uHullAx: [Sh[0], Sh[1], lev, fp.speed],
        uHullX: [swamp, 0, 1.4, present],
        uShade: [a[0], a[1], b[0], b[1]],
        uRip: rip,
      },
      M.calm ? 3.0 : M.time,
    );
    watchWater();
  },
};

// ---------------------------------------------------------------- crane drawing
function spotXY(kind) {
  const a = SPOT[kind];
  return [TT.x + REACH * Math.sin(a), TT.y + REACH * Math.cos(a)];
}

function drawBase(B, cr) {
  const o = { mat: "oak", sys: "beam" };
  // Turntable deck: planks run with the beam, so they show the slew.
  const F = { o: w(TT.x, TT.y, ZCURB), a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };
  const planks = [];
  for (let l = -1.6; l <= 1.61; l += 0.4) {
    const hw = Math.sqrt(Math.max(0, TT.r * TT.r - l * l)) * 0.985;
    planks.push(k.pathOf([B.at(W(cr.deck(-hw, l, 0))), B.at(W(cr.deck(hw, l, 0)))]));
  }
  const bolts = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * TAU + cr.sg;
    return B.at(w(TT.x + Math.cos(a) * (TT.r - 0.14), TT.y + Math.sin(a) * (TT.r - 0.14), ZDECK));
  });
  B.prism("tt.deck", F, polyCircle(TT.r * S, 20, -cr.sg), 0, 0.25 * S, { ...o, tone: "hi", inner: B.L(planks.join(""), { tone: "faint" }), over: B.D(bolts, { size: 0.5, tone: "hi" }) });
  // Post, crosshead, fork cheeks.
  B.beam("post", w(TT.x, TT.y, ZDECK), w(TT.x, TT.y, ZP - 0.74), { w: 0.56 * S, h: 0.56 * S, up: cr.dh, ...o, grain: 2, bands: [{ at: 0.45 * S }, { at: 2.4 * S }, { at: 4.6 * S }] });
  const XH = { o: W([TT.x, TT.y, ZP - 0.74]), a: cr.lt, u: cr.dh, v: [0, 0, 1] };
  B.prism("crosshead", XH, polyRect(0.74 * S, 0.34 * S, 0, 0.17 * S), -0.66 * S, 0.66 * S, { ...o, tone: "hi" });
  for (const sd of [-1, 1]) {
    const CF = { o: W([TT.x, TT.y, ZP - 0.4]), a: cr.lt, u: cr.dh, v: [0, 0, 1] };
    const s0 = sd > 0 ? 0.34 : -0.54, s1 = sd > 0 ? 0.54 : -0.34;
    const strap = [B.at(W(add([TT.x, TT.y, ZP - 0.4], add(mul(cr.lt, sd * 0.54), mul(cr.dh, -0.22))))), B.at(W(add([TT.x, TT.y, ZP + 0.45], add(mul(cr.lt, sd * 0.54), mul(cr.dh, -0.22)))))];
    B.prism(`cheek${sd}`, CF, polyRound(0.72 * S, 1.0 * S, 0.3 * S).map(([x, yy]) => [x, yy + 0.5 * S]), s0 * S, s1 * S, { ...o, tone: "hi", over: sd > 0 ? B.L(k.pathOf(strap), { tone: "mid" }) : "" });
    B.cyl(`pin${sd}`, W(add(PIV, mul(cr.lt, sd * 0.54))), W(add(PIV, mul(cr.lt, sd * 0.7))), 0.1 * S, { mat: "iron", sys: "beam", tone: "hi", faceRing: [{ s: 0.16 * S, r: 0.05 * S }] });
    B.ring(`washer${sd}`, W(add(PIV, mul(cr.lt, sd * 0.54))), W(add(PIV, mul(cr.lt, sd * 0.58))), 0.1 * S, 0.17 * S, { mat: "iron", sys: "beam" });
  }
  // Four raking struts.
  for (const a of [rad(45), rad(-45), rad(118), rad(-118)]) {
    const base = cr.deck(1.62 * Math.cos(a), 1.62 * Math.sin(a), 0.05);
    const top = add([TT.x, TT.y, ZP - 2.3], add(mul(cr.dh, 0.29 * Math.cos(a)), mul(cr.lt, 0.29 * Math.sin(a))));
    B.beam(`strut${a.toFixed(2)}`, W(base), W(top), { w: 0.22 * S, h: 0.24 * S, up: [0, 0, 1], ...o, nails: [{ s: 0.3 * S, face: "v", x: 0 }] });
  }
  // Check-rope bollard on the sea side of the turntable.
  B.cyl("bollard", W(cr.deck(1.55, 0.55, 0)), W(cr.deck(1.55, 0.55, 0.55)), 0.13 * S, { mat: "oak", sys: "winch", faceRing: [{ s: 0.55 * S, r: 0.07 * S }], ribs: { count: 10, twist: 0.6, s0: 0.25 * S, s1: 0.45 * S, tone: "lo" } });
  // Lower block, anchored to an eye bolt in the deck.
  const lo = lowerBlock(cr);
  B.beam("block.lower", W(add(lo, [0, 0, -0.22])), W(add(lo, [0, 0, 0.2])), { w: 0.3 * S, h: 0.2 * S, up: cr.dh, mat: "oak", sys: "winch", tone: "hi", nails: [{ s: 0.21 * S, face: "u", x: [-0.5, 0, 0.5] }] });
  B.ring("block.eyebolt", W(cr.deck(-1.72, -0.04, 0)), W(cr.deck(-1.72, 0.04, 0)), 0.04 * S, 0.1 * S, { mat: "iron", sys: "winch" });
}

function drawWindlass(B, cr, drumW) {
  const o = { sys: "winch" };
  const r0 = -1.12, zA = 1.32;
  const ax = (l) => cr.deck(r0, l, zA);
  for (const sd of [-1, 1]) {
    B.beam(`wl.sill${sd}`, W(cr.deck(r0 - 0.55, sd * 0.55, 0.07)), W(cr.deck(r0 + 0.55, sd * 0.55, 0.07)), { w: 0.16 * S, h: 0.14 * S, up: [0, 0, 1], mat: "oak", ...o });
    B.beam(`wl.cheek${sd}`, W(cr.deck(r0, sd * 0.55, 0.14)), W(cr.deck(r0, sd * 0.55, zA + 0.24)), { w: 0.32 * S, h: 0.16 * S, up: cr.lt, mat: "oak", ...o, grain: 1, nails: [{ s: 0.15 * S, face: "u", x: [-0.5, 0.5] }] });
  }
  const a = drumW;
  const Fd = { o: W(ax(-0.36)), a: cr.lt, u: add(mul(cr.dh, Math.cos(a)), [0, 0, Math.sin(a)]), v: add(mul(cr.dh, -Math.sin(a)), [0, 0, Math.cos(a)]) };
  B.cyl("wl.drum", W(ax(-0.36)), W(ax(0.36)), 0.2 * S, { F: Fd, mat: "oak", ...o, ribs: { count: 14, phase: a } });
  B.cyl("wl.coil", W(ax(-0.18)), W(ax(0.12)), 0.235 * S, { mat: "rope", ...o, ribs: { count: 22, twist: 0.5, phase: a } });
  const RF = { o: W(ax(0.36)), a: cr.lt, u: cr.dh, v: [0, 0, 1] };
  B.toothed("wl.ratchet", RF, polySaw(0.26 * S, 0.33 * S, 14, -a), 0, 0.07 * S, { mat: "iron", ...o, tone: "hi" });
  const tooth = ((a / (TAU / 14)) % 1 + 1) % 1;
  const piv = cr.deck(r0 + 0.42, 0.42, zA + 0.42);
  B.beam("wl.pawl", W(piv), W(add(cr.deck(r0 + 0.16, 0.42, zA + 0.3), [0, 0, 0.06 * (1 - tooth)])), { w: 0.05 * S, h: 0.08 * S, up: [0, 0, 1], mat: "iron", ...o, tone: "hi" });
  B.cyl("wl.pawlpin", W(cr.deck(r0 + 0.42, 0.36, zA + 0.42)), W(cr.deck(r0 + 0.42, 0.47, zA + 0.42)), 0.035 * S, { mat: "iron", ...o });
  for (const sd of [-1, 1]) {
    B.cyl(`wl.axle${sd}`, W(ax(sd * 0.63)), W(ax(sd * 0.7)), 0.07 * S, { mat: "iron", ...o });
    B.cyl(`wl.hub${sd}`, W(ax(sd * 0.7)), W(ax(sd * 0.86)), 0.13 * S, { mat: "oak", ...o, faceRing: [{ s: 0.16 * S, r: 0.07 * S }] });
    for (let i = 0; i < 4; i++) {
      const aa = a + (i / 4) * TAU + (sd > 0 ? 0 : Math.PI / 4);
      const dir = add(mul(cr.dh, Math.cos(aa)), [0, 0, Math.sin(aa)]);
      const c = ax(sd * 0.78);
      B.cyl(`wl.spike${sd}${i}`, W(add(c, mul(dir, 0.12))), W(add(c, mul(dir, 1.25))), 0.04 * S, { mat: "oak", ...o, tone: "hi" });
    }
  }
}

const ARMB = [[-5.45, -0.36, 0.48, 0.54], [-0.36, 0.36, 0.6, 0.66], [0.36, 3.4, 0.5, 0.58], [3.4, 6.6, 0.44, 0.5], [6.6, 9.35, 0.38, 0.44]];
const BANDB = [-4.55, -2.6, -1.25, -0.44, 0.44, 1.05, 2.2, 4.2, 6.6, 8.2];
const secB = (s) => ARMB.find(([a, b]) => s >= a && s <= b) || ARMB[ARMB.length - 1];

function drawBeam(B, cr, cwT, ch) {
  const o = { sys: "beam" };
  const cuts = [];
  for (const s of BANDB) cuts.push(s - 0.07, s + 0.07);
  const edges = [ARMB[0][0], ...cuts, 9.35];
  for (let i = 0; i < edges.length - 1; i++) {
    const s0 = edges[i], s1 = edges[i + 1];
    const band = i % 2 === 1;
    const sec = secB((s0 + s1) / 2);
    const g = band ? 0.05 : 0;
    B.beam(`beam${i}`, W(cr.on(s0)), W(cr.on(s1)), band ? { w: (sec[2] + g) * S, h: (sec[3] + g) * S, up: cr.n, mat: "iron", ...o, tone: "hi", crease: "lo", nails: [{ s: 0.07 * S, face: "u", x: 0 }] } : { w: sec[2] * S, h: sec[3] * S, up: cr.n, mat: "oak", ...o, grain: s1 - s0 > 1 ? 2 : 0 });
  }
  // Forked end with the chain sheave between the cheeks.
  for (const sd of [-1, 1]) {
    const FF = { o: W(cr.on(9.35)), a: cr.d, u: cr.lt, v: cr.n };
    B.prism(`fork${sd}`, FF, polyRect(0.12 * S, 0.44 * S, sd * 0.13 * S, 0), 0, 1.07 * S, { mat: "oak", ...o, tone: "hi", over: sd > 0 ? B.D([B.at(W(cr.on(9.6, 0.12, 0.19))), B.at(W(cr.on(9.6, -0.12, 0.19)))], { size: 0.5, tone: "hi" }) : "" });
    B.cyl(`sheavepin${sd}`, W(cr.on(RO, 0, sd * 0.19)), W(cr.on(RO, 0, sd * 0.26)), 0.06 * S, { mat: "iron", ...o, faceRing: [{ s: 0.07 * S, r: 0.03 * S }] });
  }
  const sa = ch / RSH;
  const SF2 = { o: W(cr.on(RO, 0, -0.06)), a: cr.lt, u: add(mul(cr.d, Math.cos(sa)), mul(cr.n, Math.sin(sa))), v: add(mul(cr.d, -Math.sin(sa)), mul(cr.n, Math.cos(sa))) };
  B.cyl("sheave", W(cr.on(RO, 0, -0.06)), W(cr.on(RO, 0, 0.06)), RSH * S, { F: SF2, mat: "iron", sys: "claw", tone: "hi", bolts: [{ s: 0.12 * S, r: RSH * 0.55 * S, count: 4, phase: sa }], faceRing: [{ s: 0.12 * S, r: RSH * 0.82 * S }] });
  // Counterweight pin through the inner end, iron cap on the outer end.
  B.cyl("cwpin+", W(cr.on(-5.0, 0, 0.24)), W(cr.on(-5.0, 0, 0.45)), 0.09 * S, { mat: "iron", sys: "cw" });
  B.cyl("cwpin-", W(cr.on(-5.0, 0, -0.45)), W(cr.on(-5.0, 0, -0.24)), 0.09 * S, { mat: "iron", sys: "cw" });
  // Chain drum on brackets above the outer arm, with its ratchet and hand-bars.
  const da = ch / RCD;
  const dc = (l) => cr.on(S_CD, 0.62, l);
  for (const sd of [-1, 1]) B.beam(`cd.bracket${sd}`, W(cr.on(S_CD, 0.29, sd * 0.31)), W(cr.on(S_CD, 0.78, sd * 0.31)), { w: 0.05 * S, h: 0.26 * S, up: cr.d, mat: "iron", sys: "claw", tone: "hi", nails: [{ s: 0.06 * S, face: "u", x: 0 }] });
  const FD = { o: W(dc(-0.22)), a: cr.lt, u: add(mul(cr.d, Math.cos(da)), mul(cr.n, Math.sin(da))), v: add(mul(cr.d, -Math.sin(da)), mul(cr.n, Math.cos(da))) };
  B.cyl("cd.drum", W(dc(-0.22)), W(dc(0.22)), RCD * S, { F: FD, mat: "oak", sys: "claw", ribs: { count: 10, phase: da } });
  B.cyl("cd.coil", W(dc(-0.14)), W(dc(0.1)), (RCD + 0.04) * S, { mat: "iron", sys: "claw", ribs: { count: 16, twist: 0.2, phase: da } });
  B.toothed("cd.ratchet", { o: W(dc(0.22)), a: cr.lt, u: cr.d, v: cr.n }, polySaw(0.2 * S, 0.26 * S, 12, -da), 0, 0.05 * S, { mat: "iron", sys: "claw", tone: "hi" });
  for (let i = 0; i < 2; i++) {
    const aa = da + i * (Math.PI / 2);
    const dir = add(mul(cr.d, Math.cos(aa)), mul(cr.n, Math.sin(aa)));
    const c = dc(-0.4);
    B.cyl(`cd.bar${i}`, W(add(c, mul(dir, -0.5))), W(add(c, mul(dir, 0.5))), 0.03 * S, { mat: "oak", sys: "claw", tone: "hi" });
  }
  drawCW(B, cr, cwT);
  // Tackle: upper block on an iron strap under the inner arm; eight falls to the lower block.
  const up = upperBlock(cr), lo = lowerBlock(cr);
  B.beam("tk.strap", W(cr.on(-RT, -0.27)), W(add(up, mul(cr.n, 0.22))), { w: 0.05 * S, h: 0.12 * S, up: cr.d, mat: "iron", sys: "winch", tone: "hi" });
  B.beam("block.upper", W(add(up, mul(cr.n, 0.22))), W(add(up, mul(cr.n, -0.2))), { w: 0.3 * S, h: 0.2 * S, up: cr.dh, mat: "oak", sys: "winch", tone: "hi", nails: [{ s: 0.21 * S, face: "u", x: [-0.5, 0, 0.5] }] });
  const falls = [];
  const ut = unit(sub(lo, up));
  for (let j = 0; j < TACKLE; j++) {
    const l = -0.12 + (0.24 * j) / (TACKLE - 1);
    const off = mul(cr.dh, (j % 2 ? 0.05 : -0.05));
    falls.push(k.pathOf([B.at(W(add(add(up, mul(ut, 0.2)), add(mul(cr.lt, l), off)))), B.at(W(add(add(lo, mul(ut, -0.2)), add(mul(cr.lt, l), off))))]));
  }
  const top = cr.deck(-1.12, 0, 1.32 + 0.235);
  falls.push(k.pathOf([B.at(W(add(lo, add(mul(ut, -0.2), mul(cr.lt, 0.14))))), B.at(W(top))]));
  const tw = (0.022 * S * B.KS).toFixed(2);
  B.marks("tk.falls", `<path class="iso-line cord" data-tone="mid" style="stroke-width:${tw}px" d="${falls.join("")}"/>`, [W(up), W(lo), W(top)], { sys: "winch", mat: "rope", r: 0.1 * S });
  // Check rope from the outer arm to the bollard.
  const cp = cr.on(2.2, -0.29, 0.2);
  const bt = cr.deck(1.55, 0.55, 0.42);
  B.rope("check", [W(cp), W(lerp(cp, bt, 0.5)), W(bt)], 0.035 * S, { sys: "winch", maxLength: 60 });
}

function drawCW(B, cr, cwT) {
  const pin = cr.on(-5.0);
  const o = { mat: "oak", sys: "cw" };
  const at = (l, r, z) => add(pin, add(add(mul(cr.lt, l), mul(cr.dh, r)), [0, 0, z]));
  for (const l of [-0.36, 0.36]) B.beam(`cw.hanger${l}`, W(at(l, 0, 0.08)), W(at(l, 0, -0.72)), { w: 0.06 * S, h: 0.18 * S, up: cr.dh, mat: "iron", sys: "cw", tone: "hi", nails: [{ s: 0.66 * S, face: l > 0 ? "u" : "-u", x: 0 }] });
  B.beam("cw.yoke", W(at(-1.16, 0, -0.84)), W(at(1.16, 0, -0.84)), { w: 0.24 * S, h: 0.24 * S, up: [0, 0, 1], ...o, grain: 1 });
  const top = -0.96, bot = -3.5, hx = 1.1, hf = 1.05, t = 0.09;
  const FB = { o: W(pin), a: cr.lt, u: cr.dh, v: [0, 0, 1] };
  const prism = (id, x0, x1, f0, f1, z0, z1, mat = "oak", extra = {}) => B.prism(id, FB, [[f0 * S, z0 * S], [f1 * S, z0 * S], [f1 * S, z1 * S], [f0 * S, z1 * S]], x0 * S, x1 * S, { mat, sys: "cw", tone: "hi", ...extra });
  const plank = (x0, f0, x1, f1) => {
    const ls = [];
    for (let z = top - 0.42; z > bot + 0.1; z -= 0.42) ls.push(k.pathOf([B.at(W(at(x0, f0, z))), B.at(W(at(x1, f1, z)))]));
    return B.L(ls.join(""), { tone: "faint" });
  };
  const strap = (x, f0, f1, z) => B.L(k.pathOf([B.at(W(at(x, f0, z))), B.at(W(at(x, f1, z)))]), { tone: "hi" });
  prism("cw.floor", -hx, hx, -hf, hf, bot, bot + 0.1);
  prism("cw.wallFar", -hx, -hx + t, -hf, hf, bot, top);
  prism("cw.wallBack", -hx + t, hx - t, -hf, -hf + t, bot, top);
  prism("cw.wallFront", -hx + t, hx - t, hf - t, hf, bot, top, "oak", { inner: plank(-hx, hf, hx, hf) });
  prism("cw.wallNear", hx - t, hx, -hf, hf, bot, top, "oak", { inner: plank(hx, -hf, hx, hf), over: strap(hx, -hf, hf, top - 0.2) + strap(hx, -hf, hf, bot + 0.2) });
  for (const [x, f] of [[-hx, -hf], [hx, -hf], [-hx, hf], [hx, hf]]) prism(`cw.corner${x}${f}`, x - 0.06, x + 0.06, f - 0.06, f + 0.06, bot - 0.04, top + 0.04, "iron", { crease: "lo" });
  // Lead pigs: depth from the mass at 8 t/m³ packed.
  const depth = clamp((cwT * 1000) / (9500 * (2 * hx - 2 * t) * (2 * hf - 2 * t)), 0.12, top - bot - 0.2);
  const ft = bot + 0.1 + depth;
  const pigs = [];
  for (let f = -hf + 0.4; f < hf - 0.2; f += 0.42) pigs.push(k.pathOf([B.at(W(at(-hx + t, f, ft))), B.at(W(at(hx - t, f, ft)))]));
  prism("cw.fill", -hx + t, hx - t, -hf + t, hf - t, bot + 0.1, ft, "lead", { tone: "mid", inner: B.L(pigs.join(""), { tone: "lo" }) });
}

// ---------------------------------------------------------------- chain, claw, hook and weights
function chainSvg(B, pts, pitch, wire) {
  const ring = [], edge = [];
  let carry = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const L = len(sub(b, a));
    if (L < 1e-6) continue;
    const d = mul(sub(b, a), 1 / L);
    const side = unit(Math.abs(d[2]) > 0.9 ? cross(d, [1, 0, 0]) : cross(d, [0, 0, 1]));
    for (let s = carry; s < L; s += pitch) {
      const c = add(a, mul(d, s));
      const n = Math.round((i * 1000 + s) / pitch);
      if ((Math.floor(s / pitch) + i) % 2 === 0) {
        const q = [];
        for (let j = 0; j < 8; j++) {
          const an = (j / 8) * TAU;
          q.push(B.at(add(c, add(mul(d, Math.cos(an) * pitch * 0.62), mul(side, Math.sin(an) * pitch * 0.34)))));
        }
        ring.push(k.pathOf(q, true));
      } else edge.push(k.pathOf([B.at(add(c, mul(d, -pitch * 0.6))), B.at(add(c, mul(d, pitch * 0.6)))]));
      void n;
    }
    carry = (((carry - L) % pitch) + pitch) % pitch;
  }
  const sw = (wire * B.KS).toFixed(2);
  return `<path class="iso-line cord" data-tone="hi" style="stroke-width:${sw}px" d="${ring.join("")}"/><path class="iso-line cord" data-tone="hi" style="stroke-width:${(wire * 2.3 * B.KS).toFixed(2)}px" d="${edge.join("")}"/>`;
}

function drawChain(B, M, cr, p) {
  const st = M.state;
  // Chain: drum → along the beam → over the sheave → down to the hook.
  const run = [cr.on(S_CD, 0.62 + RCD + 0.03), cr.on(RO, RSH + 0.03)];
  const arc = [];
  for (let i = 0; i <= 5; i++) {
    const an = Math.PI / 2 - (i / 5) * (Math.PI / 2 + cr.al);
    arc.push(add(cr.sheave, add(mul(cr.d, Math.cos(an) * (RSH + 0.03)), mul(cr.n, Math.sin(an) * (RSH + 0.03)))));
  }
  const dep = add(cr.sheave, mul(cr.dh, RSH + 0.03));
  const ring = p.ring;
  const pitch = 0.17 * S;
  const wire = 0.026 * S;
  B.marks("chain.run", chainSvg(B, run.map(W), pitch, wire), run.map(W), { sys: "claw", mat: "iron", r: 0.08 * S });
  const hang = [dep, ...(p.cm === 2 && p.T < 2000 ? [add(lerp(dep, ring, 0.85), mul(cr.dh, 0.25))] : []), ring];
  const segs = Math.max(1, Math.ceil(len(sub(ring, dep)) / 3));
  const hp = [...arc.slice(0, -1).map(W)];
  B.marks("chain.arc", chainSvg(B, arc.map(W), pitch, wire), arc.map(W), { sys: "claw", mat: "iron", r: 0.08 * S });
  for (let i = 0; i < segs; i++) {
    const a = lerp(dep, ring, i / segs), b = lerp(dep, ring, (i + 1) / segs);
    const pts = hang.length === 3 && i === segs - 1 ? [a, hang[1], b] : [a, b];
    B.marks(`chain.hang${i}`, chainSvg(B, pts.map(W), pitch, wire), pts.map(W), { sys: "claw", mat: "iron", r: 0.08 * S });
  }
  void hp;
  // The hook at the chain's end.
  const down = p.cm === 2 ? unit(sub(xf(shipFrame(p.y), p.att[0], p.att[1], p.att[2]), ring)) : unit(sub(ring, dep).map((x, i) => (i === 2 ? x - 1e-6 : x)));
  const ax = len(sub(ring, dep)) > 0.05 ? unit(sub(ring, dep)) : [0, 0, -1];
  B.beam("hook.shank", W(add(ring, mul(ax, -0.26))), W(add(ring, mul(ax, -0.04))), { w: 0.05 * S, h: 0.05 * S, up: cr.dh, mat: "iron", sys: "claw", tone: "hi" });
  B.ring("hook.eye", W(add(add(ring, mul(ax, -0.29)), mul(cr.lt, -0.02))), W(add(add(ring, mul(ax, -0.29)), mul(cr.lt, 0.02))), 0.025 * S, 0.055 * S, { mat: "iron", sys: "claw" });
  // What hangs on it.
  if (p.carry === "claw" || p.cm !== 0) {
    if (p.carry === "claw" || p.cm) {
      let ref = cr.lt;
      if (p.cm === 2) {
        const F = shipFrame(p.y);
        ref = F.T;
      }
      drawClaw(B, "claw", W(ring), p.cm === 2 ? down : ax, ref, p.grip, { k: S, bitten: p.cm === 2, sys: "claw", lit: M.ammo.id === "claw" ? false : false, clip: p.cm === 3 });
      // Trip cord from the collar to the beam end.
      const col = add(ring, mul(p.cm === 2 ? down : ax, 0.36 - 0.1 * clamp(-p.grip, 0, 1)));
      const cord = [add(col, mul(cr.lt, 0.1)), add(dep, add(mul(cr.lt, 0.12), [0, 0, -0.1])), cr.on(9.1, -0.22, 0.12)];
      B.marks("claw.trip", `<path class="iso-line cord" data-tone="mid" style="stroke-width:${(0.012 * S * B.KS).toFixed(2)}px" d="${k.pathOf(cord.map((q) => B.at(W(q))))}"/>`, cord.map(W), { sys: "claw", mat: "rope", r: 0.05 * S });
    }
  } else if (p.carry && p.wm === 0) drawWeight(B, "hookw", W(add(ring, [0, 0, -0.04])), p.carry, { lit: M.ammo.id === p.carry, hang: true });
  void st;
}

// The iron hand. ring: the eye in the hook (world units); ax points down the shank; ref sets the fingers.
function drawClaw(B, id, ring, ax0, ref0, grip, o) {
  const kk = o.k;
  const ax = unit(ax0);
  let side = cross(ax, ref0);
  if (len(side) < 1e-6) side = cross(ax, [1, 0, 0]);
  side = unit(side);
  const r0 = unit(cross(side, ax));
  const vis = { sys: o.sys || "claw", lit: !!o.lit };
  const P = (s, a = 0, rr = 0) => add(add(ring, mul(ax, s * kk)), add(mul(r0, Math.cos(a) * rr * kk), mul(side, Math.sin(a) * rr * kk)));
  const iron = { mat: "iron", tone: "hi", ...vis };
  const zc = o.clip ? 0.0 : null;
  const hidden = (p) => zc !== null && p[2] < zc;
  B.ring(`${id}.eye`, add(P(0.09), mul(side, -0.025 * kk)), add(P(0.09), mul(side, 0.025 * kk)), 0.055 * kk, 0.105 * kk, { ...iron, F: { o: add(P(0.09), mul(side, -0.025 * kk)), a: side, u: ax, v: r0 } });
  const open = clamp(-grip, 0, 1);
  const c0 = 0.34 - 0.1 * open, c1 = c0 + 0.1;
  if (!hidden(P(c0))) {
    B.beam(`${id}.shank0`, P(0.19), P(c0), { w: 0.1 * kk, h: 0.1 * kk, up: r0, ...iron });
    B.cyl(`${id}.collar`, P(c0), P(c1), 0.085 * kk, { ...iron });
  }
  if (!hidden(P(0.72))) B.beam(`${id}.shank1`, P(c1), P(0.72), { w: 0.1 * kk, h: 0.1 * kk, up: r0, ...iron });
  if (!hidden(P(0.86))) B.cyl(`${id}.crown`, P(0.72), P(0.86), 0.17 * kk, { ...iron, bolts: [{ s: 0.14 * kk, r: 0.12 * kk, count: 4, phase: 0.78 }] });
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const ra = add(mul(r0, Math.cos(a)), mul(side, Math.sin(a)));
    const outboard = Math.cos(a) > 0;
    const g = o.bitten && !outboard ? Math.min(grip, 0.35) : grip;
    const b0 = 0.75 - 0.35 * g, kap = 0.3 + 0.32 * g;
    let phi = b0;
    let p = P(0.8, a, 0.15);
    const lens = [0.42, 0.34, 0.24];
    for (let j = 0; j < 3; j++) {
      const d = add(mul(ax, Math.cos(phi)), mul(ra, Math.sin(phi)));
      const q = add(p, mul(d, lens[j] * kk));
      if (!hidden(q) && !hidden(p)) B.beam(`${id}.f${i}${j}`, p, q, { w: (0.085 - j * 0.012) * kk, h: (0.075 - j * 0.01) * kk, up: cross(d, side), ...iron });
      p = q;
      phi -= kap;
    }
    phi -= kap * 0.3;
    const d = add(mul(ax, Math.cos(phi)), mul(ra, Math.sin(phi)));
    if (!hidden(p)) B.turned(`${id}.tip${i}`, G.frameAlong(p, d), [[0, 0.04 * kk], [0.15 * kk, 0.004 * kk]], { ...iron });
  }
}

function leadPig(B, id, c, along, kk, lit, sys) {
  const ax = unit(along);
  const side = unit(cross([0, 0, 1], ax));
  const F = { o: add(c, mul(ax, -0.31 * kk)), a: ax, u: side, v: [0, 0, 1] };
  B.prism(`${id}.pig`, F, [[-0.085 * kk, 0], [0.085 * kk, 0], [0.12 * kk, 0.19 * kk], [-0.12 * kk, 0.19 * kk]], 0, 0.62 * kk, { mat: "lead", tone: "hi", lit, sys, over: B.L(k.pathOf([B.at(add(c, [0, 0, 0.19 * kk])), B.at(add(add(c, mul(ax, 0.2 * kk)), [0, 0, 0.19 * kk]))]), { tone: "lo", free: true }) });
}

function drawWeight(B, id, top, kind, o = {}) {
  // top: the item's lifting ring (world units).
  if (kind === "lead") {
    const c = add(top, [0, 0, -(0.1 + 0.19) * S]);
    B.ring(`${id}.ring`, add(top, [-0.02 * S, 0, -0.05 * S]), add(top, [0.02 * S, 0, -0.05 * S]), 0.035 * S, 0.07 * S, { mat: "iron", sys: "claw" });
    leadPig(B, id, c, [1, 0.3, 0], S, !!o.lit, "claw");
  } else if (kind === "boulder") {
    const c = add(top, [0, 0, -(0.1 + BOULDER_R) * S]);
    B.ring(`${id}.ring`, add(top, [-0.025 * S, 0, -0.06 * S]), add(top, [0.025 * S, 0, -0.06 * S]), 0.04 * S, 0.085 * S, { mat: "iron", sys: "claw" });
    looks.stone(B, `${id}.stone`, c, BOULDER_R * S, { mat: "granite", lit: !!o.lit, seed: 9, sys: "claw" });
  }
}

function drawPile(B, M, p) {
  const st = M.state;
  const sel = M.ammo.id;
  const cp = spotXY("claw");
  if (p.carry !== "claw" && !(p.cm && st.sim && st.sim.kind === "claw")) drawClaw(B, "rack.claw", w(cp[0], cp[1], WALL.top + ITEM_TOP.claw), [0, 0, -1], [Math.cos(0.4), Math.sin(0.4), 0], 0, { k: S, lit: sel === "claw" });
  const lp = spotXY("lead");
  const nl = st.stock.lead;
  const lead = [[0, -0.15, 0.08], [0, 0.15, 0.08], [0, 0, 0.27]];
  lead.slice(0, nl).forEach(([dx, dy, z], i) => leadPig(B, `rack.lead${i}`, w(lp[0] + dx, lp[1] + dy, WALL.top + z), [1, 0, 0], S, sel === "lead" && i === nl - 1, "claw"));
  const bp = spotXY("boulder");
  const nb = st.stock.boulder;
  [[0, 0], [-0.78, 0.12], [0.76, 0.1]].slice(0, nb).forEach(([dx, dy], i) => looks.stone(B, `rack.boulder${i}`, w(bp[0] + dx, bp[1] + dy, WALL.top + BOULDER_R + 0.06), BOULDER_R * S, { mat: "granite", lit: sel === "boulder" && i === 0, seed: 3 + i, sys: "claw" }));
}

// ---------------------------------------------------------------- the ship
function drawShip(B, M, p) {
  const F = shipFrame(p.y);
  const zc = -0.05 * S;
  const axesF = [F.S, F.T, F.H];
  const holeOver = (part) => {
    let svg = "";
    for (const h of p.holes) {
      const onFore = h.s > FC.s0 && h.s < FC.s1;
      const here = part.fore ? onFore && h.s >= part.v[0][0] - 0.01 && h.s <= part.v[part.v.length - 1][0] + 0.01 : !onFore && part.seg !== undefined && h.s >= part.s0 && h.s < part.s1;
      if (!here) continue;
      const hz = deckH(h.s, h.t) + 0.01;
      const R = rng(h.seed || 5);
      const pts = Array.from({ length: 11 }, (_, j) => {
        const a = (j / 11) * TAU;
        const rr = h.r * (0.65 + R() * 0.6);
        return [h.s + Math.cos(a) * rr, h.t + Math.sin(a) * rr * 0.8, hz];
      });
      svg += `<path class="iso-line" data-tone="hi" style="fill:var(--hole)" d="${pathLocal(B, F, pts)}z"/>`;
      const spl = pts.filter((_, j) => j % 2 === 0).map((q) => pathLocal(B, F, [q, [h.s + (q[0] - h.s) * 1.5, h.t + (q[1] - h.t) * 1.5, hz]]));
      svg += B.L(spl.join(""), { tone: "mid" });
    }
    return svg;
  };
  for (const part of SHIP) {
    const verts = part.v.map((q) => xfU(F, q));
    const cl = clipAbove(verts, zc);
    if (cl.none) continue;
    const { paths, info } = polyPaths(B, verts, part.f, part.open);
    let inner = "", over = "";
    if (part.lines) {
      const by = { faint: [], hi: [], mid: [] };
      for (const [a, b, tone] of part.lines) by[tone].push(pathLocal(B, F, [a, b]));
      inner = B.L(by.faint.join(""), { tone: "faint" }) + B.L(by.mid.join(""), { tone: "mid" }) + B.L(by.hi.join(""), { tone: "hi" });
    }
    if (part.ports && part.ports.length) over += B.D(part.ports.map((q) => B.at(xfU(F, q))), { size: 0.75, tone: "hi" });
    if (part.eye) {
      const s = part.eye, t = sideT(s, 0.75) + 0.02;
      const eye = [];
      for (let j = 0; j < 12; j++) {
        const a = (j / 12) * TAU;
        eye.push([s + Math.cos(a) * 0.42, t, 0.75 + Math.sin(a) * 0.17 * Math.abs(Math.cos(a * 0.5) + 0.25)]);
      }
      over += `<path class="iso-line" data-tone="hi" style="fill:var(--anatomy-shade-0)" d="${pathLocal(B, F, eye)}z"/>` + B.D([B.at(xfU(F, [s + 0.06, t + 0.01, 0.78]))], { size: 1.1, tone: "hi" });
    }
    if (part.shields) {
      for (const s of part.shields) {
        const { B: hb, hs } = hullAt(s);
        const c = [s, hb + 0.04, hs + 0.42];
        over += `<path class="iso-line" data-tone="hi" style="fill:var(--anatomy-shade-1)" d="${discLocal(B, F, c, [1, 0, 0], [0, 0, 1], 0.38)}"/>` + `<path class="iso-line" data-tone="mid" d="${discLocal(B, F, c, [1, 0, 0], [0, 0, 1], 0.27)}"/>`;
        over += B.D([B.at(xfU(F, add(c, [0, 0.02, 0])))], { size: 0.9, tone: "hi" });
      }
    }
    if (part.rig) {
      const dots = [];
      for (let q = 0; q < OAR_BANKS[0].n; q++) {
        const s = OAR_BANKS[0].s0 + q * 0.98;
        if (s >= part.v[0][0] && s < part.v[part.v.length - 1][0]) dots.push(B.at(xfU(F, [s, outT(s), 1.22])));
      }
      over += B.D(dots, { size: 0.6, tone: "hi" });
    }
    if (part.seg !== undefined || part.fore) over += holeOver(part);
    let clip = null;
    if (!cl.all) {
      clip = k.pathOf(G.hullOf(cl.pts.map(B.at)), true);
      over += B.L(waterline(B, verts, info, 0), { tone: "mid" });
    }
    B.solid(part.id, paths, shapeOf(cl.pts, { axes: axesF, edges: axesF }), { mat: part.mat, tone: part.tone || "hi", sys: "ship", clip, inner, over, crease: part.crease || "faint" });
  }
  drawOars(B, M, F, p, 1);
  drawOars(B, M, F, p, -1);
}

function drawOars(B, M, F, p, sd) {
  const st = M.state;
  const rowing = st.mode === "approach" && !st.ship.dis;
  const ph = st.row ? st.row.ph : 0;
  const rest = st.mode === "approach" ? st.row.rest : 1;
  const dis = st.ship.dis || 0;
  const R = rng(st.ship.seed + (sd > 0 ? 1 : 2));
  const shafts = [], cores = [], blades = [], pts = [];
  const items = [];
  OAR_BANKS.forEach((bk, bi) => {
    for (let q = 0; q < bk.n; q++) {
      const s = bk.s0 + q * 0.98;
      const tP = bk.rig ? outT(s) : sideT(s, bk.h) + 0.02;
      const piv = [s, sd * tP, bk.h];
      const rr = R(), rr2 = R();
      let psi = 0, hT = 0.05;
      if (rowing) {
        const phase = ph + bi * 0.12;
        psi = 0.4 * Math.cos(phase) * (1 - rest);
        hT = (-0.22 + 0.58 * Math.pow(Math.max(0, -Math.sin(phase)), 0.7)) * (1 - rest) + 0.05 * rest;
      }
      if (dis) {
        psi = psi * (1 - dis) + dis * (rr - 0.5) * 1.1;
        hT = hT * (1 - dis) + dis * (rr2 * 1.2 - 0.5);
      }
      const L = bk.L;
      const sb = clamp((bk.h - hT) / L, -0.95, 0.95);
      const cb = Math.sqrt(1 - sb * sb);
      const dir = [Math.sin(psi) * cb, sd * Math.cos(psi) * cb, -sb];
      items.push({ piv, dir, L });
    }
  });
  const zc = 0;
  for (const it of items) {
    const a = xf(F, ...it.piv);
    const tip = xf(F, ...add(it.piv, mul(it.dir, it.L)));
    let u1 = 1;
    if (tip[2] < zc) u1 = a[2] > zc ? (a[2] - zc) / (a[2] - tip[2]) : 0;
    if (u1 <= 0) continue;
    const bStart = 0.78;
    const sEnd = Math.min(u1, bStart + 0.02);
    const pa = B.at(W(a)), pb = B.at(W(lerp(a, tip, sEnd)));
    shafts.push(k.pathOf([pa, pb]));
    cores.push(k.pathOf([pa, pb]));
    pts.push(W(a), W(lerp(a, tip, u1)));
    if (u1 > bStart) {
      const side = unit(cross(it.dir, [0, 0, 1]));
      const sideW = [F.S[0] * side[0] + F.T[0] * side[1] + F.H[0] * side[2], F.S[1] * side[0] + F.T[1] * side[1] + F.H[1] * side[2], F.S[2] * side[0] + F.T[2] * side[1] + F.H[2] * side[2]];
      const b0 = lerp(a, tip, bStart), b1 = lerp(a, tip, u1);
      const wB = 0.09;
      blades.push(k.pathOf([add(b0, mul(sideW, -wB * 0.6)), add(b0, mul(sideW, wB * 0.6)), add(b1, mul(sideW, wB)), add(b1, mul(sideW, -wB))].map((q) => B.at(W(q))), true));
    }
  }
  if (!pts.length) return;
  const sw = 0.12 * S * B.KS;
  const svg = `<path class="iso-line cord" data-tone="hi" style="stroke-width:${sw.toFixed(2)}px" d="${shafts.join("")}"/><path class="iso-line cord" style="stroke:var(--anatomy-top);stroke-width:${(sw * 0.42).toFixed(2)}px" d="${cores.join("")}"/><path class="iso-line" data-tone="hi" style="fill:var(--anatomy-shade-2)" d="${blades.join("")}"/>`;
  B.raw(`ship.oars${sd}`, svg, shapeOf(pts, { axes: [F.S, F.T, F.H], edges: [F.S, F.T, F.H], r: 0.06 * S }), { mat: "wood", sys: "ship" });
}

// ---------------------------------------------------------------- strobe: ghosts from the record
function drawStrobe(B, M, sim, now) {
  const lines = [], pts = [];
  for (let t = 0; t <= Math.min(now, sim.T); t += 0.32) {
    const f = sim.rec.at(t);
    const cr = crane(M.state.sg, f.al + f.dl);
    lines.push(k.pathOf([B.at(W(cr.on(-5.4))), B.at(W(cr.on(RO)))]));
    lines.push(k.pathOf([B.at(W(cr.dep)), B.at(W(f.r))]));
    const F = shipFrame(f.y);
    lines.push(k.pathOf([-13, -8, -3, 2, 7, 12.6].map((s) => B.at(W(xf(F, s, 0, hullAt(s).hs))))));
    pts.push(B.at(W(f.r)));
  }
  const path = [];
  for (let t = 0; t <= Math.min(now, sim.T); t += 1 / 30) path.push(B.at(W(sim.rec.at(t).r)));
  const svg = B.L(lines.join(""), { tone: "lo" }) + (path.length > 1 ? `<path class="iso-line" data-tone="lit" style="stroke:var(--accent);stroke-width:1.2px" d="${k.pathOf(path)}"/>` : "") + B.D(pts, { size: 1.4, tone: "mid" });
  B.marks("strobe", svg, [w(0, 6, 8)], { r: 600, layer: 6 });
}

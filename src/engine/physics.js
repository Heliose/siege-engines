// Physics: integration, a numeric Lagrangian for linkages (arms, slings, hinged weights),
// and ballistic flight with quadratic drag. SI units throughout (m, kg, s, N, J).
export const GRAVITY = 9.81;
export const AIR = 1.225;

export function rk4(f, t, y, h) {
  const n = y.length;
  const k1 = f(t, y);
  const y2 = new Array(n);
  for (let i = 0; i < n; i++) y2[i] = y[i] + (h / 2) * k1[i];
  const k2 = f(t + h / 2, y2);
  for (let i = 0; i < n; i++) y2[i] = y[i] + (h / 2) * k2[i];
  const k3 = f(t + h / 2, y2);
  for (let i = 0; i < n; i++) y2[i] = y[i] + h * k3[i];
  const k4 = f(t + h, y2);
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = y[i] + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  return out;
}

// A recorded time series of frames (any plain objects of numbers / arrays), sampled with
// linear interpolation. `tracks` keeps the shape of the first frame.
export function timeline() {
  const ts = [];
  const frames = [];
  const lerpAny = (a, b, u) => {
    if (typeof a === "number") return a + (b - a) * u;
    if (Array.isArray(a)) return a.map((x, i) => lerpAny(x, b[i], u));
    if (a && typeof a === "object") {
      const o = {};
      for (const key in a) o[key] = typeof a[key] === "number" || Array.isArray(a[key]) || (a[key] && typeof a[key] === "object") ? lerpAny(a[key], b[key], u) : u < 0.5 ? a[key] : b[key];
      return o;
    }
    return u < 0.5 ? a : b;
  };
  return {
    ts,
    frames,
    push(t, frame) {
      ts.push(t);
      frames.push(frame);
    },
    get end() {
      return ts.length ? ts[ts.length - 1] : 0;
    },
    at(t) {
      if (!ts.length) return null;
      if (t <= ts[0]) return frames[0];
      if (t >= ts[ts.length - 1]) return frames[frames.length - 1];
      let lo = 0, hi = ts.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (ts[mid] <= t) lo = mid;
        else hi = mid;
      }
      const u = (t - ts[lo]) / (ts[hi] - ts[lo] || 1);
      return lerpAny(frames[lo], frames[hi], u);
    },
  };
}

// Solve A x = b for small dense systems (Gaussian elimination with pivoting).
export function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / d;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / (M[r][r] || 1e-12);
  }
  return x;
}

// A planar or spatial linkage in generalised coordinates q.
//   points(q) → [{ m, p: [x, y, z] }]   point masses (z up)
//   bodies(q) → [{ I, a }]              rotational inertia about each body's own centre, a = its angle
//   force(q, qd, t, J) → [Q_i]          extra generalised forces (springs, pulls, friction)
// Equations: M(q) q'' = Q_gravity + Q − Σ m Jᵀ (∂²p/∂s² along q') − Σ I jᵀ (∂²a/∂s²).
export function linkage({ n, points, bodies = () => [], force = null, g = GRAVITY }) {
  const h = 1e-6;
  function jacobians(q) {
    const base = points(q);
    const rot = bodies(q);
    const Jp = base.map(() => []);
    const Jb = rot.map(() => []);
    for (let j = 0; j < n; j++) {
      const qp = q.slice();
      const qm = q.slice();
      qp[j] += h;
      qm[j] -= h;
      const pp = points(qp);
      const pm = points(qm);
      const bp = bodies(qp);
      const bm = bodies(qm);
      for (let i = 0; i < base.length; i++) Jp[i][j] = [(pp[i].p[0] - pm[i].p[0]) / (2 * h), (pp[i].p[1] - pm[i].p[1]) / (2 * h), (pp[i].p[2] - pm[i].p[2]) / (2 * h)];
      for (let i = 0; i < rot.length; i++) Jb[i][j] = (bp[i].a - bm[i].a) / (2 * h);
    }
    return { base, rot, Jp, Jb };
  }
  function accel(q, qd, t) {
    const { base, rot, Jp, Jb } = jacobians(q);
    const M = Array.from({ length: n }, () => new Array(n).fill(0));
    const Q = force ? force(q, qd, t, Jp) : new Array(n).fill(0);
    const speed = Math.hypot(...qd);
    let curv = null, curvB = null;
    if (speed > 1e-9) {
      const e = 2e-4 / speed;
      const qp = q.map((x, i) => x + e * qd[i]);
      const qm = q.map((x, i) => x - e * qd[i]);
      const pp = points(qp), pm = points(qm), bp = bodies(qp), bm = bodies(qm);
      curv = base.map((pt, i) => [0, 1, 2].map((c) => (pp[i].p[c] - 2 * pt.p[c] + pm[i].p[c]) / (e * e)));
      curvB = rot.map((b, i) => (bp[i].a - 2 * b.a + bm[i].a) / (e * e));
    }
    for (let i = 0; i < base.length; i++) {
      const m = base[i].m;
      const J = Jp[i];
      for (let a = 0; a < n; a++) {
        for (let b = 0; b < n; b++) M[a][b] += m * (J[a][0] * J[b][0] + J[a][1] * J[b][1] + J[a][2] * J[b][2]);
        Q[a] += -m * g * J[a][2];
        if (curv) Q[a] -= m * (J[a][0] * curv[i][0] + J[a][1] * curv[i][1] + J[a][2] * curv[i][2]);
      }
    }
    for (let i = 0; i < rot.length; i++) {
      const I = rot[i].I;
      const J = Jb[i];
      for (let a = 0; a < n; a++) {
        for (let b = 0; b < n; b++) M[a][b] += I * J[a] * J[b];
        if (curvB) Q[a] -= I * J[a] * curvB[i];
      }
    }
    return solve(M, Q);
  }
  function energy(q, qd) {
    const { base, rot, Jp, Jb } = jacobians(q);
    let T = 0, U = 0;
    base.forEach((pt, i) => {
      const v = [0, 1, 2].map((c) => Jp[i].reduce((s, row, j) => s + row[c] * qd[j], 0));
      T += 0.5 * pt.m * (v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
      U += pt.m * g * pt.p[2];
    });
    rot.forEach((b, i) => {
      const w = Jb[i].reduce((s, x, j) => s + x * qd[j], 0);
      T += 0.5 * b.I * w * w;
    });
    return { T, U };
  }
  // Velocity of point i for state (q, qd).
  function velocity(q, qd, i) {
    const { Jp } = jacobians(q);
    return [0, 1, 2].map((c) => Jp[i].reduce((s, row, j) => s + row[c] * qd[j], 0));
  }
  return { n, accel, energy, velocity, points, bodies };
}

// Integrate a linkage from (q, qd); `step(t, q, qd)` may return "stop" or a new {q, qd}.
export function run(sys, q0, qd0, { dt = 1 / 2000, tMax = 3, every = 4, record, step } = {}) {
  let q = q0.slice();
  let qd = qd0.slice();
  const n = sys.n;
  const f = (t, y) => {
    const qq = y.slice(0, n);
    const vv = y.slice(n);
    const a = sys.accel(qq, vv, t);
    return [...vv, ...a];
  };
  let t = 0;
  let i = 0;
  while (t < tMax) {
    if (record && i % every === 0) record(t, q, qd);
    const y = rk4(f, t, [...q, ...qd], dt);
    q = y.slice(0, n);
    qd = y.slice(n);
    t += dt;
    i++;
    if (step) {
      const r = step(t, q, qd);
      if (r === "stop") break;
      if (r && r.q) {
        q = r.q;
        qd = r.qd;
      }
    }
  }
  return { t, q, qd };
}

// Ballistic flight with quadratic drag. p, v in metres; z up; down-range −y.
// hit(p) may return a truthy description to stop early (a wall face, a ship).
export function flight({ p, v, mass, area, cd = 0.47, rho = AIR, g = GRAVITY, dt = 1 / 240, tMax = 40, ground = 0, hit = null, wind = [0, 0, 0] }) {
  const track = timeline();
  let pos = p.slice();
  let vel = v.slice();
  let t = 0;
  let apex = pos[2];
  const k = (0.5 * rho * cd * area) / mass;
  const acc = (vv) => {
    const rel = [vv[0] - wind[0], vv[1] - wind[1], vv[2] - wind[2]];
    const s = Math.hypot(rel[0], rel[1], rel[2]);
    return [-k * s * rel[0], -k * s * rel[1], -k * s * rel[2] - g];
  };
  let impact = null;
  track.push(0, { p: pos.slice(), v: vel.slice() });
  while (t < tMax) {
    const a1 = acc(vel);
    const v2 = vel.map((x, i) => x + (a1[i] * dt) / 2);
    const a2 = acc(v2);
    const nextV = vel.map((x, i) => x + a2[i] * dt);
    const nextP = pos.map((x, i) => x + v2[i] * dt);
    t += dt;
    const what = hit && hit(nextP, pos);
    const groundZ = typeof ground === "function" ? ground(nextP) : ground;
    if (what || nextP[2] <= groundZ) {
      let u = 1;
      if (!what && nextP[2] < groundZ) u = (pos[2] - groundZ) / (pos[2] - nextP[2] || 1);
      if (what && what.u !== undefined) u = what.u;
      const ip = pos.map((x, i) => x + (nextP[i] - x) * u);
      const iv = vel.map((x, i) => x + (nextV[i] - x) * u);
      const it = t - dt + dt * u;
      track.push(it, { p: ip, v: iv });
      impact = { t: it, p: ip, v: iv, what: what || { kind: "ground" } };
      break;
    }
    pos = nextP;
    vel = nextV;
    apex = Math.max(apex, pos[2]);
    track.push(t, { p: pos.slice(), v: vel.slice() });
  }
  if (!impact) impact = { t, p: pos, v: vel, what: { kind: "none" } };
  const speed0 = Math.hypot(...v);
  return { track, impact, apex, speed0, energy0: 0.5 * mass * speed0 * speed0, energyHit: 0.5 * mass * Math.hypot(...impact.v) ** 2 };
}

// Torsion skein: torque grows with total twist, stiffening as fibres tighten.
export function skeinTorque(twist, { stiffness, hardening = 0.6 }) {
  return stiffness * twist * (1 + hardening * twist * twist);
}
export function skeinEnergy(from, to, spec) {
  let e = 0;
  const steps = 64;
  for (let i = 0; i < steps; i++) {
    const a = from + ((to - from) * (i + 0.5)) / steps;
    e += skeinTorque(a, spec) * ((to - from) / steps);
  }
  return e;
}

export const sphereArea = (r) => Math.PI * r * r;

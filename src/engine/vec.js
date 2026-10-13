// Small vector toolkit shared by geometry, physics and effects.
export const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a) => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mix = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const ease = (t) => t * t * (3 - 2 * t);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const deg = (r) => (r * 180) / Math.PI;
export const rad = (d) => (d * Math.PI) / 180;
export const TAU = Math.PI * 2;

// Rodrigues rotation of v about unit axis by angle.
export function rotate(v, axis, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const d = dot(axis, v);
  const x = cross(axis, v);
  return [v[0] * c + x[0] * s + axis[0] * d * (1 - c), v[1] * c + x[1] * s + axis[1] * d * (1 - c), v[2] * c + x[2] * s + axis[2] * d * (1 - c)];
}
export const rotateAbout = (p, pivot, axis, angle) => add(pivot, rotate(sub(p, pivot), axis, angle));

// A rigid pose: origin + rotation as three column axes.
export const pose = (o = [0, 0, 0], X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1]) => ({ o, X, Y, Z });
export const apply = (T, p) => [
  T.o[0] + T.X[0] * p[0] + T.Y[0] * p[1] + T.Z[0] * p[2],
  T.o[1] + T.X[1] * p[0] + T.Y[1] * p[1] + T.Z[1] * p[2],
  T.o[2] + T.X[2] * p[0] + T.Y[2] * p[1] + T.Z[2] * p[2],
];
export const applyDir = (T, d) => [T.X[0] * d[0] + T.Y[0] * d[1] + T.Z[0] * d[2], T.X[1] * d[0] + T.Y[1] * d[1] + T.Z[1] * d[2], T.X[2] * d[0] + T.Y[2] * d[1] + T.Z[2] * d[2]];
// Pose rotating about an axis through a pivot (all in world).
export function hinge(pivot, axis, angle, parent = null) {
  const a = unit(axis);
  const X = rotate([1, 0, 0], a, angle);
  const Y = rotate([0, 1, 0], a, angle);
  const Z = rotate([0, 0, 1], a, angle);
  const o = sub(pivot, [X[0] * pivot[0] + Y[0] * pivot[1] + Z[0] * pivot[2], X[1] * pivot[0] + Y[1] * pivot[1] + Z[1] * pivot[2], X[2] * pivot[0] + Y[2] * pivot[1] + Z[2] * pivot[2]]);
  const T = { o, X, Y, Z };
  return parent ? compose(parent, T) : T;
}
export const translate = (d) => ({ o: d, X: [1, 0, 0], Y: [0, 1, 0], Z: [0, 0, 1] });
// compose(A, B) applies B then A.
export const compose = (A, B) => ({ o: apply(A, B.o), X: applyDir(A, B.X), Y: applyDir(A, B.Y), Z: applyDir(A, B.Z) });
export const IDENTITY = pose();

// Seeded random for stable decoration.
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

// Piecewise linear lookup in sorted [x, y] pairs.
export function lookup(table, x) {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (x <= table[i][0]) {
      const [x0, y0] = table[i - 1];
      const [x1, y1] = table[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
    }
  }
  return table[table.length - 1][1];
}

export const fmt = (x, digits = 1) => (Number.isFinite(x) ? x.toFixed(digits) : "—");
export const fmtInt = (x) => (Number.isFinite(x) ? Math.round(x).toLocaleString("en-US") : "—");

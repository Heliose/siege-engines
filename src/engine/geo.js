// The builder: every machine is authored with these calls. Each call draws one or more
// kit solids and registers each as a part with a convex proxy shape for the painter.
// World: x, y on the floor, z up. Down-range is −y. Units are the machine's own.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import * as TB from "../../vendor/anatomy/kit/tube.mjs";
import { shapeOf } from "./scene.js";
import { add, sub, mul, dot, cross, unit, len, lerp, TAU } from "./vec.js";

// ---------- polygons in a frame's (u, v) plane ----------
export const polyRect = (w, h, cx = 0, cy = 0) => [
  [cx - w / 2, cy - h / 2],
  [cx + w / 2, cy - h / 2],
  [cx + w / 2, cy + h / 2],
  [cx - w / 2, cy + h / 2],
];
export function polyRound(w, h, r, steps = 3) {
  r = Math.min(r, w / 2, h / 2);
  if (r <= 0) return polyRect(w, h);
  const out = [];
  const corners = [
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, Math.PI / 2],
    [-w / 2 + r, -h / 2 + r, Math.PI],
    [w / 2 - r, -h / 2 + r, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, a0] of corners) for (let i = 0; i <= steps; i++) {
    const a = a0 + (i / steps) * (Math.PI / 2);
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}
export const polyCircle = (r, n = 24, phase = 0) => Array.from({ length: n }, (_, i) => [r * Math.cos(phase + (i / n) * TAU), r * Math.sin(phase + (i / n) * TAU)]);
export function polySaw(rIn, rOut, teeth, phase = 0, flat = 0.25) {
  const out = [];
  for (let i = 0; i < teeth; i++) {
    const a = phase + (i / teeth) * TAU;
    const b = phase + ((i + 1) / teeth) * TAU;
    out.push([rIn * Math.cos(a), rIn * Math.sin(a)]);
    out.push([rOut * Math.cos(b - (b - a) * flat), rOut * Math.sin(b - (b - a) * flat)]);
    out.push([rOut * Math.cos(b - (b - a) * flat * 0.15), rOut * Math.sin(b - (b - a) * flat * 0.15)]);
  }
  return out;
}
export function polyGear(rIn, rOut, teeth, phase = 0) {
  const out = [];
  for (let i = 0; i < teeth; i++) {
    const a = phase + (i / teeth) * TAU;
    const s = TAU / teeth;
    out.push([rIn * Math.cos(a), rIn * Math.sin(a)]);
    out.push([rOut * Math.cos(a + s * 0.18), rOut * Math.sin(a + s * 0.18)]);
    out.push([rOut * Math.cos(a + s * 0.45), rOut * Math.sin(a + s * 0.45)]);
    out.push([rIn * Math.cos(a + s * 0.63), rIn * Math.sin(a + s * 0.63)]);
  }
  return out;
}
const signedArea = (pts) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    s += ax * by - bx * ay;
  }
  return s / 2;
};

// A frame along a → b, with u across and v as near to `up` as the axis allows.
export function frameFrom(a, b, up = [0, 0, 1]) {
  const ax = unit(sub(b, a));
  let u = cross(up, ax);
  if (len(u) < 1e-4) u = cross([0, 1, 0], ax);
  if (len(u) < 1e-4) u = cross([1, 0, 0], ax);
  u = unit(u);
  const v = cross(ax, u);
  return { o: a, a: ax, u, v };
}
export const framePoint = (F, s, x = 0, y = 0) => [
  F.o[0] + F.a[0] * s + F.u[0] * x + F.v[0] * y,
  F.o[1] + F.a[1] * s + F.u[1] * x + F.v[1] * y,
  F.o[2] + F.a[2] * s + F.u[2] * x + F.v[2] * y,
];
export const frameDir = (F, x, y, s = 0) => unit([F.a[0] * s + F.u[0] * x + F.v[0] * y, F.a[1] * s + F.u[1] * x + F.v[1] * y, F.a[2] * s + F.u[2] * x + F.v[2] * y]);

// k.extrude generalised to any frame: a polygon in (u, v) extruded along a from s0 to s1.
export function extrudeAlong(F, ring, s0, s1, P, { convex = true } = {}) {
  const V = G.viewOf(P);
  if (signedArea(ring) < 0) ring = [...ring].reverse();
  const n = ring.length;
  const capNear = dot(F.a, V) >= 0;
  const sTop = capNear ? s1 : s0;
  const sBot = capNear ? s0 : s1;
  const iso = (p) => k.iso(p, P);
  const top = ring.map(([x, y]) => iso(framePoint(F, sTop, x, y)));
  const bot = ring.map(([x, y]) => iso(framePoint(F, sBot, x, y)));
  const normals = ring.map(([ax, ay], i) => {
    const [bx, by] = ring[(i + 1) % n];
    return frameDir(F, by - ay, -(bx - ax));
  });
  const facing = normals.map((nn) => dot(nn, V) > 1e-9);
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
  const outline = [];
  const crease = [];
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
  const capTone = G.toneOf(capNear ? F.a : mul(F.a, -1), P);
  buckets[capTone].push(k.pathOf(top, true));
  let fill;
  if (convex) fill = k.pathOf(G.hullOf([...top, ...bot]), true);
  else {
    const parts = [k.pathOf(top, true), k.pathOf(bot, true)];
    for (let i = 0; i < n; i++) if (facing[i]) parts.push(k.pathOf([top[i], top[(i + 1) % n], bot[(i + 1) % n], bot[i]], true));
    fill = parts.join("");
  }
  return { fill, outline: outline.join(""), crease: crease.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((l) => l.join("")) };
}

// ---------- the builder ----------
export function createBuilder(scene, { unit: metresPerUnit = 0.01 } = {}) {
  const P = scene.P;
  const V = scene.V;
  const KS = scene.KS;
  const at = (p) => k.iso(p, P);
  let dynamic = false;
  let capture = null;
  const cache = new Map();
  const emit = (part) => {
    if (capture) capture.push(part);
    return dynamic ? scene.put(part) : scene.add(part);
  };
  const S = (paths, o) =>
    k.solidSvg(paths, { tone: o.tone ?? "hi", crease: o.crease ?? "faint", lit: !!o.lit, flat: !!o.flat, inner: o.inner || "" }) + (o.over || "");
  const L = (d, o = {}) => k.lineSvg(d, o);
  const D = (pts, o = {}) => k.dotsSvg(pts, o);
  const clipWrap = (id, svg, clip) => (clip ? `<clipPath id="cl-${id.replace(/[^\w-]/g, "_")}"><path d="${clip}"/></clipPath><g clip-path="url(#cl-${id.replace(/[^\w-]/g, "_")})">${svg}</g>` : svg);
  const partOf = (id, svg, shape, o) =>
    emit({ id, svg: clipWrap(id, svg, o.clip), shape, mat: o.mat, sys: o.sys, cut: o.cut, layer: o.layer, bias: o.bias, hidden: o.hidden, key: o.key, after: o.after, before: o.before, cls: o.cls });
  const visibleFace = (n) => dot(n, V) > 0.04;

  // Points of a ring at s in frame F (circumscribed so the polygon contains the circle).
  const ringPts = (F, s, r, count = 12) => {
    const R = r / Math.cos(Math.PI / count);
    return Array.from({ length: count }, (_, i) => framePoint(F, s, R * Math.cos((i / count) * TAU), R * Math.sin((i / count) * TAU)));
  };
  const prismShape = (F, poly, s0, s1) => {
    const pts = [];
    for (const [x, y] of poly) {
      pts.push(framePoint(F, s0, x, y));
      pts.push(framePoint(F, s1, x, y));
    }
    const axes = [F.a, F.u, F.v];
    const m = poly.length;
    if (m <= 8) for (let i = 0; i < m; i++) {
      const [ax, ay] = poly[i];
      const [bx, by] = poly[(i + 1) % m];
      axes.push(frameDir(F, by - ay, -(bx - ax)));
    }
    return shapeOf(pts, { axes, edges: [F.a, F.u, F.v] });
  };
  const roundShape = (F, s0, s1, r) => shapeOf([...ringPts(F, s0, r), ...ringPts(F, s1, r)], { axes: [F.a], edges: [F.a, F.u, F.v] });

  // Face helpers for a rectangular beam section w × h in frame F.
  const faces = (F, w, h) => [
    { n: F.u, along: F.v, half: h / 2, off: w / 2, key: "u" },
    { n: mul(F.u, -1), along: F.v, half: h / 2, off: -w / 2, key: "-u" },
    { n: F.v, along: F.u, half: w / 2, off: h / 2, key: "v" },
    { n: mul(F.v, -1), along: F.u, half: w / 2, off: -h / 2, key: "-v" },
  ];
  const facePoint = (F, f, s, x) => (f.key === "u" || f.key === "-u" ? framePoint(F, s, f.off, x * f.half) : framePoint(F, s, x * f.half, f.off));

  // A rope as a screen ribbon: in this orthographic camera a round rope always projects to a
  // band of half-width r·k around its projected centreline, so the outline, shine, shade, end
  // caps and lay twist are built in 2D. Pieces of about maxLength keep painter order local.
  const LIGHT2 = [-0.55, -0.83];
  const fmt1 = (x) => (Math.round(x * 10) / 10).toString();
  const poly = (list, closed) => list.length ? list.map(([x, y], i) => `${i ? "L" : "M"}${fmt1(x)} ${fmt1(y)}`).join("") + (closed ? "Z" : "") : "";
  function fastRope(id, pts, r, o) {
    const w = r * KS;
    const maxLen = o.maxLength ?? 14;
    const dense = G.resample(pts, Math.max(1.5, Math.min(maxLen / 3, r * 3)));
    if (dense.length < 2) return [];
    const along = [0];
    for (let i = 1; i < dense.length; i++) along.push(along[i - 1] + len(sub(dense[i], dense[i - 1])));
    const total = along[along.length - 1];
    const flat = dense.map(at);
    const nrm = flat.map((p, i) => {
      const a = flat[Math.max(0, i - 1)], b = flat[Math.min(flat.length - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const l = Math.hypot(tx, ty) || 1;
      return [-ty / l, tx / l, tx / l, ty / l];
    });
    const lit = (n) => (n[0] * LIGHT2[0] + n[1] * LIGHT2[1] >= 0 ? 1 : -1);
    const off = (i, f) => [flat[i][0] + nrm[i][0] * w * f, flat[i][1] + nrm[i][1] * w * f];
    const pieces = Math.max(1, Math.ceil(total / maxLen));
    const ids = [];
    const twist = o.twist ?? w > 1.2;
    const pitch = o.pitch ?? Math.max(0.8, r * 2.4);
    let j0 = 0;
    for (let pi = 0; pi < pieces; pi++) {
      const endAt = ((pi + 1) / pieces) * total;
      let j1 = j0;
      while (j1 < dense.length - 1 && along[j1] < endAt - 1e-6) j1++;
      if (pi === pieces - 1) j1 = dense.length - 1;
      const idx = [];
      for (let j = j0; j <= j1; j++) idx.push(j);
      if (idx.length < 2) idx.push(Math.min(dense.length - 1, j0 + 1));
      const sgn = lit(nrm[idx[Math.floor(idx.length / 2)]]);
      const left = idx.map((j) => off(j, 1)), right = idx.map((j) => off(j, -1));
      const capOf = (j, out) => {
        const [nx, ny, tx, ty] = nrm[j];
        const c = flat[j];
        const arc = [];
        for (let a = 1; a < 8; a++) {
          const t = (a / 8) * Math.PI;
          const cx = Math.cos(t), sx = Math.sin(t);
          arc.push([c[0] + nx * w * cx + out * tx * w * 0.45 * sx, c[1] + ny * w * cx + out * ty * w * 0.45 * sx]);
        }
        return arc;
      };
      const startCap = idx[0] === 0 && o.caps !== false ? capOf(0, -1).reverse() : [];
      const endCap = idx[idx.length - 1] === dense.length - 1 && o.caps !== false ? capOf(dense.length - 1, 1) : [];
      const body = poly([...left, ...endCap, ...right.slice().reverse(), ...startCap], true);
      let extra = "";
      if (w > 1.3) {
        const band = (f0, f1) => poly([...idx.map((j) => off(j, f0)), ...idx.slice().reverse().map((j) => off(j, f1))], true);
        extra += `<path class="tb-shine" d="${band(sgn * 0.12, sgn * 0.5)}"/><path class="tb-shade" d="${band(-sgn * 0.45, -sgn * 0.88)}"/>`;
      }
      if (twist) {
        const marks = [];
        const s0 = along[idx[0]], s1 = along[idx[idx.length - 1]];
        for (let s = Math.ceil(s0 / pitch) * pitch; s < s1; s += pitch) {
          let j = idx[0];
          while (j < idx[idx.length - 1] && along[j + 1] < s) j++;
          const u = (s - along[j]) / ((along[j + 1] ?? along[j]) - along[j] || 1);
          const p = [flat[j][0] + ((flat[j + 1] ?? flat[j])[0] - flat[j][0]) * u, flat[j][1] + ((flat[j + 1] ?? flat[j])[1] - flat[j][1]) * u];
          const [nx, ny, tx, ty] = nrm[j];
          marks.push([[p[0] + nx * w * 0.85 - tx * w * 0.5, p[1] + ny * w * 0.85 - ty * w * 0.5], [p[0] - nx * w * 0.85 + tx * w * 0.5, p[1] - ny * w * 0.85 + ty * w * 0.5]]);
        }
        if (marks.length) extra += `<path class="tb-ring" d="${marks.map((m) => poly(m)).join("")}" opacity="0.6"/>`;
      }
      const edges = poly([...startCap.slice().reverse(), ...left]) + poly(right) + (endCap.length ? poly([left[left.length - 1], ...endCap, right[right.length - 1]]) : "");
      const pid = `${id}~${pi}`;
      ids.push(pid);
      const p3 = idx.map((j) => dense[j]);
      partOf(pid, `<g class="tb"><path class="tb-body" d="${body}"/>${extra}<path class="iso-line tb-edge" data-tone="${o.tone || "hi"}" d="${edges}"/></g>`, shapeOf(p3, { r, edges: [unit(sub(p3[p3.length - 1], p3[0]))] }), { mat: "rope", ...o });
      j0 = j1;
    }
    return ids;
  }

  const B = {
    P,
    V,
    KS,
    unit: metresPerUnit,
    m: (metres) => metres / metresPerUnit,
    at,
    S,
    L,
    D,
    k,
    G,
    get dynamic() {
      return dynamic;
    },
    set dynamic(value) {
      dynamic = value;
    },
    visibleFace,
    // Re-emit the parts a block drew last time while its inputs are unchanged.
    keep(key, deps, fn) {
      if (!dynamic) return fn();
      const sig = JSON.stringify(deps);
      const hit = cache.get(key);
      if (hit && hit.sig === sig) {
        for (const p of hit.parts) scene.put(p);
        return;
      }
      const outer = capture;
      const list = [];
      capture = list;
      try {
        fn();
      } finally {
        capture = outer;
        if (outer) outer.push(...list);
      }
      cache.set(key, { sig, parts: list });
    },
    forget() {
      cache.clear();
    },
    raw(id, svg, shape, o = {}) {
      partOf(id, svg, shape || shapeOf([o.at || [0, 0, 0]], { r: o.r || 1 }), o);
    },
    solid(id, paths, shape, o = {}) {
      partOf(id, S(paths, o), shape, o);
    },

    // A squared timber (or iron bar) from a to b. w across (u), h up (v).
    beam(id, a, b, o = {}) {
      const { w = 4, h = w, up = [0, 0, 1], round = 0, bands = [], grain = 0, nails = [], pegs = [], s0 = 0, s1 = null, poly = null } = o;
      const F = frameFrom(a, b, up);
      const L0 = len(sub(b, a));
      const end = s1 ?? L0;
      const section = poly || (round > 0 ? polyRound(w, h, round) : polyRect(w, h));
      const cuts = [s0];
      const sorted = [...bands].map((band) => ({ at: band.at ?? band.s ?? band, w: band.w ?? Math.max(1.2, w * 0.35), t: band.t ?? Math.max(0.35, w * 0.08) })).sort((p, q) => p.at - q.at);
      for (const band of sorted) cuts.push(band.at - band.w / 2, band.at + band.w / 2);
      cuts.push(end);
      const segments = [];
      for (let i = 0; i < cuts.length; i += 2) segments.push([cuts[i], cuts[i + 1]]);
      segments.forEach(([from, to], index) => {
        if (to - from < 0.05) return;
        const paths = extrudeAlong(F, section, from, to, P);
        let inner = "";
        if (grain) {
          const lines = [];
          for (const f of faces(F, w, h)) {
            if (!visibleFace(f.n)) continue;
            for (let g = 1; g <= grain; g++) {
              const x = -1 + (2 * g) / (grain + 1) + (((g * 37 + index * 11) % 7) - 3) * 0.04;
              lines.push(k.pathOf([at(facePoint(F, f, from, x)), at(facePoint(F, f, to, x))]));
            }
          }
          inner += L(lines.join(""), { tone: "faint" });
        }
        let over = "";
        const dots = [];
        for (const nail of nails) {
          const s = nail.s ?? nail.at;
          if (s < from || s > to) continue;
          const f = faces(F, w, h).find((face) => face.key === (nail.face || "u"));
          if (!f || !visibleFace(f.n)) continue;
          for (const x of nail.x !== undefined ? [].concat(nail.x) : [-0.5, 0.5]) dots.push(at(facePoint(F, f, s, x)));
        }
        if (dots.length) over += D(dots, { size: o.nailSize || 0.5, tone: o.nailTone || "hi" });
        for (const peg of pegs) {
          const s = peg.s ?? peg.at;
          if (s < from || s > to) continue;
          const f = faces(F, w, h).find((face) => face.key === (peg.face || "u"));
          if (!f || !visibleFace(f.n)) continue;
          for (const x of peg.x !== undefined ? [].concat(peg.x) : [0]) {
            const c = facePoint(F, f, s, x);
            const PF = G.frameAlong(c, f.n);
            over += L(G.circleOf(PF, 0.05, peg.r || Math.min(w, h) * 0.12, P, 12), { tone: "lo" });
          }
        }
        const segId = segments.length > 1 ? `${id}.${index}` : id;
        partOf(segId, S(paths, { ...o, inner: (o.inner || "") + inner, over: (o.over || "") + over }), prismShape(F, section, from, to), o);
      });
      sorted.forEach((band, index) => {
        const t = band.t;
        const sec = round > 0 ? polyRound(w + 2 * t, h + 2 * t, round + t) : polyRect(w + 2 * t, h + 2 * t);
        const paths = extrudeAlong(F, sec, band.at - band.w / 2, band.at + band.w / 2, P);
        let over = "";
        const dots = [];
        for (const f of faces(F, w + 2 * t, h + 2 * t)) if (visibleFace(f.n) && o.bandNails !== false) dots.push(at(facePoint(F, f, band.at, 0)));
        if (dots.length) over = D(dots, { size: 0.45, tone: "hi" });
        partOf(`${id}.band${index}`, S(paths, { tone: "hi", crease: "lo", over }), prismShape(F, sec, band.at - band.w / 2, band.at + band.w / 2), { ...o, mat: o.bandMat || "iron", lit: false });
      });
      return { F, length: L0 };
    },

    // A prism of any polygon (in u, v) along a frame, s0 → s1.
    prism(id, F, poly, s0, s1, o = {}) {
      const paths = extrudeAlong(F, poly, s0, s1, P, { convex: o.convex ?? true });
      partOf(id, S(paths, o), prismShape(F, poly, s0, s1), o);
    },

    // A vertical kit slab on the floor plan.
    slab(id, plan, z, h, o = {}) {
      const paths = k.slabOf(plan, z, h, P, o.steps ?? 4, o.bevel ?? 0);
      let inner = o.inner || "";
      if (o.groove) inner += L(k.planOutline(k.insetPlan(plan, o.groove), z + h, P, o.steps ?? 4), { tone: "faint" });
      if (o.seams) inner += L(o.seams.map((zz) => k.sideSeam(plan, zz, P, o.steps ?? 4)).join(""), { tone: "faint" });
      const ring = k.ringOf(plan, 2);
      const pts = [...ring.map(([x, y]) => [x, y, z]), ...ring.map(([x, y]) => [x, y, z + h])];
      partOf(id, S(paths, { ...o, inner }), shapeOf(pts, { axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], edges: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] }), o);
    },

    // A round bar, pin, axle, drum or disc from p0 to p1.
    cyl(id, p0, p1, r, o = {}) {
      const L0 = len(sub(p1, p0));
      const F = o.F || G.frameAlong(p0, sub(p1, p0));
      const small = !o.lathe && r * KS < 6;
      const paths = small ? extrudeAlong(F, polyCircle(r, r * KS < 2.5 ? 10 : 16), 0, L0, P) : G.disc(0, L0, r, F, P, { bevel: o.bevel || 0, steps: o.steps });
      let inner = o.inner || "";
      if (o.seams) inner += L(o.seams.map((s) => G.arcOf(F, s, r, P)).join(""), { tone: o.seamTone || "faint" });
      if (o.ribs) {
        const rb = o.ribs;
        inner += k.fadedSvg(G.ribsOf(F, rb.s0 ?? 0, rb.s1 ?? L0, r, rb.count || 24, P, { fade: [0.1, 0.55], twist: rb.twist || 0, phase: rb.phase || 0 }), { tone: rb.tone || "lo" });
      }
      let over = o.over || "";
      if (o.bolts) for (const bc of [].concat(o.bolts)) over += D(G.dotsOf(F, bc.s ?? L0, bc.r ?? r * 0.7, bc.count || 6, P, { all: bc.all ?? true, phase: bc.phase || 0, fade: bc.all === false ? [0.04, 0.42] : null }), { size: bc.size || 0.5, tone: bc.tone || "hi" });
      if (o.faceRing) for (const fr of [].concat(o.faceRing)) {
        const s = fr.s ?? L0;
        const nrm = s > L0 / 2 ? F.a : mul(F.a, -1);
        if (visibleFace(nrm)) over += L(G.circleOf(F, s, fr.r, P), { tone: fr.tone || "faint" });
      }
      partOf(id, S(paths, { ...o, inner, over }), roundShape(F, 0, L0, r), o);
      return F;
    },

    // An annulus: rings, washers, hoops, bushings.
    ring(id, p0, p1, rIn, rOut, o = {}) {
      const L0 = len(sub(p1, p0));
      const F = o.F || G.frameAlong(p0, sub(p1, p0));
      const paths = G.ringBand(0, L0, rIn, rOut, F, P);
      partOf(id, S(paths, o), roundShape(F, 0, L0, rOut), o);
      return F;
    },

    // A turned part: profile [[s, r(, smooth)]] along frame F.
    turned(id, F, profile, o = {}) {
      const rMax = Math.max(...profile.map(([, r]) => r));
      const paths = G.solidOf(profile, F, P, { smooth: o.smooth ?? (rMax * KS < 7 ? false : "auto"), bevel: o.bevel || 0 });
      const pts = [];
      for (const [s, r] of profile) pts.push(...ringPts(F, s, Math.max(r, 0.01), 10));
      let inner = o.inner || "";
      if (o.seams) inner += L(o.seams.map(([s, r, slope = 0]) => G.arcOf(F, s, r, P, { slope })).join(""), { tone: "faint" });
      partOf(id, S(paths, { ...o, inner }), shapeOf(pts, { axes: [F.a], edges: [F.a, F.u, F.v] }), o);
    },

    ball(id, c, r, o = {}) {
      const paths = G.sphereOf(c, r, P, { steps: o.steps || (r * KS < 4 ? 20 : r * KS < 10 ? 28 : 40) });
      partOf(id, S(paths, o), shapeOf([c], { r }), o);
    },

    // A rope, cable, sling cord or bowstring. Returns its pieces' ids.
    rope(id, pts, r, o = {}) {
      if (pts.length < 2) return [];
      if (r * KS < (o.thin ?? 1.3)) {
        const d = k.pathOf(pts.map(at));
        partOf(`${id}~0`, `<path class="iso-line rope-line" data-tone="${o.tone || "hi"}" style="stroke-width:${Math.max(0.7, 2 * r * KS).toFixed(2)}px" d="${d}"/>`, shapeOf(pts, { r, edges: [unit(sub(pts[pts.length - 1], pts[0]))] }), { mat: "rope", ...o });
        return [`${id}~0`];
      }
      if (!o.precise) return fastRope(id, pts, r, o);
      const twist = o.twist ?? r * KS > 1.2;
      const pieces = TB.tubePieces(pts, r, P, {
        maxLength: o.maxLength ?? 14,
        spacing: Math.max(1.2, Math.min(3, r * 2)),
        caps: o.caps ?? true,
        rings: twist ? { pitch: o.pitch ?? Math.max(0.8, r * 2.4), twist: o.lay ?? 1.3, fade: [0.12, 0.6], tone: "lo" } : null,
      });
      const ids = [];
      pieces.forEach((piece, i) => {
        const pid = `${id}~${i}`;
        ids.push(pid);
        partOf(pid, TB.tubeSvg(piece, { tone: o.tone || "hi" }), shapeOf(piece.points, { r, edges: [unit(sub(piece.points[piece.points.length - 1], piece.points[0]))], axes: [] }), { mat: "rope", ...o });
      });
      return ids;
    },
    // A thin taut line (bowstring, lashing) drawn as a stroked path.
    cord(id, pts, o = {}) {
      const d = k.pathOf(pts.map(at));
      const width = o.width ?? 1.1;
      partOf(id, `<path class="iso-line cord" data-tone="${o.tone || "hi"}" style="stroke-width:${width}px" d="${d}"/>`, shapeOf(pts, { r: o.r ?? 0.4, edges: [unit(sub(pts[pts.length - 1], pts[0]))] }), o);
    },

    // Soft ground shadow under a footprint polygon (floor points).
    halo(id, ring, z = 0, o = {}) {
      const d = k.pathOf(G.hullOf(ring.map(([x, y]) => at([x, y, z]))), true);
      partOf(id, `<path class="iso-halo" d="${d}"${o.blur ? ` style="filter:blur(${o.blur}px)"` : ""}/>`, shapeOf(ring.map(([x, y]) => [x, y, z])), { layer: -1, ...o });
    },

    // Lines with no body of their own (marks, ticks) drawn as a part.
    marks(id, svg, pts, o = {}) {
      partOf(id, svg, shapeOf(pts, { r: o.r ?? 0.3 }), o);
    },

    // A spoked wheel. T is a frame {o, a, u, v}: axis a, hub centre o. phase turns it.
    wheel(id, F, o = {}) {
      const { R = 30, rim = 3, width = 4, spokes = 8, hub = 5, hubLen = width * 1.8, phase = 0, segments = 16, spokeW = 1.6, mat = "wood", tone = "hi", tyre = 0 } = o;
      const s0 = -width / 2;
      const s1 = width / 2;
      const rIn = R - rim;
      for (let i = 0; i < segments; i++) {
        const a0 = phase + (i / segments) * TAU;
        const a1 = phase + ((i + 1) / segments) * TAU;
        const poly = [
          [rIn * Math.cos(a0), rIn * Math.sin(a0)],
          [rIn * Math.cos(a1), rIn * Math.sin(a1)],
          [R * Math.cos(a1), R * Math.sin(a1)],
          [R * Math.cos((a0 + a1) / 2) / Math.cos((a1 - a0) / 2), R * Math.sin((a0 + a1) / 2) / Math.cos((a1 - a0) / 2)].map((x) => x * 0.995),
          [R * Math.cos(a0), R * Math.sin(a0)],
        ];
        const rimF = { o: F.o, a: F.a, u: F.u, v: F.v };
        const paths = extrudeAlong(rimF, poly, s0, s1, P);
        let over = "";
        if (o.nails !== false && i % 2 === 0) {
          const mid = (a0 + a1) / 2;
          const n = F.a;
          const sFace = visibleFace(n) ? s1 : visibleFace(mul(n, -1)) ? s0 : null;
          if (sFace !== null) over = D([at(framePoint(F, sFace, (R - rim / 2) * Math.cos(mid), (R - rim / 2) * Math.sin(mid)))], { size: 0.45, tone: "hi" });
        }
        partOf(`${id}.rim${i}`, S(paths, { tone, over }), prismShape(rimF, poly, s0, s1), { ...o, mat });
        if (tyre) {
          const tp = [
            [R * Math.cos(a0), R * Math.sin(a0)],
            [R * Math.cos(a1), R * Math.sin(a1)],
            [(R + tyre) * Math.cos(a1), (R + tyre) * Math.sin(a1)],
            [(R + tyre) * Math.cos(a0), (R + tyre) * Math.sin(a0)],
          ];
          partOf(`${id}.tyre${i}`, S(extrudeAlong(rimF, tp, s0 + 0.3, s1 - 0.3, P), { tone: "hi", crease: "lo" }), prismShape(rimF, tp, s0 + 0.3, s1 - 0.3), { ...o, mat: "iron" });
        }
      }
      for (let i = 0; i < spokes; i++) {
        const a = phase + ((i + 0.5) / spokes) * TAU;
        const dir = frameDir(F, Math.cos(a), Math.sin(a));
        const p0 = add(F.o, mul(dir, hub * 0.98));
        const p1 = add(F.o, mul(dir, rIn + 0.2));
        B.beam(`${id}.spoke${i}`, p0, p1, { w: spokeW, h: spokeW * 0.8, up: F.a, mat, tone, sys: o.sys, cut: o.cut, layer: o.layer });
      }
      B.cyl(`${id}.hub`, add(F.o, mul(F.a, -hubLen / 2)), add(F.o, mul(F.a, hubLen / 2)), hub, { mat, tone, sys: o.sys, cut: o.cut, layer: o.layer, faceRing: [{ s: 0, r: hub * 0.55 }, { s: hubLen, r: hub * 0.55 }], bolts: o.hubBolts ? [{ s: hubLen, r: hub * 0.75, count: 6 }, { s: 0, r: hub * 0.75, count: 6 }] : undefined });
      if (o.hubBands !== false) {
        B.ring(`${id}.hubband0`, add(F.o, mul(F.a, -hubLen / 2)), add(F.o, mul(F.a, -hubLen / 2 + 0.8)), hub, hub + 0.45, { mat: "iron", tone: "hi", sys: o.sys, cut: o.cut, layer: o.layer });
        B.ring(`${id}.hubband1`, add(F.o, mul(F.a, hubLen / 2 - 0.8)), add(F.o, mul(F.a, hubLen / 2)), hub, hub + 0.45, { mat: "iron", tone: "hi", sys: o.sys, cut: o.cut, layer: o.layer });
      }
    },

    // A toothed disc (ratchet, gear, sprocket) in frame F, thickness s0 → s1.
    toothed(id, F, poly, s0, s1, o = {}) {
      const paths = extrudeAlong(F, poly, s0, s1, P, { convex: false });
      const rMax = Math.max(...poly.map(([x, y]) => Math.hypot(x, y)));
      partOf(id, S(paths, o), roundShape(F, s0, s1, rMax), o);
    },

    // A chain of links along a polyline. Alternate links turn 90°.
    chain(id, pts, o = {}) {
      const { link = 3, wire = 0.45, mat = "iron" } = o;
      const route = G.resample(pts, link * 0.78);
      for (let i = 0; i + 1 < route.length; i++) {
        const a = route[i];
        const b = route[i + 1];
        const ax = unit(sub(b, a));
        const side = i % 2 ? frameFrom(a, b, [0, 0, 1]).u : frameFrom(a, b, [0, 0, 1]).v;
        const F = { o: a, a: ax, u: unit(cross(side, ax)), v: side };
        const l = len(sub(b, a));
        const poly = [[-wire, -link * 0.32], [wire, -link * 0.32], [wire, link * 0.32], [-wire, link * 0.32]];
        const Fl = { o: add(a, mul(ax, -link * 0.12)), a: ax, u: F.u, v: F.v };
        partOf(`${id}~${i}`, S(extrudeAlong(Fl, poly, 0, l + link * 0.24, P), { tone: o.tone || "hi", crease: "lo" }), prismShape(Fl, poly, 0, l + link * 0.24), { ...o, mat });
      }
    },

    // The display plinth the machine stands on: a heavy plate on feet, a groove, corner
    // screws, a metre ruler along the front edge and a label plate.
    plinth(plan, o = {}) {
      const { h = 10, foot = 5, z = 0, ruler = true, label = true, groove = 6, mat } = o;
      const zTop = z;
      const zBot = z - h;
      emit({ id: "plinth.halo", svg: `<path class="iso-halo" d="${k.haloOf(plan, zBot - foot, h, P)}"/>`, shape: shapeOf(k.ringOf(plan, 2).map(([x, y]) => [x, y, zBot - foot])), layer: -3 });
      const feet = k.corners(plan, Math.min(26, plan.w * 0.08, plan.d * 0.12)).sort((p, q) => dot([p[0], p[1], 0], V) - dot([q[0], q[1], 0], V));
      feet.forEach(([x, y], i) => {
        emit({ id: `plinth.foot${i}`, svg: S(k.cylinder(x, y, 8, zBot - foot, 1.8, P, 28), { tone: "lo" }) + S(k.cylinder(x, y, 6, zBot - foot + 1.8, foot - 1.8, P, 28), { tone: "mid" }), shape: shapeOf([[x, y, zBot - foot], [x, y, zBot]], { r: 8 }), layer: -3, mat });
      });
      const screws = k.corners(plan, 12);
      const inner = groove ? L(k.planOutline(k.insetPlan(plan, groove), zTop, P, 8), { tone: "lo" }) : "";
      const over = L(screws.map(([x, y]) => k.ring(x, y, 2.4, zTop, P, 16)).join(""), { tone: "lo" }) + D(screws.map(([x, y]) => at([x, y, zTop])), { size: 0.55 });
      emit({ id: "plinth.slab", svg: S(k.slabOf(plan, zBot, h, P, 8, 1.6), { tone: "mid", inner, over }), shape: shapeOf(k.ringOf(plan, 2).flatMap(([x, y]) => [[x, y, zBot], [x, y, zTop]])), layer: -2, mat });
      if (ruler) {
        const metre = 1 / metresPerUnit;
        const alongY = ruler === "y";
        const strip = alongY ? { x: plan.x + plan.w - 16, y: plan.y + 18, w: 8, d: plan.d - 36, r: 1 } : { x: plan.x + 18, y: plan.y + plan.d - 16, w: plan.w - 36, d: 8, r: 1 };
        const step = metre >= 40 ? metre / 10 : metre >= 12 ? metre / 4 : metre >= 4 ? metre : metre * 5;
        const every = metre >= 40 ? 10 : metre >= 12 ? 4 : 5;
        const ticks = alongY ? k.topTicks(strip.y + 4, strip.y + strip.d - 4, step, every, strip.x + 0.8, zTop + 0.6, [2.2, 4.4], P, "y") : k.topTicks(strip.x + 4, strip.x + strip.w - 4, step, every, strip.y + 0.8, zTop + 0.6, [2.2, 4.4], P);
        const s = S(k.slabOf(strip, zTop, 0.6, P, 3), { tone: "lo", crease: "none" }) + L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }) + D(alongY ? [at([strip.x + 4, strip.y + 2, zTop + 0.6]), at([strip.x + 4, strip.y + strip.d - 2, zTop + 0.6])] : [at([strip.x + 2, strip.y + 4, zTop + 0.6]), at([strip.x + strip.w - 2, strip.y + 4, zTop + 0.6])], { size: 0.45 });
        emit({ id: "plinth.ruler", svg: s, shape: shapeOf([[strip.x, strip.y, zTop], [strip.x + strip.w, strip.y + strip.d, zTop + 0.6]]), layer: -1, mat });
      }
      if (label) {
        const lp = typeof label === "object" ? label : { x: plan.x + 22, y: plan.y + plan.d - 44, w: 46, d: 20, r: 1.5 };
        const lines = [0.32, 0.52, 0.72].map((f, i) => k.lineOnTop([lp.x + 5, lp.y + lp.d * f], [lp.x + lp.w - 6 - i * 9, lp.y + lp.d * f], zTop + 0.8, P)).join("");
        const s = S(k.slabOf(lp, zTop, 0.8, P, 4), { tone: "mid", inner: L(k.planOutline(k.insetPlan(lp, 1.6), zTop + 0.8, P, 4), { tone: "faint" }) }) + L(lines, { tone: "lo", free: true }) + D([at([lp.x + 2.6, lp.y + lp.d / 2, zTop + 0.8]), at([lp.x + lp.w - 2.6, lp.y + lp.d / 2, zTop + 0.8])], { size: 0.5 });
        emit({ id: "plinth.label", svg: s, shape: shapeOf([[lp.x, lp.y, zTop], [lp.x + lp.w, lp.y + lp.d, zTop + 0.8]]), layer: -1, mat });
      }
    },
  };
  return B;
}

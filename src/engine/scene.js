// The painter. Every drawn part carries a convex proxy shape (points plus a radius);
// wherever two parts overlap on screen, a separating axis between their shapes decides
// which one is nearer the viewer, and a topological sort paints back to front.
// Static pairs are solved once; pairs with a moving part are solved every frame.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { dot, sub, cross, unit, len } from "./vec.js";

const SVGNS = "http://www.w3.org/2000/svg";
const Z = [0, 0, 1];

export function shapeOf(pts, { r = 0, axes = [], edges = [] } = {}) {
  let cx = 0, cy = 0, cz = 0;
  for (const p of pts) {
    cx += p[0];
    cy += p[1];
    cz += p[2];
  }
  const n = pts.length || 1;
  return { pts, r, axes: axes.map(unit), edges: edges.map(unit), c: [cx / n, cy / n, cz / n] };
}

export function createScene(root, P) {
  const hostOf = (layer) => (typeof root === "function" ? root(layer || 0) : root);
  const V = G.viewOf(P);
  const KS = G.scaleOf(P);
  const at = (p) => k.iso(p, P);
  const parts = new Map();
  let order = [];
  let staticEdges = null;
  let dirty = true;
  let frameIds = null;
  let focus = null;
  let version = 0;
  const relCache = new Map();
  function cachedRelation(a, b) {
    const flip = a.id > b.id;
    const p = flip ? b : a, q = flip ? a : b;
    const key = p.id + "" + q.id;
    const c = relCache.get(key);
    let rel;
    if (c && c.vp === p.ver && c.vq === q.ver) rel = c.rel;
    else {
      rel = relation(p, q);
      relCache.set(key, { vp: p.ver, vq: q.ver, rel });
    }
    return flip ? -rel : rel;
  }

  function boxOf(shape) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of shape.pts) {
      const [sx, sy] = at(p);
      if (sx < x0) x0 = sx;
      if (sy < y0) y0 = sy;
      if (sx > x1) x1 = sx;
      if (sy > y1) y1 = sy;
    }
    const pad = shape.r * KS + 0.5;
    return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
  }

  function interval(shape, n) {
    let lo = Infinity, hi = -Infinity;
    for (const p of shape.pts) {
      const d = p[0] * n[0] + p[1] * n[1] + p[2] * n[2];
      if (d < lo) lo = d;
      if (d > hi) hi = d;
    }
    return [lo - shape.r, hi + shape.r];
  }

  // -1: a behind b, 1: b behind a, 0: no information.
  function relation(a, b) {
    const A = a.shape, B = b.shape;
    const tol = Math.min(0.6, 0.12 * Math.max(0.5, Math.min(a.size, b.size)));
    const axes = [];
    for (const n of A.axes) axes.push(n);
    for (const n of B.axes) axes.push(n);
    const d = sub(B.c, A.c);
    if (len(d) > 1e-6) axes.push(unit(d));
    axes.push(Z, V);
    for (const e of A.edges) for (const f of B.edges) {
      const c = cross(e, f);
      const l = len(c);
      if (l > 1e-3) axes.push([c[0] / l, c[1] / l, c[2] / l]);
    }
    let best = 0, bestScore = -Infinity;
    for (const n of axes) {
      const [a0, a1] = interval(A, n);
      const [b0, b1] = interval(B, n);
      const g1 = b0 - a1;
      const g2 = a0 - b1;
      const g = Math.max(g1, g2);
      if (g < -tol) continue;
      const nv = dot(n, V);
      if (Math.abs(nv) < 0.02) continue;
      const score = g + 4 * Math.abs(nv);
      if (score > bestScore) {
        bestScore = score;
        const bAbove = g1 >= g2;
        best = bAbove === nv > 0 ? -1 : 1;
        if (g > 0.5 && Math.abs(nv) > 0.2) break;
      }
    }
    if (best) return best;
    const ka = a.key, kb = b.key;
    return ka <= kb ? -1 : 1;
  }

  const boxOverlap = (p, q) => p.box[0] < q.box[2] && q.box[0] < p.box[2] && p.box[1] < q.box[3] && q.box[1] < p.box[3];
  // The projected outline of a part's proxy: the 2D hull of its points, widened by its radius.
  function hullOf2(part) {
    if (part._hullShape === part.shape) return part._hull;
    const pts = part.shape.pts.map(at);
    part._hull = pts.length > 2 ? G.hullOf(pts) : pts;
    part._hullShape = part.shape;
    return part._hull;
  }
  // Only parts whose outlines really overlap on screen get an order: constraints between
  // parts that merely share a bounding box are unnecessary and can chain into cycles.
  function overlap(p, q) {
    if (!boxOverlap(p, q)) return false;
    const A = hullOf2(p), B = hullOf2(q);
    const ra = p.shape.r * KS + 0.25, rb = q.shape.r * KS + 0.25;
    const axes = [];
    const edges = (H) => {
      if (H.length === 2) {
        const dx = H[1][0] - H[0][0], dy = H[1][1] - H[0][1];
        axes.push([dy, -dx], [dx, dy]);
      } else if (H.length > 2) for (let i = 0; i < H.length; i++) {
        const a = H[i], b = H[(i + 1) % H.length];
        axes.push([b[1] - a[1], a[0] - b[0]]);
      }
    };
    edges(A);
    edges(B);
    const ca = A.reduce((s, v) => [s[0] + v[0] / A.length, s[1] + v[1] / A.length], [0, 0]);
    const cb = B.reduce((s, v) => [s[0] + v[0] / B.length, s[1] + v[1] / B.length], [0, 0]);
    axes.push([cb[0] - ca[0], cb[1] - ca[1]]);
    for (const [nx0, ny0] of axes) {
      const l = Math.hypot(nx0, ny0);
      if (l < 1e-9) continue;
      const nx = nx0 / l, ny = ny0 / l;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const v of A) {
        const d = v[0] * nx + v[1] * ny;
        if (d < a0) a0 = d;
        if (d > a1) a1 = d;
      }
      for (const v of B) {
        const d = v[0] * nx + v[1] * ny;
        if (d < b0) b0 = d;
        if (d > b1) b1 = d;
      }
      if (a1 + ra < b0 - rb || b1 + rb < a0 - ra) return false;
    }
    return true;
  }

  function makeEl(part) {
    const el = document.createElementNS(SVGNS, "g");
    el.setAttribute("class", "pt");
    el.dataset.id = part.id;
    if (part.mat) el.setAttribute("data-mat", part.mat);
    if (part.sys) el.dataset.sys = part.sys;
    if (part.cut) el.dataset.cut = "";
    if (part.cls) el.classList.add(...part.cls.split(" "));
    el.innerHTML = part.svg;
    return el;
  }

  function put(part, dynamic) {
    const shape = part.shape || shapeOf([part.at || [0, 0, 0]]);
    const prev = parts.get(part.id);
    const key = part.key ?? dot(shape.c, V) + (part.bias || 0);
    const same = prev && prev.shape === shape;
    const box = same ? prev.box : part.box || boxOf(shape);
    const size = same ? prev.size : Math.max(shape.r, (box[2] - box[0] + box[3] - box[1]) / (4 * KS));
    if (prev) {
      if (!same || prev.key !== key) prev.ver = ++version;
      if (prev.svg !== part.svg) {
        prev.el.innerHTML = part.svg;
        prev.svg = part.svg;
        prev.ver = ++version;
      }
      if ((prev.mat || "") !== (part.mat || "")) part.mat ? prev.el.setAttribute("data-mat", part.mat) : prev.el.removeAttribute("data-mat");
      if ((prev.sys || "") !== (part.sys || "")) {
        part.sys ? (prev.el.dataset.sys = part.sys) : delete prev.el.dataset.sys;
        prev.sys = part.sys;
        applyFocus(prev);
      }
      if (prev.hidden !== !!part.hidden) prev.el.style.display = part.hidden ? "none" : "";
      if ((prev.cls || "") !== (part.cls || "")) {
        prev.el.setAttribute("class", part.cls ? `pt ${part.cls}` : "pt");
        prev.cls = part.cls;
      }
      Object.assign(prev, { shape, key, box, size, layer: part.layer || 0, dynamic, mat: part.mat, hidden: !!part.hidden, after: part.after, before: part.before });
      return prev;
    }
    const entry = { id: part.id, ver: ++version, svg: part.svg, shape, key, box, size, layer: part.layer || 0, dynamic, cls: part.cls, sys: part.sys, mat: part.mat, cut: part.cut, hidden: !!part.hidden, after: part.after, before: part.before };
    entry.el = makeEl(part);
    if (entry.hidden) entry.el.style.display = "none";
    applyFocus(entry);
    parts.set(part.id, entry);
    hostOf(entry.layer).appendChild(entry.el);
    dirty = true;
    return entry;
  }

  function applyFocus(entry) {
    const on = focus && entry.sys && entry.sys.split(" ").includes(focus);
    if (on) entry.el.dataset.on = "";
    else delete entry.el.dataset.on;
  }

  function solveStatic() {
    const list = [...parts.values()].filter((p) => !p.dynamic);
    staticEdges = new Map();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.layer !== b.layer || !overlap(a, b)) continue;
        const rel = relation(a, b);
        if (rel < 0) push(staticEdges, a.id, b.id);
        else if (rel > 0) push(staticEdges, b.id, a.id);
      }
    }
  }
  const push = (map, from, to) => {
    let list = map.get(from);
    if (!list) map.set(from, (list = []));
    list.push(to);
  };

  function sortAll() {
    if (!staticEdges) solveStatic();
    const all = [...parts.values()].filter((p) => !p.hidden);
    const byLayer = new Map();
    for (const p of all) {
      let list = byLayer.get(p.layer);
      if (!list) byLayer.set(p.layer, (list = []));
      list.push(p);
    }
    const out = [];
    for (const layer of [...byLayer.keys()].sort((a, b) => a - b)) {
      const list = byLayer.get(layer);
      const index = new Map(list.map((p, i) => [p.id, i]));
      const succ = list.map(() => []);
      const indeg = list.map(() => 0);
      const link = (i, j) => {
        succ[i].push(j);
        indeg[j]++;
      };
      for (const [from, tos] of staticEdges) {
        const i = index.get(from);
        if (i === undefined) continue;
        for (const to of tos) {
          const j = index.get(to);
          if (j !== undefined) link(i, j);
        }
      }
      const dyn = list.filter((p) => p.dynamic);
      for (const a of dyn) {
        const i = index.get(a.id);
        for (const b of list) {
          if (b === a || (b.dynamic && index.get(b.id) < i)) continue;
          if (!overlap(a, b)) continue;
          const j = index.get(b.id);
          const rel = cachedRelation(a, b);
          if (rel < 0) link(i, j);
          else if (rel > 0) link(j, i);
        }
      }
      for (const p of list) {
        const i = index.get(p.id);
        for (const id of p.after || []) {
          const j = index.get(id);
          if (j !== undefined) link(j, i);
        }
        for (const id of p.before || []) {
          const j = index.get(id);
          if (j !== undefined) link(i, j);
        }
      }
      const done = list.map(() => false);
      for (let count = 0; count < list.length; count++) {
        let pick = -1;
        for (let i = 0; i < list.length; i++) {
          if (done[i] || indeg[i] > 0) continue;
          if (pick < 0 || list[i].key < list[pick].key) pick = i;
        }
        if (pick < 0) {
          for (let i = 0; i < list.length; i++) {
            if (done[i]) continue;
            if (pick < 0 || indeg[i] < indeg[pick] || (indeg[i] === indeg[pick] && list[i].key < list[pick].key)) pick = i;
          }
        }
        done[pick] = true;
        for (const j of succ[pick]) indeg[j]--;
        out.push(list[pick]);
      }
    }
    return out;
  }

  function paint(force = false) {
    if (!dirty && !force) return false;
    const next = sortAll();
    let same = next.length === order.length;
    if (same) for (let i = 0; i < next.length; i++) if (next[i] !== order[i]) { same = false; break; }
    if (!same) {
      const frags = new Map();
      const fragOf = (p) => {
        const host = hostOf(p.layer);
        let f = frags.get(host);
        if (!f) frags.set(host, (f = document.createDocumentFragment()));
        return f;
      };
      for (const p of next) fragOf(p).appendChild(p.el);
      for (const p of parts.values()) if (p.hidden) fragOf(p).appendChild(p.el);
      for (const [host, f] of frags) host.appendChild(f);
      order = next;
    }
    dirty = false;
    return true;
  }

  return {
    P,
    V,
    KS,
    at,
    depth: (p) => dot(p, V),
    parts,
    // Static parts: put once, then call seal() to solve their order.
    add(part) {
      put(part, false);
      staticEdges = null;
      dirty = true;
    },
    seal() {
      staticEdges = null;
      solveStatic();
      dirty = true;
    },
    // Dynamic parts: put every frame between frame() and commit().
    frame() {
      frameIds = new Set();
    },
    put(part) {
      frameIds.add(part.id);
      put(part, true);
      dirty = true;
    },
    commit() {
      for (const [id, p] of parts) {
        if (p.dynamic && !frameIds.has(id)) {
          p.el.remove();
          parts.delete(id);
          dirty = true;
        }
      }
      frameIds = null;
    },
    paint,
    touch() {
      dirty = true;
    },
    setFocus(sys) {
      focus = sys || null;
      for (const p of parts.values()) applyFocus(p);
    },
    clear() {
      relCache.clear();
      for (const p of parts.values()) p.el.remove();
      parts.clear();
      order = [];
      staticEdges = null;
      dirty = true;
    },
  };
}

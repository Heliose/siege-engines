// What each kind of ammunition looks like, drawn with the builder at any pose.
// Sizes are in the caller's world units; `dir` is the projectile's long axis (bolts) or spin.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { add, sub, mul, dot, cross, unit, len, rotate, rng, TAU } from "./vec.js";
import { frameFrom, framePoint } from "./geo.js";
import { shapeOf } from "./scene.js";

// A dressed stone ball with a few tool pits on the side that faces the viewer.
export function stone(B, id, c, r, o = {}) {
  const pits = [];
  const R = rng(o.seed ?? 7);
  const spin = o.spin ?? 0;
  for (let i = 0; i < Math.round(o.pits ?? 7); i++) {
    const a = R() * TAU + spin;
    const b = (R() - 0.5) * 2.2;
    const n = unit([Math.cos(a) * Math.cos(b), Math.sin(a) * Math.cos(b), Math.sin(b)]);
    const f = dot(n, B.V);
    if (f < 0.25) continue;
    const [x, y] = B.at(add(c, mul(n, r)));
    pits.push([x, y, Math.min(1, (f - 0.25) * 3)]);
  }
  const over = pits.length && r * B.KS > 3 ? B.D(pits, { size: Math.max(0.35, r * B.KS * 0.045), tone: "mid" }) : "";
  B.ball(id, c, r, { mat: o.mat || "granite", tone: o.tone || "hi", lit: o.lit, cls: o.cls, over, sys: o.sys, layer: o.layer, cut: o.cut, bias: o.bias, hidden: o.hidden });
}

// A clay fire-pot: round belly, short neck, a lip, a rope net and a tow wick.
export function pot(B, id, c, r, o = {}) {
  const axis = o.axis || [0, 0, 1];
  const F = G.frameAlong(add(c, mul(unit(axis), -r * 0.95)), axis);
  const prof = [
    [0, r * 0.38], [r * 0.12, r * 0.62, 1], [r * 0.45, r * 0.92, 1], [r * 0.85, r * 1.0, 1], [r * 1.25, r * 0.9, 1], [r * 1.55, r * 0.6, 1], [r * 1.72, r * 0.36], [r * 1.72, r * 0.42], [r * 1.86, r * 0.42], [r * 1.86, r * 0.3],
  ];
  const seams = [G.arcOf(F, r * 0.85, r * 1.0, B.P), G.arcOf(F, r * 1.25, r * 0.9, B.P, { slope: -0.25 })].join("");
  const netLines = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + (o.spin || 0);
    const pts = [];
    for (let j = 0; j <= 10; j++) {
      const s = r * 0.2 + (j / 10) * r * 1.45;
      const rr = profileR(prof, s) + 0.08;
      pts.push(G.pointOf(F, s, rr, a + (j / 10) * 0.6));
    }
    const mid = pts[5];
    const nrm = unit(sub(mid, G.pointOf(F, r * 0.92, 0, 0)));
    if (dot(nrm, B.V) > 0.15) netLines.push(k.pathOf(pts.map(B.at)));
  }
  const inner = B.L(seams, { tone: "faint" }) + B.L(netLines.join(""), { tone: "mid" });
  B.turned(id, F, prof, { mat: "clay", tone: "hi", inner, lit: o.lit, cls: o.cls, sys: o.sys, layer: o.layer, bias: o.bias, hidden: o.hidden });
  if (o.wick !== false) {
    const top = framePoint(F, r * 1.86, 0, 0);
    const tip = add(top, mul(unit(add(unit(axis), [0.3, 0.2, 0])), r * 0.5));
    B.rope(`${id}.wick`, [top, tip], Math.max(0.25, r * 0.09), { mat: "rope", twist: false, layer: o.layer, bias: (o.bias || 0) + 0.2, hidden: o.hidden });
  }
}
function profileR(prof, s) {
  for (let i = 1; i < prof.length; i++) if (s <= prof[i][0]) {
    const [s0, r0] = prof[i - 1];
    const [s1, r1] = prof[i];
    return r0 + ((r1 - r0) * (s - s0)) / (s1 - s0 || 1);
  }
  return prof[prof.length - 1][1];
}

// A net bag of field stones (scatter shot).
export function cluster(B, id, c, r, o = {}) {
  const R = rng(o.seed ?? 3);
  const balls = [];
  const n = o.count ?? 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + R() * 0.4 + (o.spin || 0);
    const z = (R() - 0.5) * r * 0.9;
    const rr = r * (0.55 + R() * 0.12);
    balls.push({ p: add(c, [Math.cos(a) * rr, Math.sin(a) * rr, z]), r: r * (0.36 + R() * 0.12) });
  }
  balls.push({ p: c, r: r * 0.42 });
  balls.forEach((b, i) => B.ball(`${id}.${i}`, b.p, b.r, { mat: "stone", tone: "hi", lit: o.lit, cls: o.cls, sys: o.sys, layer: o.layer, bias: o.bias, hidden: o.hidden }));
  if (o.net !== false) {
    const lines = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI + (o.spin || 0);
      const pts = Array.from({ length: 17 }, (_, j) => {
        const t = (j / 16) * TAU;
        return add(c, [Math.cos(a) * Math.cos(t) * r * 1.02, Math.sin(a) * Math.cos(t) * r * 1.02, Math.sin(t) * r * 0.95]);
      }).filter((p) => dot(sub(p, c), B.V) > -r * 0.1);
      if (pts.length > 1) lines.push(k.pathOf(pts.map(B.at)));
    }
    B.marks(`${id}.net`, B.L(lines.join(""), { tone: "mid" }), [c], { r: r * 1.05, layer: o.layer, bias: (o.bias || 0) + r * 1.2, hidden: o.hidden });
  }
}

// A coopered barrel with iron hoops (rubble or pitch inside).
export function barrel(B, id, c, r, o = {}) {
  const axis = unit(o.axis || [0, 0, 1]);
  const h = r * 2.3;
  const F = G.frameAlong(add(c, mul(axis, -h / 2)), axis);
  const prof = [[0, r * 0.8], [h * 0.25, r * 0.96, 1], [h * 0.5, r, 1], [h * 0.75, r * 0.96, 1], [h, r * 0.8]];
  const hoops = [0.08, 0.22, 0.78, 0.92].map((f) => G.arcOf(F, h * f, profileR(prof, h * f) + 0.05, B.P)).join("");
  const staves = k.fadedSvg(G.ribsOf(F, 0, h, r * 0.98, 14, B.P, { fade: [0.15, 0.6], phase: o.spin || 0 }), { tone: "faint" });
  B.turned(id, F, prof, { mat: "oak", tone: "hi", inner: staves + B.L(hoops, { tone: "hi" }), lit: o.lit, cls: o.cls, sys: o.sys, layer: o.layer, bias: o.bias, hidden: o.hidden });
}

// A bolt or arrow: shaft, iron head, three vanes; `fire` adds a tow bundle behind the head.
export function bolt(B, id, tail, dir, length, r, o = {}) {
  const d = unit(dir);
  const F = G.frameAlong(tail, d);
  const headLen = length * (o.head ?? 0.13);
  const shaftEnd = length - headLen;
  const vis = { lit: o.lit, cls: o.cls, sys: o.sys, layer: o.layer, hidden: o.hidden };
  const bias = o.bias || 0;
  B.cyl(`${id}.shaft`, tail, add(tail, mul(d, shaftEnd)), r, { mat: "oak", tone: "hi", bias, ...vis, steps: 16, seams: o.fire ? [] : [length * 0.3] });
  const hp = o.heavy ? [[0, r * 1.25], [headLen * 0.35, r * 1.25], [headLen * 0.55, r * 1.05, 1], [headLen, 0.01]] : [[0, r * 1.05], [headLen * 0.3, r * 1.05], [headLen * 0.4, r * 1.6], [headLen, 0.01]];
  B.turned(`${id}.head`, G.frameAlong(add(tail, mul(d, shaftEnd)), d), hp, { mat: "iron", tone: "hi", bias: bias + 0.1, ...vis });
  if (o.fire) {
    const s0 = shaftEnd - length * 0.2;
    B.turned(`${id}.tow`, G.frameAlong(add(tail, mul(d, s0)), d), [[0, r * 1.1], [length * 0.03, r * 2.4, 1], [length * 0.1, r * 2.7, 1], [length * 0.17, r * 2.2, 1], [length * 0.19, r * 1.1]], { mat: o.burnt ? "pitch" : "rope", tone: "hi", bias: bias + 0.05, ...vis, inner: k.fadedSvg(G.ribsOf(F, s0 + length * 0.03, s0 + length * 0.1, r * 2.4, 10, B.P, { twist: 0.9, r1: r * 2.7, fade: [0.1, 0.55], seams: true }), { tone: "lo" }) });
  }
  const vaneLen = length * 0.2;
  const vaneH = r * (o.vane ?? 3.2);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + (o.roll || 0);
    const radial = G.radialOf(F, a);
    const side = cross(d, radial);
    const VF = { o: add(tail, mul(d, length * 0.03)), a: d, u: side, v: radial };
    const poly = [[-0.12, r * 0.6], [0.12, r * 0.6], [0.12, vaneH], [-0.12, vaneH * 0.7]];
    const paths = (B.G || G).prismOf(VF, poly, 0, vaneLen, B.P);
    const pts = [];
    for (const [x, y] of poly) for (const s of [0, vaneLen]) pts.push(framePoint(VF, s, x, y));
    B.solid(`${id}.vane${i}`, paths, shapeOf(pts, { axes: [d, side, radial], edges: [d, side, radial] }), { mat: o.vaneMat || "hide", tone: "hi", crease: "none", bias: bias + 0.05, ...vis });
  }
}

// Long-axis description for each ammo look; machines call draw(look, ...).
export function draw(look, B, id, c, size, o = {}) {
  if (look === "stone" || look === "granite" || look === "lead" || look === "iron") return stone(B, id, c, size, { ...o, mat: look === "stone" ? "stone" : look === "lead" ? "lead" : look === "iron" ? "iron" : "granite" });
  if (look === "pot") return pot(B, id, c, size, o);
  if (look === "cluster") return cluster(B, id, c, size, o);
  if (look === "barrel") return barrel(B, id, c, size, o);
}

// A small static icon for the ammunition picker: draws with a throwaway projection.
export function icon(drawFn, extent, { width = 64, height = 48, azimuth = 30, elevation = 26 } = {}) {
  const pts = [];
  for (const x of [-extent[0], extent[0]]) for (const y of [-extent[1], extent[1]]) for (const z of [-extent[2], extent[2]]) pts.push([x, y, z]);
  const P = k.fitProjection(pts, width, height, { pad: 4, azimuth, elevation });
  const items = [];
  const V = G.viewOf(P);
  const collector = { P, V, KS: G.scaleOf(P), add: (p) => items.push(p), put: (p) => items.push(p) };
  return { P, collector, finish: () => `<svg class="iso-svg" viewBox="0 0 ${width} ${height}" aria-hidden="true">${items.sort((a, b) => (a.key ?? dot(a.shape.c, V) + (a.bias || 0)) - (b.key ?? dot(b.shape.c, V) + (b.bias || 0))).map((p) => `<g${p.mat ? ` data-mat="${p.mat}"` : ""}>${p.svg}</g>`).join("")}</svg>` };
}

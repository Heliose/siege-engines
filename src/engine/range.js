// The range: a long isometric strip in metres. The machine sits at y = 0 and shoots down
// −y. An overview shows a miniature of the machine, the target at its true distance and
// every trajectory in true scale; an inset magnifies the target so each hit's damage,
// dust, debris and fire can be read. Both views share one set of events.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { createScene, shapeOf } from "./scene.js";
import { createBuilder, frameFrom } from "./geo.js";
import { createFx } from "./fx.js";
import * as looks from "./looks.js";
import { add, sub, mul, dot, unit, len, rng, clamp, smoothstep, TAU } from "./vec.js";
import * as SFX from "./sfx.js";

const viewHtml = (cls) => `<div class="rg-view ${cls}"><svg class="iso-svg rg-floor"><g class="world"></g></svg><canvas class="rg-gl rg-back"></canvas><svg class="iso-svg rg-main"><g class="world"></g></svg><canvas class="rg-gl rg-front"></canvas></div>`;

export function createRange(host) {
  host.innerHTML = `<div class="rg-stage"><div class="rg-left">${viewHtml("rg-over")}<div class="rg-scale"></div></div><div class="rg-inset">${viewHtml("rg-zoom")}<svg class="rg-loupe" viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10 L14 14"/></svg></div></div>`;
  const stage = host.querySelector(".rg-stage");
  const scaleEl = stage.querySelector(".rg-scale");
  const makeView = (el) => ({ el, floor: el.querySelector(".rg-floor .world"), main: el.querySelector(".rg-main .world"), svgs: [...el.querySelectorAll("svg")], back: el.querySelector(".rg-back"), front: el.querySelector(".rg-front") });
  const over = makeView(stage.querySelector(".rg-over"));
  const zoom = makeView(stage.querySelector(".rg-zoom"));
  const views = [over, zoom];
  let spec = null;
  let target = null;
  let shots = [];
  let active = null;
  let damage = [];
  let fires = [];
  let stuck = [];
  let marks = [];
  let lastT = 0;
  let mounted = false;

  function setupView(view, W, H, P) {
    view.W = W;
    view.H = H;
    view.P = P;
    view.svgs.forEach((s) => s.setAttribute("viewBox", `0 0 ${W} ${H}`));
    view.floor.innerHTML = "";
    view.main.innerHTML = "";
    view.scene = createScene((layer) => (layer < 0 ? view.floor : view.main), P);
    view.B = createBuilder(view.scene, { unit: 1 });
    view.fx = createFx({ back: view.back, front: view.front, view: [W, H], P, unit: 1, ground: 0 });
  }

  function mount(def, M) {
    spec = def.target || { kind: "wall", distance: 150 };
    const reach = spec.maxRange || Math.max(spec.distance * 1.6, 120);
    const D = spec.distance;
    // Overview: the whole range.
    const strip = { x: -18, y: -(reach + 22), w: 36, d: reach + 36, r: 2 };
    const apex = spec.apex ?? reach * 0.3;
    const pts = [...k.boxCorners(strip, -3, 0), [0, 6, apex], [0, -reach * 0.45, apex]];
    const unitP = { origin: [0, 0], scale: 1, azimuth: 22, elevation: 24 };
    const flat = pts.map((p) => k.iso(p, unitP));
    const bw = Math.max(...flat.map((f) => f[0])) - Math.min(...flat.map((f) => f[0]));
    const bh = Math.max(...flat.map((f) => f[1])) - Math.min(...flat.map((f) => f[1]));
    const W = 1000;
    const H = Math.round(clamp((W - 36) * (bh / bw) + 36, 200, 400));
    setupView(over, W, H, k.fitProjection(pts, W, H, { pad: 18, azimuth: 22, elevation: 24 }));
    // Inset: the target, magnified.
    const hz = (spec.height || 9) + 6;
    const zpts = spec.kind === "palisade" ? [[-12, -D + 10, 0], [12, -D + 10, 0], [-12, -D - 6, 0], [12, -D - 6, 0], [0, -D, (spec.height || 3.2) + 2.5]] : [[-17, -D + 13, 0], [22, -D + 13, 0], [-17, -D - 11, 0], [22, -D - 11, 0], [-15, -D, hz + 1], [20, -D - 6, hz + 2]];
    setupView(zoom, 440, 250, k.fitProjection(zpts, 440, 250, { pad: 10, azimuth: 34, elevation: 21 }));

    const B = over.B;
    B.slab("ground", strip, -3, 3, { tone: "mid", mat: "stone", layer: -2, steps: 4, bevel: 0.4, groove: 1.4 });
    const ruler = { x: strip.x + strip.w - 4.2, y: strip.y + 6, w: 2.4, d: strip.d - 12, r: 0.3 };
    const ticks = k.topTicks(-reach - 10, 0, 10, 5, ruler.x + 0.2, 0.15, [0.9, 1.8], over.P, "y");
    B.marks("ruler", B.S(k.slabOf(ruler, 0, 0.15, over.P, 2), { tone: "lo", crease: "none" }) + B.L(ticks.minor, { tone: "lo" }) + B.L(ticks.major, { tone: "mid" }), [[ruler.x, ruler.y, 0], [ruler.x + ruler.w, ruler.y + ruler.d, 0.15]], { layer: -1 });
    for (let d = 50; d <= reach; d += 50) {
      B.cyl(`stake${d}`, [strip.x + 2.4, -d, 0], [strip.x + 2.4, -d, 2.2], 0.22, { mat: "wood", tone: "mid" });
      B.prism(`flag${d}`, frameFrom([strip.x + 2.4, -d, 1.5], [strip.x + 2.4, -d, 2.2], [1, 0, 0]), [[-0.05, 0], [0.05, 0], [0.05, 1.3], [-0.05, 0.9]], 0, 0.7, { mat: "hide", tone: "mid", crease: "none" });
    }
    // The machine in miniature, at rest.
    if (def.build && def.unit) {
      const miniP = { ...over.P, scale: over.P.scale * def.unit };
      const miniScene = createScene(() => over.main, miniP);
      const MB = createBuilder(miniScene, { unit: def.unit });
      MB.plinth = () => {};
      MB.mini = true;
      try {
        const MM = { ...M, mini: true, B: MB, fx: { emit() {}, spawn() {} }, sfx: () => {} };
        def.build(MB, MM);
        if (def.draw) {
          MB.dynamic = false;
          def.draw(MB, MM);
        }
      } catch (error) {
        console.warn("mini", error);
      }
      miniScene.seal();
      miniScene.paint(true);
    }
    // Inset ground: a patch of field with a ditch line and scattered stones.
    const ZB = zoom.B;
    const pal = spec.kind === "palisade";
    ZB.slab("ground", pal ? { x: -15, y: -D - 9, w: 30, d: 22, r: 1 } : { x: -24, y: -D - 20, w: 48, d: 42, r: 1 }, -2, 2, { tone: "mid", mat: "stone", layer: -2, steps: 3, groove: 0.8 });
    const R = rng(21);
    for (let i = 0; i < 16; i++) {
      const x = pal ? -13 + R() * 26 : -20 + R() * 40;
      const y = -D + 3 + R() * (pal ? 8 : 15);
      const r = 0.12 + R() * 0.25;
      ZB.slab(`pebble${i}`, { x: x - r, y: y - r * 0.8, w: 2 * r, d: 1.6 * r, r: r * 0.5 }, 0, r * 0.7, { tone: "mid", mat: "granite", steps: 2 });
    }
    for (const view of views) {
      target = buildTarget(spec, view);
      view.scene.seal();
      view.scene.paint(true);
      view.fx.setOccluders(target.boxes);
    }
    shots = [];
    active = null;
    damage = [];
    fires = [];
    stuck = [];
    marks = [];
    mounted = true;
    scaleEl.innerHTML = Array.from({ length: Math.floor(reach / 50) + 1 }, (_, i) => {
      const [x] = k.iso([strip.x + strip.w, -i * 50, 0], over.P);
      return `<span style="left:${((x / W) * 100).toFixed(2)}%">${i * 50}${i === Math.floor(reach / 50) ? " m" : ""}</span>`;
    }).join("");
  }

  // Targets in metres. Each returns its hit test and occluder boxes.
  function buildTarget(spec, view) {
    const D = spec.distance;
    if (spec.kind === "palisade") return palisade(D, spec, view);
    return wall(D, spec, view);
  }

  function wall(D, spec, view) {
    const B = view.B;
    const P = view.P;
    const Hh = spec.height || 9;
    const T = spec.thick || 2.6;
    const Wd = 30;
    const y0 = -D - T;
    const plan = { x: -Wd / 2, y: y0, w: Wd, d: T, r: 0.2 };
    const courses = [];
    for (let z = 0.7; z < Hh; z += 0.7) courses.push(z);
    const faceY = -D;
    const joints = [];
    courses.forEach((z, i) => {
      for (let x = -Wd / 2 + ((i % 2) * 0.8 + 0.6); x < Wd / 2; x += 1.6) joints.push(k.pathOf([B.at([x, faceY, z - 0.7]), B.at([x, faceY, z])]));
    });
    const seams = courses.map((z) => k.sideSeam(plan, z, P, 2)).join("");
    B.slab("wall", plan, 0, Hh, { tone: "hi", mat: "stone", steps: 2, inner: B.L(seams, { tone: "faint" }) + B.L(joints.join(""), { tone: "faint" }) });
    for (let i = 0; i < 11; i++) {
      const x = -Wd / 2 + 0.4 + (i * (Wd - 0.8)) / 10.5;
      B.slab(`merlon${i}`, { x, y: y0 + 0.2, w: 1.5, d: T - 0.4, r: 0.1 }, Hh, 1.5, { tone: "hi", mat: "stone", steps: 2 });
    }
    const tower = { x: Wd / 2 - 1, y: y0 - 2.5, w: 7, d: T + 5, r: 0.3 };
    B.slab("tower", tower, 0, Hh + 4, { tone: "hi", mat: "stone", steps: 2, inner: B.L([3, 6, 9, 12].map((z) => k.sideSeam(tower, z, P, 2)).join(""), { tone: "faint" }) });
    for (let i = 0; i < 3; i++) B.slab(`tmerlon${i}`, { x: tower.x + 0.3 + i * 2.35, y: tower.y + tower.d - 1.2, w: 1.5, d: 1, r: 0.1 }, Hh + 4, 1.3, { tone: "hi", mat: "stone", steps: 2 });
    for (let i = 0; i < 2; i++) B.slab(`slit${i}`, { x: tower.x + 2 + i * 3, y: tower.y + tower.d - 0.05, w: 0.35, d: 0.1, r: 0.05 }, 4 + i * 4, 1.6, { tone: "lo", mat: "pitch", steps: 1, crease: "none" });
    if (spec.hoarding !== false) {
      B.slab("hoard", { x: -Wd / 2 + 1, y: y0 - 0.3, w: Wd - 3, d: T + 1.4, r: 0.1 }, Hh + 1.5, 2.2, { tone: "hi", mat: "oak", steps: 2, seams: [Hh + 2.6] });
      B.prism("hoardroof", frameFrom([-Wd / 2 + 1, y0 + T / 2, Hh + 3.7], [Wd / 2 - 2, y0 + T / 2, Hh + 3.7], [0, 0, 1]), [[-(T + 1.6) / 2, 0], [(T + 1.6) / 2, 0], [0, 1.6]], 0, Wd - 3, { tone: "hi", mat: "oak" });
      for (let i = 0; i < 9; i++) B.beam(`hoardpost${i}`, [-Wd / 2 + 2 + i * 3.2, -D + 1.15, Hh], [-Wd / 2 + 2 + i * 3.2, -D + 1.15, Hh + 1.5], { w: 0.22, h: 0.22, mat: "oak", tone: "mid" });
    }
    B.halo("wallhalo", [[-Wd / 2, y0], [Wd / 2 + 6, y0 - 2.5], [Wd / 2 + 6, -D + 2.5], [-Wd / 2, -D + 1.5]], 0, { layer: -1 });
    const boxes = [{ min: [-Wd / 2, y0, 0], max: [Wd / 2, -D, Hh + 1.5] }, { min: [tower.x, tower.y, 0], max: [tower.x + tower.w, tower.y + tower.d, Hh + 5.3] }];
    return {
      kind: "wall",
      face: -D,
      boxes,
      hit(p, prev) {
        if (prev[1] > -D && p[1] <= -D && Math.abs(p[0]) < Wd / 2) {
          const u = (prev[1] + D) / (prev[1] - p[1]);
          const z = prev[2] + (p[2] - prev[2]) * u;
          if (z >= 0 && z <= Hh + 1.5) return { kind: "wall", u, z, material: z > Hh ? "wood" : "stone" };
          if (z > Hh + 1.5 && z <= Hh + 3.7 && spec.hoarding !== false) return { kind: "wall", u, z, material: "wood" };
        }
        return null;
      },
    };
  }

  function palisade(D, spec, view) {
    const B = view.B;
    const Hh = spec.height || 3.2;
    const Wd = 20;
    const R = rng(11);
    let i = 0;
    for (let x = -Wd / 2; x < Wd / 2; x += 0.42, i++) {
      const h = Hh + (R() - 0.5) * 0.4;
      B.cyl(`log${i}`, [x, -D, 0], [x, -D, h], 0.2, { mat: "oak", tone: "hi", steps: 10 });
      B.turned(`tip${i}`, G.frameAlong([x, -D, h], [0, 0, 1]), [[0, 0.2], [0.45, 0.01]], { mat: "oak", tone: "hi" });
    }
    for (const z of [0.8, Hh - 0.6]) B.beam(`rail${z}`, [-Wd / 2, -D - 0.32, z], [Wd / 2, -D - 0.32, z], { w: 0.18, h: 0.25, mat: "oak", tone: "mid" });
    for (let j = 0; j < 5; j++) {
      const x = -Wd / 2 + 2 + j * 4;
      const F = { o: [x, -D + 0.6, 0.15], a: unit([0, 1, 0.12]), u: [1, 0, 0], v: unit([0, -0.12, 1]) };
      B.prism(`pavise${j}`, F, [[-0.65, 0], [0.65, 0], [0.65, 1.55], [0.4, 1.75], [-0.4, 1.75], [-0.65, 1.55]], 0, 0.12, { mat: "hide", tone: "hi" });
      B.beam(`prop${j}`, [x, -D + 0.45, 1.3], [x, -D - 0.5, 0], { w: 0.08, h: 0.08, mat: "oak", tone: "mid" });
    }
    B.halo("palhalo", [[-Wd / 2, -D - 0.6], [Wd / 2, -D - 0.6], [Wd / 2, -D + 1.2], [-Wd / 2, -D + 1.2]], 0, { layer: -1 });
    const boxes = [{ min: [-Wd / 2, -D - 0.4, 0], max: [Wd / 2, -D + 0.3, Hh + 0.4] }];
    return {
      kind: "palisade",
      face: -D + 0.7,
      boxes,
      hit(p, prev) {
        const face = -D + 0.75;
        if (prev[1] > face && p[1] <= face && Math.abs(p[0]) < Wd / 2) {
          const u = (prev[1] - face) / (prev[1] - p[1]);
          const z = prev[2] + (p[2] - prev[2]) * u;
          if (z >= 0 && z <= 1.9) return { kind: "pavise", u, z, material: "wood" };
        }
        if (prev[1] > -D + 0.2 && p[1] <= -D + 0.2 && Math.abs(p[0]) < Wd / 2) {
          const u = (prev[1] + D - 0.2) / (prev[1] - p[1]);
          const z = prev[2] + (p[2] - prev[2]) * u;
          if (z >= 0 && z <= Hh) return { kind: "palisade", u, z, material: "wood" };
        }
        return null;
      },
    };
  }

  const emit = (kind, p, o) => views.forEach((view) => view.fx.emit(kind, p, o));

  // A shot: { flight (physics.flight result, metres, machine origin), ammo, t0 (shot time of release) }.
  function launch(shot) {
    active = { ...shot, done: false };
    shots.push(active);
    if (shots.length > 6) shots.shift();
  }

  function impactAt(shot) {
    const imp = shot.flight.impact;
    const p = imp.p;
    const v = imp.v;
    const speed = Math.hypot(...v);
    const ammo = shot.ammo;
    const energy = 0.5 * ammo.mass * speed * speed;
    const scale = clamp(Math.cbrt(energy / 20000), 0.25, 3);
    const what = imp.what || { kind: "ground" };
    const dir = unit(v);
    const loud = clamp(Math.log10(energy + 10) / 5, 0.25, 1);
    if (ammo.fire) SFX.play("whump", { gain: loud });
    if (/bolt|arrow/.test(ammo.look)) SFX.play(what.material === "wood" ? "thunk" : "thud", { gain: loud, pitch: 1.4 });
    else if (what.kind === "wall") SFX.play("crack", { gain: loud });
    else SFX.play("boom", { gain: loud * 0.8, size: 0.6 + loud * 0.6 });
    if (/bolt|arrow/.test(ammo.look)) {
      stuck.push({ p, dir, len: ammo.length || 1.2, fire: ammo.fire, at: lastT });
      emit(what.material === "wood" ? "splinter" : "dust", p, { n: what.material === "wood" ? 10 : 8, v: [0, 2, 1.5], spread: 2.5, size: 0.35, grow: 0.7, life: 0.9, grav: what.material === "wood" ? 1 : 0.1, drag: 2 });
      if (what.material !== "wood") emit("dust", p, { n: 6, v: [0, 1, 1], spread: 1, size: 0.4, grow: 1.6, life: 1.4, drag: 2, buoy: 0.2 });
      if (ammo.fire) fires.push({ p, until: lastT + 9, power: 0.5 });
      return;
    }
    if (what.kind === "wall") {
      damage.push({ p, r: 0.5 + scale * 0.7, seed: damage.length + 1 });
      emit("dust", p, { n: Math.round(18 * scale), v: [0, 4, 2], spread: 4 * scale, size: 1.5 * scale, grow: 5 * scale, life: 3.2, drag: 1.4, buoy: 0.6 });
      emit("debris", p, { n: Math.round(16 * scale), v: [0, 6, 3], spread: 5, size: 0.35 + scale * 0.2, life: 2.6, grav: 1, drag: 0.15, bounce: 0.3 });
      emit("spark", p, { n: Math.round(6 * scale), v: [0, 5, 3], spread: 6, size: 0.12, life: 0.5, heat: 0.8, grav: 0.5, drag: 0.5 });
      for (let i = 0; i < Math.round(3 + scale * 3); i++) marks.push({ p: [p[0] + (Math.random() - 0.5) * 5, p[1] + 1 + Math.random() * 4, 0], r: 0.25 + Math.random() * 0.45, rubble: true });
    } else {
      emit("dust", p, { n: Math.round(14 * scale), v: [dir[0] * 3, dir[1] * 3, 3], spread: 3 * scale, size: 1.2 * scale, grow: 4.5 * scale, life: 2.6, drag: 1.5, buoy: 0.4 });
      emit("debris", p, { n: Math.round(8 * scale), v: [dir[0] * 4, dir[1] * 4, 4], spread: 3, size: 0.3, life: 1.6, grav: 1, drag: 0.2, bounce: 0.25 });
      marks.push({ p, r: 0.6 + scale * 0.8, crater: true });
    }
    if (ammo.fire) {
      fires.push({ p: [p[0], p[1] + (what.kind === "wall" ? 0.4 : 0), p[2]], until: lastT + 14, power: 1.2 });
      emit("fire", p, { n: 30, v: [0, 0, 6], spread: 4, size: 1.6, grow: 0.6, life: 0.9, heat: 1, buoy: 3, drag: 1.2 });
      emit("spark", p, { n: 24, v: [0, 3, 6], spread: 7, size: 0.18, life: 1.2, heat: 0.95, grav: 0.6, drag: 0.4 });
    }
    if (ammo.look === "cluster") {
      for (let i = 0; i < 6; i++) marks.push({ p: [p[0] + (Math.random() - 0.5) * 6, p[1] + (Math.random() - 0.5) * 6, 0], r: 0.35, crater: true });
      emit("debris", p, { n: 14, v: [dir[0] * 6, dir[1] * 6, 5], spread: 6, size: 0.3, life: 2, grav: 1, drag: 0.2, bounce: 0.35 });
    }
  }

  function drawView(view, index, shotT, dt) {
    const { B, scene, P } = view;
    const zoomView = view === zoom;
    scene.frame();
    B.dynamic = true;
    const near = (q) => !zoomView || (Math.abs(q[1] + spec.distance) < 24 && Math.abs(q[0]) < 26 && q[2] < 40);
    shots.forEach((shot, i) => {
      const fl = shot.flight;
      const local = shotT === null || shot !== active ? Infinity : shotT - shot.t0;
      const live = shot === active && local < fl.impact.t;
      const end = live ? Math.max(0, local) : fl.impact.t;
      const pts = [];
      for (let j = 0; j < fl.track.ts.length; j += zoomView ? 1 : 2) {
        if (fl.track.ts[j] > end) break;
        const q = fl.track.frames[j].p;
        if (near(q)) pts.push(q);
      }
      const tip = fl.track.at(end).p;
      if (near(tip)) pts.push(tip);
      if (pts.length > 1) {
        const d = k.pathOf(pts.map((q) => B.at(q)));
        const recent = shot === active;
        B.marks(`trail${i}`, `<path class="iso-line rg-trail${recent ? " rg-now" : ""}" data-tone="${recent ? "lit" : "lo"}"${recent ? "" : ' data-dotted=""'} d="${d}"/>`, pts.filter((_, j) => j % 6 === 0).concat([tip]), { r: 0.1, layer: 2 });
      }
      if (live && local >= 0 && near(tip)) {
        const r = Math.max(shot.ammo.radius || 0.15, zoomView ? 0.12 : 0.35);
        const bolt = /bolt|arrow/.test(shot.ammo.look);
        B.halo("shadow", [[tip[0] - r * 1.6, tip[1] - r], [tip[0] + r * 1.6, tip[1] - r], [tip[0] + r * 1.6, tip[1] + r], [tip[0] - r * 1.6, tip[1] + r]], 0.02, { blur: 2 });
        if (bolt && zoomView) {
          const vv = fl.track.at(end).v;
          const dd = unit(vv);
          looks.bolt(B, "proj", sub(tip, mul(dd, (shot.ammo.length || 0.7) * 0.9)), dd, shot.ammo.length || 0.7, Math.max(0.03, shot.ammo.shaft || 0.012), { fire: shot.ammo.fire, layer: 3 });
        } else B.ball("proj", tip, zoomView ? Math.max(r, 0.18) : Math.max(r * 1.4, 0.9), { mat: shot.ammo.look === "pot" ? "clay" : bolt ? "iron" : shot.ammo.look === "lead" ? "lead" : "granite", tone: "hi", layer: 3 });
        if (shot.ammo.fire && Math.random() < dt * 60) view.fx.emit("fire", tip, { n: 2, v: [0, 0, 1], spread: 1, size: zoomView ? 0.7 : 1.1, grow: 0.4, life: 0.35, heat: 1, buoy: 2 });
        if (shot.ammo.fire && Math.random() < dt * 30) view.fx.emit("smoke", tip, { n: 1, v: [0, 0, 0.6], spread: 0.4, size: 0.9, grow: 3, life: 1.8, alpha: 0.5, drag: 1, buoy: 0.5 });
      }
      if (shot.done || shot !== active) {
        const ip = fl.impact.p;
        if (near(ip)) B.marks(`fall${i}`, B.L(G.circleOf(G.frameAlong([ip[0], ip[1], 0.02], [0, 0, 1]), 0, zoomView ? 0.5 : 0.8, P, 16), { tone: shot === active ? "hi" : "lo" }), [[ip[0], ip[1], 0]], { r: 0.8, layer: -1 });
      }
    });
    damage.forEach((dm, i) => {
      const R = rng(dm.seed * 13);
      const pts = Array.from({ length: 9 }, (_, j) => {
        const a = (j / 9) * TAU;
        const rr = dm.r * (0.7 + R() * 0.5);
        return [dm.p[0] + Math.cos(a) * rr, target.face + 0.02, clamp(dm.p[2] + Math.sin(a) * rr * 0.8, 0.05, 30)];
      });
      const d = k.pathOf(pts.map(B.at), true);
      const cracks = [];
      for (let j = 0; j < 6; j++) {
        const a = R() * TAU;
        const r1 = dm.r * (1.6 + R() * 1.5);
        cracks.push(k.pathOf([B.at([dm.p[0] + Math.cos(a) * dm.r * 0.9, target.face + 0.02, dm.p[2] + Math.sin(a) * dm.r * 0.7]), B.at([dm.p[0] + Math.cos(a + 0.3) * r1 * 0.6, target.face + 0.02, dm.p[2] + Math.sin(a + 0.2) * r1 * 0.5]), B.at([dm.p[0] + Math.cos(a) * r1, target.face + 0.02, dm.p[2] + Math.sin(a) * r1 * 0.75])]));
      }
      B.marks(`dmg${i}`, `<path class="rg-hole" d="${d}"/>` + B.L(cracks.join(""), { tone: "mid" }), [[dm.p[0], target.face, dm.p[2]]], { r: dm.r, layer: 1 });
    });
    marks.forEach((m, i) => {
      if (!near(m.p)) return;
      if (m.rubble) B.slab(`rub${i}`, { x: m.p[0] - m.r, y: m.p[1] - m.r * 0.7, w: m.r * 2, d: m.r * 1.4, r: m.r * 0.3 }, 0, m.r * 0.9, { mat: "stone", tone: "mid", steps: 2 });
      else if (m.crater) B.marks(`crater${i}`, `<path class="rg-crater" d="${k.pathOf(G.hullOf(Array.from({ length: 10 }, (_, j) => B.at([m.p[0] + Math.cos((j / 10) * TAU) * m.r * 1.4, m.p[1] + Math.sin((j / 10) * TAU) * m.r, 0.01]))), true)}"/>`, [[m.p[0], m.p[1], 0]], { r: m.r, layer: -1 });
    });
    stuck.forEach((s, i) => {
      if (!near(s.p)) return;
      const tail = sub(s.p, mul(s.dir, s.len * 0.8));
      if (zoomView) looks.bolt(B, `stuck${i}`, sub(s.p, mul(s.dir, s.len)), s.dir, s.len, 0.03, { fire: s.fire, burnt: true });
      else B.cord(`stuck${i}`, [tail, s.p], { tone: "hi", width: 1.1 });
    });
    scene.commit();
    scene.paint();
  }

  function update(dt, shotT, light, time) {
    if (!mounted) return;
    lastT = time;
    if (active && !active.done && shotT !== null && shotT - active.t0 >= active.flight.impact.t) {
      active.done = true;
      impactAt(active);
    }
    fires = fires.filter((f) => f.until > time);
    for (const f of fires) {
      const life = clamp((f.until - time) / 6, 0, 1);
      if (Math.random() < dt * 40 * f.power * life) emit("fire", [f.p[0] + (Math.random() - 0.5) * 1.2, f.p[1] + (Math.random() - 0.5) * 0.8, f.p[2] + 0.2], { v: [0, 0, 2.5], spread: 0.6, size: 1.1 * f.power, grow: 0.3, life: 0.8, heat: 0.95, buoy: 2.5, drag: 1.4 });
      if (Math.random() < dt * 14 * f.power) emit("soot", [f.p[0], f.p[1], f.p[2] + 1.5], { v: [0.6, 0, 1.6], spread: 0.4, size: 1.4, grow: 5, life: 4, alpha: 0.55, buoy: 0.5, drag: 0.8 });
      if (Math.random() < dt * 8 * f.power) emit("ember", [f.p[0], f.p[1], f.p[2] + 0.6], { v: [0.3, 0, 2], spread: 1.2, size: 0.12, life: 1.6, heat: 0.9, buoy: 1.2, drag: 0.6 });
    }
    views.forEach((view, i) => {
      drawView(view, i, shotT, dt);
      view.fx.update(dt);
      view.fx.render(light, time);
    });
  }

  return {
    mount,
    launch,
    update,
    // Particles in metres, into both range views (overview and magnified target).
    emit: (kind, p, o) => mounted && emit(kind, p, o),
    hit: (p, prev) => (target ? target.hit(p, prev) : null),
    reset() {
      shots = [];
      active = null;
      damage = [];
      fires = [];
      stuck = [];
      marks = [];
      views.forEach((v) => v.fx && v.fx.clear());
    },
    get spec() {
      return spec;
    },
    stage,
  };
}

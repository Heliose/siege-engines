// The application: index of engines, the stage, the range and the control deck.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import { createScene } from "./scene.js";
import { createBuilder } from "./geo.js";
import { createFx } from "./fx.js";
import { createRange } from "./range.js";
import * as looks from "./looks.js";
import * as PH from "./physics.js";
import * as SFX from "./sfx.js";
import * as GL from "../../vendor/anatomy/kit/gl.mjs";
import { $, $$, h, esc, formatValue, rulerTicks } from "./ui.js";
import { add, sub, mul, unit, len, clamp, fmt, fmtInt, smoothstep } from "./vec.js";

const SPEEDS = [
  [1, "1×"],
  [0.5, "½"],
  [0.25, "¼"],
  [0.1, "⅒"],
  [0.04, "1⁄25"],
];

export function start(MACHINES) {
  const root = document.getElementById("app");
  const body = document.body;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  root.innerHTML = `
<header class="hd">
  <div class="hd-brand"><svg viewBox="0 0 24 16" aria-hidden="true"><path d="M2 14 L12 2 L22 14 Z M12 2 L12 14 M7 8 L17 8"/></svg><span>Siege Engines</span></div>
  <nav class="hd-index" aria-label="Engines"></nav>
  <div class="hd-tools"><button class="chip" data-tool="index" title="All engines (G)"><span class="dot"></span>Index</button><button class="chip" data-tool="sound" data-on="1" title="Sound (M)"><span class="dot"></span>Sound</button><button class="chip" data-tool="theme" title="Theme (T)"><span class="dot"></span>Theme</button></div>
</header>
<section class="gallery" hidden><div class="gl-grid"></div></section>
<main class="grid">
  <section class="plate pl-stage">
    <div class="corners" aria-hidden="true"><span class="c-fig"></span><span class="c-title"></span><span class="c-hint"></span><span class="c-read" data-readout></span></div>
    <div class="st-stage" tabindex="0" role="group">
      <svg class="iso-svg st-floor"><g class="world"></g></svg>
      <canvas class="st-gl st-sea"></canvas>
      <canvas class="st-gl st-back"></canvas>
      <svg class="iso-svg st-main"><g class="world"></g></svg>
      <canvas class="st-gl st-front"></canvas>
    </div>
    <div class="st-zoom"><button class="chip sq" data-zoom="in" title="Zoom in">+</button><button class="chip sq" data-zoom="out" title="Zoom out">−</button><button class="chip sq" data-zoom="fit" title="Fit (0)">⤢</button><button class="chip sq" data-zoom="full" title="Full window (F11-like, Z)">⛶</button></div>
    <div class="sr" aria-live="polite"></div>
  </section>
  <section class="plate pl-range">
    <div class="corners" aria-hidden="true"><span class="c-fig">Range</span><span class="c-title r-title"></span><span class="c-hint r-hint"></span><span class="c-read r-read"></span></div>
    <div class="rg-host"></div>
  </section>
  <aside class="deck">
    <section class="dk"><h3>Ammunition</h3><div class="dk-ammo"></div></section>
    <section class="dk"><h3>Setup</h3><div class="dk-ctrls"></div></section>
    <section class="dk"><h3>Action</h3><div class="dk-acts"></div><ol class="dk-phase"></ol></section>
    <section class="dk"><h3>Time</h3>
      <div class="tl"><div class="tl-track"><div class="tl-marks"></div><div class="tl-fill"></div><div class="tl-head"></div></div><span class="tl-time">0.00 s</span></div>
      <div class="dk-speed"></div>
    </section>
    <section class="dk"><h3>View</h3><div class="dk-focus"></div><div class="dk-toggles"></div></section>
    <section class="dk"><h3>Readout</h3><dl class="dk-read"></dl></section>
  </aside>
</main>`;

  const stage = $(root, ".st-stage");
  const floorRoot = $(stage, ".st-floor .world");
  const mainRoot = $(stage, ".st-main .world");
  const svgs = $$(stage, "svg");
  const range = createRange($(root, ".rg-host"));
  const nav = $(root, ".hd-index");
  let M = null;
  let speed = 1;
  let paused = false;
  let clock = 0;
  let last = 0;
  let idleAt = 0;
  let readAt = 0;
  let zoom = { s: 1, tx: 0, ty: 0 };
  let zoomTarget = { s: 1, tx: 0, ty: 0 };
  let scrubbing = false;
  const light = () => (body.dataset.theme === "dark" ? 0 : 1);

  MACHINES.forEach((def, i) => {
    nav.appendChild(h("button", { class: "ix", "data-i": i, title: def.name, onclick: () => mount(i) }, `<b>${String(i + 1).padStart(2, "0")}</b><span>${esc(def.short || def.name)}</span>`));
  });

  // ---------------- mounting a machine ----------------
  function mount(index) {
    const def = MACHINES[index];
    if (!gallery.hidden) showGallery(false);
    $$(nav, ".ix").forEach((b, i) => (b.dataset.on = i === index ? "1" : ""));
    $$(nav, ".ix")[index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const view = def.view;
    const W = view.W || 1000;
    const H = view.H || 600;
    svgs.forEach((s) => s.setAttribute("viewBox", `0 0 ${W} ${H}`));
    floorRoot.innerHTML = "";
    mainRoot.innerHTML = "";
    if (M && M.def.unmount) {
      try {
        M.def.unmount(M);
      } catch (e) {}
    }
    const seaGl = $(stage, ".st-sea").getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: false });
    if (seaGl) {
      seaGl.clearColor(0, 0, 0, 0);
      seaGl.clear(seaGl.COLOR_BUFFER_BIT);
    }
    stage.dataset.focus = "";
    cam = { az: view.azimuth ?? 30, el: view.elevation ?? 26 };
    const P = projectionFor(def, W, H);
    const scene = createScene((layer) => (layer < 0 ? floorRoot : mainRoot), P);
    const B = createBuilder(scene, { unit: def.unit });
    const fx = createFx({ back: $(stage, ".st-back"), front: $(stage, ".st-front"), view: [W, H], P, unit: def.unit, ground: def.ground ?? 0 });
    M = {
      def,
      index,
      W,
      H,
      P,
      B,
      scene,
      fx,
      unit: def.unit,
      m: (metres) => metres / def.unit,
      ctrl: {},
      toggles: {},
      ammoIndex: 0,
      state: null,
      phase: def.phases ? def.phases[0] : "rest",
      shot: null,
      flight: null,
      time: 0,
      calm: still.matches,
      dirty: true,
      sea: $(stage, ".st-sea"),
      stage,
      range,
      PH,
      looks,
      sfx: (name, o) => SFX.play(name, o),
      get ammo() {
        return def.ammo[this.ammoIndex];
      },
      setPhase(name) {
        if (this.phase !== name) {
          this.phase = name;
          renderPhase();
          const sr = $(root, ".sr");
          if (sr) sr.textContent = name;
        }
      },
      // Start a recorded shot of `T` seconds on the timeline.
      startShot(T, marks = []) {
        this.shot = { t: 0, T, marks, playing: true };
        renderMarks();
      },
      // Free flight from a release point (world units) at velocity v (m/s).
      launch({ p, v, t0 = 0, ammo = null, spin = 0 }) {
        const a = ammo || this.ammo;
        const pm = mul(p, def.unit);
        const area = a.area ?? Math.PI * (a.radius || 0.1) ** 2;
        const flight = PH.flight({ p: pm, v, mass: a.mass, area, cd: a.cd ?? 0.47, hit: def.target ? (q, prev) => range.hit(q, prev) : null });
        this.flight = { flight, t0, ammo: a, spin, sounded: false };
        range.launch({ flight, ammo: a, t0 });
        this.lastFlight = flight;
        return flight;
      },
      // The stage camera for a WebGL layer, including the current zoom and pan.
      glCamera() {
        const cam = GL.glCamera(this.P);
        const z = this.zoom || { s: 1, tx: 0, ty: 0 };
        return { origin: [cam.origin[0] * z.s + z.tx, cam.origin[1] * z.s + z.ty], k: cam.k * z.s, cam: cam.cam };
      },
    };
    for (const c of def.controls || []) M.ctrl[c.id] = c.value;
    for (const t of def.toggles || []) M.toggles[t.id] = !!t.value;
    def.build(B, M);
    scene.seal();
    M.state = def.init ? def.init(M) : {};
    $(root, ".pl-range").style.display = def.target ? "" : "none";
    if (def.target) range.mount(def, M);
    else range.reset();
    fx.setOccluders(def.occluders ? def.occluders(M) : []);
    $(root, ".c-fig").textContent = `Fig ${String(index + 1).padStart(2, "0")}`;
    $(root, ".c-title").textContent = def.name;
    $(root, ".c-hint").textContent = def.hint || "Space · Loose";
    $(root, ".r-title").textContent = `${def.target?.kind === "palisade" ? "Palisade" : "Wall"} · ${def.target?.distance ?? 0} m`;
    stage.setAttribute("aria-label", `${def.name}. Space looses, digits pick ammunition, arrows change engine.`);
    stage.dataset.cut = M.toggles.cut ? "1" : "";
    buildDeck();
    setZoom({ s: 1, tx: 0, ty: 0 }, true);
    idleAt = clock + 5;
    try {
      localStorage.setItem("siege.machine", String(index));
      history.replaceState(null, "", "#" + (index + 1));
    } catch (e) {}
    document.title = `${def.name} · Siege Engines`;
    draw(true);
  }

  // ---------------- camera orbit ----------------
  let cam = { az: 30, el: 26 };
  function projectionFor(def, W, H) {
    const v = def.view;
    const base = k.fitProjection(v.fit, W, H, { pad: v.pad ?? 30, azimuth: v.azimuth ?? 30, elevation: v.elevation ?? 26 });
    if (Math.abs(cam.az - (v.azimuth ?? 30)) < 1e-6 && Math.abs(cam.el - (v.elevation ?? 26)) < 1e-6) return base;
    const turned = k.fitProjection(v.fit, W, H, { pad: v.pad ?? 30, azimuth: cam.az, elevation: cam.el });
    const s = Math.min(base.scale, turned.scale * 1.08);
    const centre = turned.origin.map((o, i) => (i === 0 ? W / 2 : H / 2) + (o - (i === 0 ? W / 2 : H / 2)) * (s / turned.scale));
    return { origin: centre, scale: s, azimuth: cam.az, elevation: cam.el };
  }
  let rebuildPending = 0;
  function rebuildStage() {
    rebuildPending = 0;
    const def = M.def;
    floorRoot.innerHTML = "";
    mainRoot.innerHTML = "";
    const P = projectionFor(def, M.W, M.H);
    const scene = createScene((layer) => (layer < 0 ? floorRoot : mainRoot), P);
    const B = createBuilder(scene, { unit: def.unit });
    Object.assign(M, { P, scene, B });
    M.fx.setProjection(P);
    def.build(B, M);
    scene.seal();
    scene.setFocus(stage.dataset.focus || "");
    def.onCamera?.(M);
    M.dirty = true;
    draw(true);
    const o = $(root, ".cam-az .ct-val"), t = $(root, ".cam-el .ct-val");
    if (o) o.innerHTML = `${Math.round(cam.az)}<i>°</i>`;
    if (t) t.innerHTML = `${Math.round(cam.el)}<i>°</i>`;
  }
  function setCamera(az, el) {
    cam = { az: clamp(az, 4, 84), el: clamp(el, 10, 50) };
    const ia = $(root, ".cam-az input"), ie = $(root, ".cam-el input");
    if (ia) ia.value = cam.az;
    if (ie) ie.value = cam.el;
    if (!rebuildPending) rebuildPending = requestAnimationFrame(rebuildStage);
  }

  // ---------------- deck ----------------
  function buildDeck() {
    const def = M.def;
    const ammo = $(root, ".dk-ammo");
    ammo.innerHTML = "";
    def.ammo.forEach((a, i) => {
      let svg = "";
      try {
        svg = ammoIcon(a);
      } catch (e) {
        console.warn(e);
      }
      ammo.appendChild(h("button", { class: "am", "data-on": i === M.ammoIndex ? "1" : "", title: `${a.name} (${i + 1})`, onclick: () => pickAmmo(i) }, `<span class="am-ico">${svg}</span><span class="am-name">${esc(a.name)}</span><span class="am-mass">${a.mass >= 10 ? fmtInt(a.mass) : fmt(a.mass, a.mass < 1 ? 2 : 1)} kg</span><kbd>${i + 1}</kbd>`));
    });
    const ctrls = $(root, ".dk-ctrls");
    ctrls.innerHTML = "";
    for (const c of def.controls || []) {
      const row = h("label", { class: "ct" }, `<span class="ct-name">${esc(c.name)}</span><span class="ct-val">${formatValue(M.ctrl[c.id], c)}</span><input type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${M.ctrl[c.id]}"><span class="ct-rule">${rulerTicks(c.min, c.max, c.step)}</span>`);
      const input = $(row, "input");
      input.addEventListener("input", () => {
        M.ctrl[c.id] = Number(input.value);
        $(row, ".ct-val").innerHTML = formatValue(M.ctrl[c.id], c);
        M.dirty = true;
        def.onControl?.(M, c.id);
        renderMarks();
        if (def.target) $(root, ".r-title").textContent = `${def.target.kind === "palisade" ? "Palisade" : "Wall"} · ${def.target.distance} m`;
        touch();
      });
      ctrls.appendChild(row);
    }
    const acts = $(root, ".dk-acts");
    acts.innerHTML = "";
    for (const a of def.actions || []) {
      const btn = h("button", { class: `btn${a.primary ? " primary" : ""}`, "data-act": a.id, title: a.key ? `${a.name} (${a.key === " " ? "Space" : a.key.toUpperCase()})` : a.name }, `<span class="dot"></span>${esc(a.name)}${a.key ? `<kbd>${a.key === " " ? "␣" : esc(a.key.toUpperCase())}</kbd>` : ""}`);
      if (a.hold) {
        btn.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          act(a.id, true);
        });
        const up = () => act(a.id, false);
        btn.addEventListener("pointerup", up);
        btn.addEventListener("pointerleave", up);
        btn.addEventListener("pointercancel", up);
      } else btn.addEventListener("click", () => act(a.id, true));
      acts.appendChild(btn);
    }
    acts.appendChild(h("button", { class: "btn ghost", title: "Reset (R)", onclick: () => reset() }, `Reset<kbd>R</kbd>`));
    renderPhase();
    const sp = $(root, ".dk-speed");
    sp.innerHTML = "";
    sp.appendChild(h("button", { class: "chip sq pp", title: "Pause (P)", onclick: () => togglePause() }, paused ? "▶" : "❚❚"));
    SPEEDS.forEach(([value, label]) => sp.appendChild(h("button", { class: "chip", "data-speed": value, "data-on": value === speed ? "1" : "", onclick: () => setSpeed(value) }, label)));
    sp.appendChild(h("button", { class: "chip sq", title: "Step a frame (.)", onclick: () => stepFrame() }, "⇥"));
    const focus = $(root, ".dk-focus");
    focus.innerHTML = "";
    for (const f of def.focus || []) focus.appendChild(h("button", { class: "chip", "data-focus": f.id, onclick: () => setFocus(f.id) }, esc(f.name)));
    const toggles = $(root, ".dk-toggles");
    toggles.innerHTML = "";
    for (const t of def.toggles || []) {
      const b = h("button", { class: "chip", "data-toggle": t.id, "data-on": M.toggles[t.id] ? "1" : "", onclick: () => toggle(t.id) }, `<span class="dot"></span>${esc(t.name)}`);
      toggles.appendChild(b);
    }
    const camBox = h("div", { class: "dk-cam" }, `<label class="ct cam-az"><span class="ct-name">Orbit</span><span class="ct-val">${Math.round(cam.az)}<i>°</i></span><input type="range" min="4" max="84" step="1" value="${cam.az}"><span class="ct-rule">${rulerTicks(4, 84, 4)}</span></label><label class="ct cam-el"><span class="ct-name">Tilt</span><span class="ct-val">${Math.round(cam.el)}<i>°</i></span><input type="range" min="10" max="50" step="1" value="${cam.el}"><span class="ct-rule">${rulerTicks(10, 50, 2)}</span></label>`);
    $(camBox, ".cam-az input").addEventListener("input", (e) => setCamera(Number(e.target.value), cam.el));
    $(camBox, ".cam-el input").addEventListener("input", (e) => setCamera(cam.az, Number(e.target.value)));
    $$(root, ".dk-cam").forEach((el) => el.remove());
    toggles.after(camBox);
    renderMarks();
    readouts(true);
  }

  function ammoIcon(a) {
    const r = a.look === "bolt" || a.look === "firebolt" || a.look === "arrow" ? 1 : 1;
    if (def().ammoIcon) return def().ammoIcon(a);
    const ic = looks.icon(() => {}, [1.3, 1.3, 1.3], { width: 64, height: 46 });
    const B = createBuilder(ic.collector, { unit: 1 });
    if (a.look === "bolt" || a.look === "firebolt" || a.look === "arrow") {
      looks.bolt(B, "b", [-1.6, 1.6, -0.3], [1, -1, 0.25], 3.6, a.look === "arrow" ? 0.06 : 0.09, { fire: a.fire, heavy: a.heavy, vane: a.look === "arrow" ? 3.5 : 2.6 });
    } else looks.draw(a.look, B, "a", [0, 0, 0], a.look === "cluster" ? 1.05 : 1.0, { seed: 5 });
    return ic.finish();
  }
  const def = () => M.def;

  function pickAmmo(i) {
    if (i < 0 || i >= M.def.ammo.length) return;
    SFX.play("tick");
    M.ammoIndex = i;
    $$(root, ".am").forEach((b, j) => (b.dataset.on = i === j ? "1" : ""));
    M.dirty = true;
    M.def.onAmmo?.(M);
    renderMarks();
    touch();
  }
  // A held shot stays on the timeline (scrubbable) until the next action ends it.
  function finishShot() {
    if (!M.shot) return;
    M.shot.t = M.shot.T;
    M.def.endShot?.(M);
    M.shot = null;
    renderMarks();
  }
  function act(id, down) {
    touch();
    if (down && M.shot && M.shot.finished) finishShot();
    M.def.act?.(M, id, down);
    M.dirty = true;
    renderMarks();
  }
  function toggle(id) {
    M.toggles[id] = !M.toggles[id];
    $$(root, "[data-toggle]").forEach((b) => (b.dataset.on = M.toggles[b.dataset.toggle] ? "1" : ""));
    if (id === "cut") stage.dataset.cut = M.toggles.cut ? "1" : "";
    M.def.onToggle?.(M, id);
    renderMarks();
    M.dirty = true;
    touch();
  }
  function setFocus(id) {
    const next = stage.dataset.focus === id ? "" : id;
    stage.dataset.focus = next;
    M.scene.setFocus(next);
    $$(root, "[data-focus]").forEach((b) => (b.dataset.on = b.dataset.focus === next && next ? "1" : ""));
    M.dirty = true;
    touch();
  }
  function setSpeed(v) {
    speed = v;
    $$(root, "[data-speed]").forEach((b) => (b.dataset.on = Number(b.dataset.speed) === v ? "1" : ""));
  }
  function togglePause() {
    if (M && M.shot && (M.shot.finished || M.shot.t >= M.shot.T - 1e-6)) {
      M.shot.t = 0;
      M.shot.finished = false;
      M.shot.playing = true;
      paused = false;
    } else if (M && M.shot && !M.shot.playing) {
      M.shot.playing = true;
      paused = false;
    } else paused = !paused;
    const pp = $(root, ".pp");
    if (pp) pp.textContent = paused ? "▶" : "❚❚";
  }
  let stepping = 0;
  function stepFrame() {
    paused = true;
    const pp = $(root, ".pp");
    if (pp) pp.textContent = "▶";
    stepping = 1 / 60;
  }
  function reset() {
    M.shot = null;
    M.flight = null;
    M.fx.clear();
    range.reset();
    M.state = M.def.init ? M.def.init(M) : {};
    M.dirty = true;
    M.setPhase(M.def.phases ? M.def.phases[0] : "rest");
    renderMarks();
    touch();
  }
  function renderPhase() {
    const list = $(root, ".dk-phase");
    if (!list || !M) return;
    const phases = M.def.phases || [];
    const at = phases.indexOf(M.phase);
    list.innerHTML = phases.map((p, i) => `<li data-on="${i === at ? "1" : ""}" data-past="${i < at ? "1" : ""}">${esc(p)}</li>`).join("");
  }
  function renderMarks() {
    const marks = $(root, ".tl-marks");
    if (!marks) return;
    if (!M || !M.shot) {
      marks.innerHTML = "";
      return;
    }
    let lastX = -1;
    const width = track.getBoundingClientRect().width || 240;
    marks.innerHTML = (M.shot.marks || [])
      .map(([t, label]) => {
        const u = uOfT(t);
        const show = (u - lastX) * width > 34;
        if (show) lastX = u;
        return `<i style="left:${(u * 100).toFixed(2)}%" title="${esc(label)}">${show ? `<em>${esc(label)}</em>` : ""}</i>`;
      })
      .join("");
  }

  // ---------------- timeline scrubbing ----------------
  // The machine's own motion (up to just after release) gets half the bar; the flight the rest.
  const kneeOf = () => {
    const S = M && M.shot;
    if (!S) return null;
    const loose = (S.marks || []).find(([, l]) => /loose|release|fire|shot|launch/.test(l));
    if (!loose || S.T <= 0) return null;
    const tk = Math.min(S.T * 0.9, loose[0] + 0.6);
    return tk / S.T < 0.42 ? tk : null;
  };
  function uOfT(t) {
    const S = M.shot;
    const tk = kneeOf();
    if (tk === null) return clamp(t / S.T, 0, 1);
    return t <= tk ? (t / tk) * 0.5 : 0.5 + ((t - tk) / (S.T - tk)) * 0.5;
  }
  function tOfU(u) {
    const S = M.shot;
    const tk = kneeOf();
    if (tk === null) return u * S.T;
    return u <= 0.5 ? (u / 0.5) * tk : tk + ((u - 0.5) / 0.5) * (S.T - tk);
  }
  const track = $(root, ".tl-track");
  const scrubTo = (e) => {
    if (!M || !M.shot) return;
    const box = track.getBoundingClientRect();
    const u = clamp((e.clientX - box.left) / box.width, 0, 1);
    M.shot.t = tOfU(u);
    M.shot.playing = false;
    M.dirty = true;
    touch();
  };
  track.addEventListener("pointerdown", (e) => {
    scrubbing = true;
    track.setPointerCapture(e.pointerId);
    if (M && M.shot) M.shot.finished = false;
    scrubTo(e);
  });
  track.addEventListener("pointermove", (e) => scrubbing && scrubTo(e));
  track.addEventListener("pointerup", () => {
    scrubbing = false;
    if (M && M.shot) M.shot.playing = !paused && M.shot.t < M.shot.T;
    if (M && M.shot && M.shot.t >= M.shot.T && M.def.holdShot) M.shot.finished = true;
  });

  // ---------------- zoom and pan ----------------
  function setZoom(z, now = false) {
    zoomTarget = { s: clamp(z.s, 1, 6), tx: z.tx, ty: z.ty };
    const W = M.W, H = M.H, s = zoomTarget.s;
    zoomTarget.tx = clamp(zoomTarget.tx, W * (1 - s), 0);
    zoomTarget.ty = clamp(zoomTarget.ty, H * (1 - s), 0);
    if (now || still.matches) zoom = { ...zoomTarget };
    applyZoom();
  }
  function applyZoom() {
    const t = `translate(${zoom.tx.toFixed(2)} ${zoom.ty.toFixed(2)}) scale(${zoom.s.toFixed(4)})`;
    $$(stage, ".world").forEach((g) => g.setAttribute("transform", t));
    M.fx.setZoom(zoom);
    M.zoom = zoom;
    stage.dataset.zoomed = zoom.s > 1.01 ? "1" : "";
  }
  const toView = (e) => {
    const box = stage.getBoundingClientRect();
    return [((e.clientX - box.left) / box.width) * M.W, ((e.clientY - box.top) / box.height) * M.H];
  };
  stage.addEventListener(
    "wheel",
    (e) => {
      if (!M) return;
      e.preventDefault();
      const [x, y] = toView(e);
      const f = Math.exp(-e.deltaY * 0.0016);
      const s = clamp(zoomTarget.s * f, 1, 6);
      const r = s / zoomTarget.s;
      setZoom({ s, tx: x - (x - zoomTarget.tx) * r, ty: y - (y - zoomTarget.ty) * r });
      touch();
    },
    { passive: false },
  );
  let drag = null;
  stage.addEventListener("pointerdown", (e) => {
    if (!M) return;
    if (M.def.pointer && M.def.pointer(M, "down", e, toView(e))) return;
    drag = { x: e.clientX, y: e.clientY, z: { ...zoomTarget }, orbit: e.shiftKey || e.button === 2 || zoomTarget.s <= 1.01, cam: { ...cam } };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const box = stage.getBoundingClientRect();
    const dx = ((e.clientX - drag.x) / box.width) * M.W;
    const dy = ((e.clientY - drag.y) / box.height) * M.H;
    if (drag.orbit) setCamera(drag.cam.az - (dx / M.W) * 90, drag.cam.el + (dy / M.H) * 50);
    else if (zoomTarget.s > 1.01) setZoom({ s: drag.z.s, tx: drag.z.tx + dx, ty: drag.z.ty + dy }, true);
    touch();
  });
  const endDrag = () => (drag = null);
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("dblclick", () => {
    setZoom({ s: 1, tx: 0, ty: 0 });
    setCamera(M.def.view.azimuth ?? 30, M.def.view.elevation ?? 26);
  });
  stage.addEventListener("contextmenu", (e) => e.preventDefault());
  $$(root, "[data-zoom]").forEach((b) =>
    b.addEventListener("click", () => {
      const kind = b.dataset.zoom;
      if (kind === "full") return toggleFull();
      if (kind === "fit") {
        setCamera(M.def.view.azimuth ?? 30, M.def.view.elevation ?? 26);
        return setZoom({ s: 1, tx: 0, ty: 0 });
      }
      const s = clamp(zoomTarget.s * (kind === "in" ? 1.5 : 1 / 1.5), 1, 6);
      const cx = M.W / 2, cy = M.H / 2;
      const r = s / zoomTarget.s;
      setZoom({ s, tx: cx - (cx - zoomTarget.tx) * r, ty: cy - (cy - zoomTarget.ty) * r });
    }),
  );

  // ---------------- keys ----------------
  window.addEventListener("keydown", (e) => {
    if (!M) return;
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" && (e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const action = (M.def.actions || []).find((a) => a.key === key);
    if (action) {
      e.preventDefault();
      if (!e.repeat) act(action.id, true);
      return;
    }
    if (/^[1-9]$/.test(key)) return pickAmmo(Number(key) - 1);
    if (key === "ArrowRight" || key === "]") return mount((M.index + 1) % MACHINES.length);
    if (key === "ArrowLeft" || key === "[") return mount((M.index + MACHINES.length - 1) % MACHINES.length);
    if (key === "p") return togglePause();
    if (key === ".") return stepFrame();
    if (key === "r") return reset();
    if (key === "t") return toggleTheme();
    if (key === "m") return toggleSound();
    if (key === "z") return toggleFull();
    if (key === "Escape" && body.classList.contains("full")) return toggleFull();
    if (key === "g") return showGallery(gallery.hidden);
    if (key === "Escape" && !gallery.hidden) return showGallery(false);
    if (key === "0") return setZoom({ s: 1, tx: 0, ty: 0 });
    if (key === "x" && M.def.toggles?.some((t) => t.id === "cut")) return toggle("cut");
    if (key === "f" && M.def.focus?.length) {
      const list = M.def.focus.map((f) => f.id);
      const at = list.indexOf(stage.dataset.focus || "");
      return setFocus(list[(at + 1) % list.length]);
    }
    if (key === "s") {
      const at = SPEEDS.findIndex(([v]) => v === speed);
      return setSpeed(SPEEDS[(at + 1) % SPEEDS.length][0]);
    }
  });
  window.addEventListener("keyup", (e) => {
    if (!M) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const action = (M.def.actions || []).find((a) => a.key === key && a.hold);
    if (action) act(action.id, false);
  });
  function toggleFull() {
    body.classList.toggle("full");
    $(root, '[data-zoom="full"]').dataset.on = body.classList.contains("full") ? "1" : "";
    M.dirty = true;
  }
  function toggleSound() {
    SFX.setEnabled(!SFX.isEnabled());
    $(root, '[data-tool="sound"]').dataset.on = SFX.isEnabled() ? "1" : "";
    try {
      localStorage.setItem("siege.sound", SFX.isEnabled() ? "1" : "0");
    } catch (e) {}
  }
  $(root, '[data-tool="sound"]').addEventListener("click", toggleSound);
  window.addEventListener("pointerdown", () => SFX.wake(), true);
  window.addEventListener("keydown", () => SFX.wake(), true);
  // ---------------- gallery of all engines ----------------
  const gallery = $(root, ".gallery");
  const glGrid = $(root, ".gl-grid");
  let galleryBuilt = false;
  function buildGallery() {
    galleryBuilt = true;
    glGrid.innerHTML = "";
    const cards = MACHINES.map((def, i) => {
      const card = h("button", { class: "gl-card", onclick: () => { showGallery(false); mount(i); } }, `<span class="gl-fig">Fig ${String(i + 1).padStart(2, "0")}</span><span class="gl-name">${esc(def.name)}</span><span class="gl-art"></span>`);
      glGrid.appendChild(card);
      return card;
    });
    let i = 0;
    const next = () => {
      if (i >= MACHINES.length || gallery.hidden) return;
      const def = MACHINES[i];
      const art = $(cards[i], ".gl-art");
      try {
        art.innerHTML = miniature(def, 360, 230);
      } catch (e) {
        console.warn("gallery", def.id, e);
      }
      i++;
      setTimeout(next, 16);
    };
    next();
  }
  function miniature(def, Wm, Hm) {
    const P = k.fitProjection(def.view.fit, Wm, Hm, { pad: 8, azimuth: def.view.azimuth ?? 30, elevation: def.view.elevation ?? 26 });
    const holder = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const scene = createScene(() => holder, P);
    const B = createBuilder(scene, { unit: def.unit });
    const MM = { def, P, B, scene, unit: def.unit, ctrl: {}, toggles: {}, ammoIndex: 0, shot: null, flight: null, time: 0, calm: true, dirty: false, mini: false, gallery: true, W: Wm, H: Hm, m: (x) => x / def.unit, fx: { emit() {}, spawn() {}, setOccluders() {} }, sfx() {}, setPhase() {}, startShot() {}, launch() { return null; }, range: { mount() {}, hit() { return null; } }, glCamera: () => GL.glCamera(P), get ammo() { return def.ammo[0]; }, PH, looks };
    for (const c of def.controls || []) MM.ctrl[c.id] = c.value;
    def.build(B, MM);
    MM.state = def.init ? def.init(MM) : {};
    B.dynamic = false;
    def.draw(B, MM);
    scene.seal();
    scene.paint(true);
    return `<svg class="iso-svg" viewBox="0 0 ${Wm} ${Hm}" aria-hidden="true">${holder.innerHTML}</svg>`;
  }
  function showGallery(on) {
    gallery.hidden = !on;
    $(root, ".grid").hidden = on;
    $(root, '[data-tool="index"]').dataset.on = on ? "1" : "";
    if (on && !galleryBuilt) buildGallery();
    if (on) window.scrollTo(0, 0);
  }
  $(root, '[data-tool="index"]').addEventListener("click", () => showGallery(gallery.hidden));
  function toggleTheme() {
    body.dataset.theme = body.dataset.theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("siege.theme", body.dataset.theme);
    } catch (e) {}
    M.dirty = true;
  }
  $(root, '[data-tool="theme"]').addEventListener("click", toggleTheme);

  function touch() {
    idleAt = clock + 14;
    if (M) M.touring = false;
  }

  // ---------------- drawing ----------------
  function draw(force) {
    const { B, scene, def } = M;
    B.dynamic = true;
    scene.frame();
    def.draw(B, M);
    drawFree();
    scene.commit();
    scene.paint(force);
  }

  // The projectile after release, in the stage's own world units.
  function drawFree() {
    const F = M.flight;
    if (!F || !M.shot) return;
    const local = M.shot.t - F.t0;
    if (!F.sounded && local >= 0 && local < 0.3 && M.shot.playing) {
      F.sounded = true;
      const bolt = /bolt|arrow/.test(F.ammo.look);
      SFX.play(bolt ? "twang" : "whoosh", { pitch: bolt ? 1.2 - Math.min(0.5, F.ammo.mass) : 1, size: Math.min(2, 0.6 + F.flight.speed0 / 60), gain: 0.8 });
    }
    if (local < 0 || local > F.flight.impact.t) return;
    const s = F.flight.track.at(local);
    const p = mul(s.p, 1 / M.unit);
    const [sx, sy] = M.B.at(p);
    const margin = 80;
    if (sx < -margin || sx > M.W + margin || sy < -margin * 3 || sy > M.H + margin) return;
    const a = F.ammo;
    const r = (a.radius || 0.1) / M.unit;
    if (a.look === "bolt" || a.look === "firebolt" || a.look === "arrow") {
      const dir = unit(s.v);
      const L = (a.length || 0.7) / M.unit;
      looks.bolt(M.B, "free", sub(p, mul(dir, L * 0.8)), dir, L, Math.max(r, (a.shaft || 0.012) / M.unit), { fire: a.fire, heavy: a.heavy, layer: 4, roll: local * 9 });
    } else looks.draw(a.look, M.B, "free", p, r, { spin: local * (F.spin || 4), layer: 4, seed: 5, axis: unit([s.v[0], s.v[1], s.v[2] + 0.001]) });
    if (a.fire && !M.calm) {
      const rate = (1 / 60) * speed;
      if (Math.random() < 0.9) M.fx.emit("fire", p, { n: 2, v: mul(s.v, -0.15 / M.unit), spread: r * 2, size: r * 2.2, grow: r * 0.8, life: 0.35, heat: 1, buoy: 0.5 / M.unit, drag: 3 });
      if (Math.random() < 0.5) M.fx.emit("smoke", p, { n: 1, v: [0, 0, 0.6 / M.unit], spread: r, size: r * 2, grow: r * 7, life: 1.8, alpha: 0.6, buoy: 0.3 / M.unit, drag: 1.2 });
    }
  }

  function readouts(force) {
    if (!M) return;
    const def = M.def;
    const rows = def.readouts ? def.readouts(M) : [];
    const F = M.lastFlight;
    if (F) {
      rows.push(["Release speed", fmt(F.speed0, 1), "m/s"], ["Muzzle energy", F.energy0 >= 10000 ? fmt(F.energy0 / 1000, 1) : fmtInt(F.energy0), F.energy0 >= 10000 ? "kJ" : "J"], ["Apex", fmt(F.apex, 1), "m"], ["Flight", fmt(F.impact.t, 2), "s"], ["Range", fmt(-F.impact.p[1], 1), "m"], ["Strike", F.impact.what?.kind === "ground" || !F.impact.what ? "ground" : F.impact.what.kind, ""], ["Impact energy", F.energyHit >= 10000 ? fmt(F.energyHit / 1000, 1) : fmtInt(F.energyHit), F.energyHit >= 10000 ? "kJ" : "J"]);
    }
    const dl = $(root, ".dk-read");
    const html = rows.map(([label, value, unitText]) => `<dt>${esc(label)}</dt><dd>${value}${unitText ? `<i>${esc(unitText)}</i>` : ""}</dd>`).join("");
    if (dl.dataset.html !== html) {
      dl.innerHTML = html;
      dl.dataset.html = html;
    }
    const corner = def.corner ? def.corner(M) : `${M.phase}${F ? ` · ${fmt(F.speed0, 1)} m/s · ${fmt(-F.impact.p[1], 0)} m` : ""}`;
    const c = $(root, ".c-read");
    if (c.textContent !== corner) c.textContent = corner;
    const rr = $(root, ".r-read");
    const dist = M.def.target?.distance ?? 0;
    const rText = F ? `${F.impact.what?.kind && F.impact.what.kind !== "ground" ? `hit ${F.impact.what.kind}` : -F.impact.p[1] > dist ? "over" : "short"} · ${fmt(-F.impact.p[1], 1)} m` : "—";
    if (rr.textContent !== rText) rr.textContent = rText;
    const fill = $(root, ".tl-fill");
    const head = $(root, ".tl-head");
    const time = $(root, ".tl-time");
    if (M.shot) {
      const u = clamp(uOfT(M.shot.t), 0, 1);
      fill.style.width = `${(u * 100).toFixed(2)}%`;
      head.style.left = `${(u * 100).toFixed(2)}%`;
      time.textContent = `${M.shot.t.toFixed(2)} s`;
    } else {
      fill.style.width = "0%";
      head.style.left = "0%";
      time.textContent = "0.00 s";
    }
  }

  // ---------------- loop ----------------
  function tick(now) {
    const real = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    clock += real;
    if (M) {
      M.calm = still.matches;
      let dt = paused ? stepping : real * speed;
      stepping = 0;
      M.time += dt;
      if (Math.abs(zoom.s - zoomTarget.s) > 1e-4 || Math.abs(zoom.tx - zoomTarget.tx) > 0.01 || Math.abs(zoom.ty - zoomTarget.ty) > 0.01) {
        const f = 1 - Math.exp(-real / 0.12);
        zoom = { s: zoom.s + (zoomTarget.s - zoom.s) * f, tx: zoom.tx + (zoomTarget.tx - zoom.tx) * f, ty: zoom.ty + (zoomTarget.ty - zoom.ty) * f };
        applyZoom();
      }
      if (M.shot && M.shot.playing && !scrubbing) {
        M.shot.t += dt;
        if (M.shot.t >= M.shot.T) {
          M.shot.t = M.shot.T;
          if (M.def.holdShot) {
            M.shot.playing = false;
            M.shot.finished = true;
          } else finishShot();
        }
      }
      const moving = M.def.update ? M.def.update(M, dt) : false;
      if (moving || M.dirty || M.shot) {
        draw(false);
        M.dirty = false;
      }
      M.fx.update(dt);
      M.fx.render(light(), M.time);
      M.def.renderGl?.(M, light());
      if (M.def.target) range.update(dt, M.shot ? M.shot.t : null, light(), M.time);
      if (clock - readAt > 0.08) {
        readAt = clock;
        readouts();
      }
      if (!still.matches && clock > idleAt && M.def.tour && (!M.shot || M.shot.finished)) {
        if (M.shot) finishShot();
        idleAt = clock + (M.def.tourGap || 9);
        M.touring = true;
        M.def.tour(M);
        renderMarks();
      }
    }
    requestAnimationFrame(tick);
  }

  let first = 0;
  let theme = null;
  try {
    if (localStorage.getItem("siege.sound") === "0") {
      SFX.setEnabled(false);
      $(root, '[data-tool="sound"]').dataset.on = "";
    }
    first = Number(localStorage.getItem("siege.machine") || 0);
    theme = localStorage.getItem("siege.theme");
  } catch (e) {}
  const hash = Number((location.hash.match(/#(\d+)/) || [])[1]);
  if (hash >= 1 && hash <= MACHINES.length) first = hash - 1;
  window.addEventListener("hashchange", () => {
    const n = Number((location.hash.match(/#(\d+)/) || [])[1]);
    if (n >= 1 && n <= MACHINES.length && n - 1 !== M.index) mount(n - 1);
  });
  if (theme) body.dataset.theme = theme;
  mount(clamp(first, 0, MACHINES.length - 1));
  if (MACHINES.length > 1 && !(hash >= 1) && !/nogallery/.test(location.search) && !localStorage.getItem("siege.seen")) {
    try { localStorage.setItem("siege.seen", "1"); } catch (e) {}
    showGallery(true);
  }
  window.__siege = { get M() { return M; }, mount, act, pickAmmo, setSpeed, togglePause, reset, toggle, setFocus };
  requestAnimationFrame(tick);
}

# Authoring a siege engine

The anatomy skill and its references live at https://github.com/wheresryan22/anatomy (paths below like `../anatomy-main/…` refer to a checkout of it next to this folder).

This project is an interactive, WebGL-assisted isometric explainer of 12 ancient siege engines, built on the
**anatomy** skill (`../anatomy-main/SKILL.md`, `../anatomy-main/references/craft.md`). Read SKILL.md and craft.md
sections 1–5 before you start. The bar is the anatomy bar: **a real, recognisable machine built from many small,
precise, purposeful solids**, four-tone shading, correct painter's order, calm eased motion, and every number
true to a physical model. **No text explanations anywhere** — the motion, the lit subsystems and the live numbers
explain the mechanism. Labels on controls and short readout names are fine; sentences are not.

The reference machine is `src/machines/08-trebuchet.js`. Read it completely before writing anything; copy its
structure.

## Files

- `src/machines/NN-id.js` — one machine per file, `export default { … }`. You only ever edit **your own file**.
  Never edit `src/engine/*`, `build.mjs`, `style.css` or other machines. If you truly need an engine feature,
  implement it locally inside your machine file (you can import the kit and engine modules).
- Build only your machine into your own page:  
  `node build.mjs --only=NN --out=dev-NN.html` (from the `siege/` folder). Add `--dark` for the dark theme.
- Screenshots: `node ../anatomy-main/scripts/capture.mjs dev-NN.html --out shots/NN/x.png --width 1440 --height 1100 --scale 1 --select .pl-stage`
  and scripted sequences with `node ../anatomy-main/scripts/drive.mjs dev-NN.html --actions shots/NN/seq.json --width 1440 --height 1100 --scale 1`
  (see `shots/seq1.json`, `shots/seq2.json` for examples: `["eval", "window.__siege.act('loose', true)"]`,
  `["until", "window.__siege.M.phase === 'armed'", 15000]`, `["shot", "shots/NN/z.png", ".st-stage", 3, [x, y, w, h]]` for a 3× close-up).
  Put all your screenshots under `shots/NN/`. **Read every PNG you make.**

Imports available to a machine (paths relative to `src/machines/`):
```js
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";   // kit core: iso, pathOf, slabOf, …
import * as G from "../../vendor/anatomy/kit/lathe.mjs";     // frames, lathe, sphereOf, arcOf, ribsOf, dotsOf, …
import * as GL from "../../vendor/anatomy/kit/gl.mjs";       // glLayer, glCamera, GLSL_ISO (for a custom shader layer)
import { add, sub, mul, dot, cross, unit, len, lerp, clamp, rad, deg, ease, smoothstep, fmt, fmtInt, TAU, rng, rotate } from "../engine/vec.js";
import * as PH from "../engine/physics.js";   // rk4, timeline, linkage (numeric Lagrangian), run, flight, skeinTorque, skeinEnergy
import * as looks from "../engine/looks.js";  // stone, pot, cluster, barrel, bolt, draw(look,…)
import { frameFrom, framePoint, polyRect, polyRound, polyCircle, polySaw, polyGear, extrudeAlong } from "../engine/geo.js";
import { shapeOf } from "../engine/scene.js";
```
Only `import … from "…"` lines at the top of the file are supported (the bundler rewrites them). No dynamic imports.

## World, units and camera

- World: x and y on the floor, **z up**. The machine shoots **down-range along −y**. The camera looks from +x,+y,
  so the +x side and the +y (rear) faces are visible; −y (the target direction) goes to the right of the screen.
- Choose a unit `U` (metres per world unit) so the machine is roughly 250–400 world units across, e.g. 0.05 for a
  12 m trebuchet, 0.01 for a 1.5 m crossbow. Author in metres and convert with `const S = 1 / U; const w = (x, y, z) => [x * S, y * S, z * S];`.
  Kit detail sizes (bevels 0.4–1.6, dots 0.4–0.6, rule lines) assume about 1 screen px per world unit, so this matters.
- `view: { W: 1000, H: 640, azimuth, elevation, pad, fit: [points…] }`. azimuth 20–35 shows the side (the plane the
  arms swing in, y–z) almost face-on; 35–55 shows more of the rear. elevation 18–30. `fit` must contain the plinth
  corners (with its feet) and the tallest point the machine reaches during its cycle.
- Real dimensions and masses only. Look them up from your knowledge of reconstructions (Marsden, Heron, Philo,
  Vitruvius, Ammianus, modern reconstructions) and keep them consistent.

## The definition object

```js
export default {
  id, name, short,            // short: the index label (one or two words)
  unit: U,
  view: { … },
  target: { kind: "wall" | "palisade", distance, maxRange, height?, apex? } | null,   // null hides the range card
  ammo: [{ id, name, look, mass, radius, cd, fire?, length?, shaft?, heavy? } × 3],    // EXACTLY 3, all different
  controls: [{ id, name, min, max, step, value, unit, digits? }],   // 3–5 sliders, each changes the physics
  actions: [{ id, name, key, primary? }],                           // e.g. wind/cock (letter key) and loose (key " ", primary)
  toggles: [{ id: "cut", name: "Cutaway" }, { id: "strobe", name: "Strobe" }, …],   // "cut" hides parts with cut: true
  focus: [{ id, name }],      // 4–6 subsystems; parts tagged sys: id light up in the accent colour
  phases: ["rest", …],        // the cycle as short words, shown as a strip
  hint: "Space · loose   W · wind",
  build(B, M) {},             // static parts, drawn once (plinth, frame, anything that never moves)
  init(M) { return state; },
  act(M, id, down) {},        // button / key handler
  update(M, dt) { return animating; },  // advance your state; return true while anything moves
  draw(B, M) {},              // dynamic parts, every frame something moves (pose from state or the shot record)
  endShot(M) {},              // the shot timeline reached its end
  tour(M) {},                 // idle attract loop: usually act(M, "loose")
  readouts(M) { return [[label, value, unit], …]; },   // live numbers from the same model that moves the parts
  occluders(M) { return [{ min, max }]; },             // world boxes that hide particles behind them (optional)
  onControl(M, id) {}, onAmmo(M) {}, onToggle(M, id) {},  // optional
  renderGl(M, light) {},      // optional: draw a custom WebGL layer each frame (water, glow) on M.sea
};
```
`this` inside these methods is the definition object (they are called as `def.method(…)`).

### M, the runtime context
- `M.ctrl[id]` slider values, `M.toggles[id]`, `M.ammo` (selected ammo object), `M.ammoIndex`, `M.state` (yours),
  `M.unit`, `M.time`, `M.calm` (reduced motion: no particles, jump to targets), `M.fx`, `M.range`, `M.B`, `M.P`, `M.W`, `M.H`.
- `M.setPhase(name)` — must be one of `phases`.
- `M.startShot(T, marks)` — starts a recorded shot of `T` seconds. The engine advances `M.shot.t` (scaled by the
  speed chips, paused, scrubbed by the timeline). Your `draw` must read `M.shot.t` and pose everything from a
  **precomputed record** (`PH.timeline()`), so the user can scrub and slow it down. `marks` is `[[t, "label"], …]`
  shown on the timeline (e.g. trip, lift, loose, impact).
- `M.launch({ p, v, t0, spin })` — free flight: `p` the release point in **world units**, `v` the velocity in
  **m/s** (world axes), `t0` the shot time of release. Returns the flight (`impact.t`, `impact.p` in metres,
  `apex`, `speed0`). The engine then draws the projectile in your stage after `t0` and the whole trajectory on the
  range card, hit-tests the target and makes the impact effects. You draw the projectile only while it is still in
  the machine (before `t0`).
- `M.fx.emit(kind, p, { n, v, spread, size, grow, life, heat, buoy, grav, drag, alpha, bounce, jitter })` — world-unit
  particles: `smoke, soot, fire, dust, steam, spark, debris, splinter, splash, mist, ember, liquid, glow`.
  `grav: 1` is real gravity; `buoy` is an upward acceleration in world units/s². Skip all particles when `M.calm`.
- `M.glCamera()` — the zoom-aware camera for a `GL.glLayer` on `M.sea` (a canvas under the machine's SVG, above the
  plinth). `glLayer` keeps the camera object you pass at creation, so each frame do `Object.assign(cam, M.glCamera())`
  before `layer.draw(…)`. Read `../anatomy-main/references/webgl.md` before writing a shader (world space, envelopes,
  no hard cut-offs, light-theme inks). Particles from `M.fx` cover most needs; write a shader only for water or glow.

### B, the builder (all sizes in world units)
Every call draws kit solids and registers each as a **part** with a convex proxy shape; the painter orders parts
with separating-axis tests, so **keep parts convex and never sunk into each other**. Where one thing wraps another
(a band on a beam, a hub on an axle, a washer on a pin), split the inner one so the pieces meet face to face —
exactly as the trebuchet's arm segments meet its iron bands, and its axle stops at the bearing faces. Parts that
interpenetrate fall back to centre-depth order and often draw wrong.

- `B.beam(id, a, b, { w, h, up, round, mat, tone, sys, cut, grain, bands: [{ at }], nails: [{ s, face, x }], pegs })` — a squared timber/bar from a to b (w across, h toward `up`). `grain: n` faint grain lines, `bands` iron straps that split the beam, `nails` dots on a face (`"u" | "-u" | "v" | "-v"`, x in −1…1).
- `B.prism(id, F, poly, s0, s1, opts)` — any convex polygon in frame F's (u, v) plane extruded along F.a. `F = { o, a, u, v }` (unit vectors). Polygons: `polyRect, polyRound, polyCircle`.
- `B.toothed(id, F, poly, s0, s1, opts)` — non-convex profile (ratchets `polySaw`, gears `polyGear`, a claw outline).
- `B.slab(id, plan, z, h, { steps, bevel, groove, seams })` — a kit floor slab (vertical prism on a rounded plan).
- `B.cyl(id, p0, p1, r, { F, seams: [s], ribs: { count, twist, phase }, bolts: [{ s, r, count }], faceRing: [{ s, r }] })` — round bar/pin/drum/axle/disc. Pass `F` to fix its orientation so ribs can turn with it.
- `B.ring(id, p0, p1, rIn, rOut)` — washers, hoops, bushings.
- `B.turned(id, F, profile, { smooth })` — any lathe profile `[[s, r(, 1 = smooth)], …]` along F.a (bells, nozzles, pots, finials).
- `B.ball(id, c, r)`, `B.rope(id, points, r)` (twisted rope, drawn as a line when thin), `B.cord(id, points, { width })` (taut string), `B.chain(id, points, { link, wire })`.
- `B.wheel(id, F, { R, rim, width, spokes, hub, hubLen, segments, spokeW, tyre })` — spoked wheel in F's (u, v) plane, axis F.a.
- `B.plinth(plan, { h, foot, ruler: "y" | "x", label: plan })` — the display base; call it first in `build`, skip it when `B.mini` (the range card draws your machine in miniature with `B.mini = true`; draw nothing decorative then, and return early from `draw` after the main structure).
- `B.halo(id, floorPoints, z, { blur })` — soft shadow.
- `B.marks(id, svg, points, { r, layer })` — free line markup as its own part (strobe ghosts, traces).
- `B.keep(key, deps, fn)` — memo: re-emits what `fn` drew last frame while `deps` is unchanged. Wrap every block of
  parts that is not moving this frame (piles, idle winches) — this is the main performance lever.
- Common options: `mat` (`wood, oak, iron, bronze, copper, rope, sinew, hide, stone, granite, clay, lead, pitch`),
  `tone` (`hi` default, `mid`, `lo`), `lit` (the one accent), `sys` (focus subsystem id), `cut: true` (hidden by
  the Cutaway toggle — use it on the near wall/frame that hides the mechanism), `layer` (−3…−1 floor, 0 default,
  higher = always on top), `bias`/`key`/`after`/`before` (rarely needed ordering hints), `inner`/`over` (extra line markup
  drawn with the part; build it with `B.L(d, { tone })`, `B.D(points, { size, tone })`), `crease`.
- `B.at(worldPoint)` projects to screen; `B.V` is the unit direction toward the viewer; `B.KS` screen px per unit.

### Ammo looks
`looks.stone / pot / cluster / barrel` (round shot, fire pot, net of stones, barrel) and `looks.bolt(B, id, tail, dir, length, r, { fire, heavy })`
(bolts, arrows, fire bolts). `ammo.look` drives the engine's free-flight drawing and the ammo icons: use
`"granite" | "stone" | "lead" | "iron" | "pot" | "cluster" | "barrel" | "bolt" | "firebolt" | "arrow"`. For bolts set
`length` (m) and `shaft` (shaft radius, m). `fire: true` makes it burn in flight and on impact.
For ammunition the engine cannot draw (a ram head, a liquid), set `look` to the closest and draw your own in `draw`.

## What every machine must have

1. **Truth.** A small physics model in the file: torsion skeins (`PH.skeinTorque`), bow draw curves, levers and
   slings (`PH.linkage` — see the trebuchet's `simulate`), pressure, buoyancy, pendulums. Energies, velocities,
   ranges and forces in the readouts come from it. Controls change the physics. Ranges and velocities must be
   plausible for the real engine (e.g. a 3-span scorpio bolt at 60–100 m/s, an onager 2–5 kg stone at 30–50 m/s).
2. **The mechanism, in depth, shown by motion.** Every step of the real cycle animates: winding/cocking (windlass
   turning, ratchet pawl clicking tooth by tooth, slider drawn back, skeins twisting, arms bending back), loading
   (the projectile travels from a ready rack into place), aiming if relevant, the trigger tripping, the release in a
   precomputed record you can scrub in slow motion, recoil/settling, and resetting. Arming rule: Loose on an
   uncocked machine first cocks, loads, then looses (as the trebuchet does with `auto`).
3. **Detail.** 60–120 parts for the machine itself plus a ready rack/pile showing all three ammo types (the selected
   one `lit`). Real joinery: pegs, iron bands, bolts, washers, cheeks, bushings, wedges, lashings. Nothing floats:
   every part rests on or is fixed to another. Check at 3× zoom — no bare faces, no empty corners.
4. **Three distinct ammunition types** that differ physically (mass, drag, fire) and visibly.
5. **Focus subsystems** (`sys` on parts) so a click lights e.g. "Trigger", "Skeins", "Windlass", "Slider".
6. **Cutaway** where something hides the mechanism (`cut: true` on the near parts), **Strobe** where motion is fast
   (ghost lines of the moving parts sampled from the shot record, like the trebuchet's `drawStrobe`).
7. **Effects** with `M.fx` where real: dust when an arm slams a buffer, sparks, smoke, steam, fire on fire ammo.
8. **Performance.** `draw` under ~8 ms. Measure (see `shots/perf.json`). Use `B.keep` for anything still.
   Use few segments on small round parts. Precompute records once per shot (fire), never per frame.
9. **Light theme first** (it ships), dark must still work: build with `--dark` and look once.
10. **Console clean**, no exceptions, in a full cycle and after Reset.

## Process
1. Write the truth (numbers, model) and a parts list (≥ 60) in a comment block at the top of your file.
2. Build static geometry, look at it. Then dynamic parts and the state machine. Then physics and the shot.
3. Verify like a critic: full cycle screenshots (rest, cocking, armed, mid-release, after), 3× close-ups of every
   joint/mechanism in both themes, all three ammo types, every control at its extremes, every toggle and focus.
   Fix ordering errors by splitting parts, not by biasing keys.
4. When done, report: the truth (key numbers), parts count, draw ms, and anything you could not get right.

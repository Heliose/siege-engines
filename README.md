# Siege Engines

An interactive, physically modelled explainer of twelve ancient siege engines, drawn in the
**anatomy** isometric style (precise SVG solids, four-tone shading, painter's order solved from real
3D shapes) with WebGL effects (fire, smoke, dust, steam, sparks, debris, water) in the same camera.

Open `index.html` in a browser. It is one self-contained file that needs no server and no network.

## The engines

| # | Engine | Mechanism |
|---|---|---|
| 01 | Gastraphetes | composite bow, ratchet slider, belly-braced cocking |
| 02 | Scorpio | twin torsion skeins, windlass, claw trigger, universal-joint mount |
| 03 | Polybolos | chain-driven repeating bolt thrower with an auto-feeding drum |
| 04 | Onager | single-arm torsion, sling, padded buffer |
| 05 | Aerotonon | Ctesibius' air-spring catapult: bronze cylinders and pistons |
| 06 | Steam cannon | flash steam from a red-hot breech (Archimedes / Leonardo) |
| 07 | Traction trebuchet | crew-pulled lever and sling |
| 08 | Counterweight trebuchet | hinged counterweight, sling on a release prong, windlass, sear |
| 09 | Archimedes' claw | lever crane, counterweight and grapnel against a galley |
| 10 | Greek fire siphon | force pump, heated tank, swivel nozzle, fire on water |
| 11 | Battering ram | suspended pendulum ram in a hide-covered shed |
| 12 | Siege tower | capstan-driven tower, ports and a drop bridge |

## Controls

- **Ammunition**: three per engine, each with its own mass, drag and behaviour (keys 1–3).
- **Setup**: sliders that change the physics (counterweight, skein twist, draw, sling, elevation, target distance…).
- **Action**: wind/cock/load/loose and each engine's own actions. `Space` looses; an uncocked engine cocks and loads first.
- **Time**: the shot is a precomputed record. Scrub it on the timeline, slow it to 1⁄25, pause (`P`), step (`.`).
- **View**: light a subsystem (`F` cycles), Cutaway (`X`), Strobe (multiple-exposure ghosts of the motion),
  Orbit and Tilt (or drag the stage), wheel to zoom, drag to pan when zoomed, double-click to reset, `Z` full window.
- **Range**: every shot flies in true scale to the target at its real distance; the inset magnifies the impact.
- `←` / `→` change engine, `G` opens the index of all engines, `T` switches theme, `M` toggles sound, `R` resets.

## Building

`node build.mjs` (Node 20+, no dependencies) bundles `vendor/anatomy/kit`, `src/engine` and `src/machines` into `index.html`
(`--dark` opens it in dark; `--only=08 --out=dev/08-trebuchet.html` builds one engine). `dev/` holds a
single-engine page for each machine. Each engine's own action keys are shown on its buttons and in the
plate's bottom-left corner. See `AUTHORING.md` for the machine API; `shots/` holds verification screenshots
and is not part of the repository.

## Credits

Drawn with the [Anatomy](https://github.com/wheresryan22/anatomy) isometric kit by Ryan
([@wheresryan22](https://x.com/wheresryan22)), MIT licensed; the kit files used are vendored in
`vendor/anatomy/` with their licence.

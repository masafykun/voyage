# VOYAGE — 航宙

A scroll-driven cinematic 3D voyage through space. One page, no clicks — your
scroll position becomes a camera flying from a planet's atmosphere, out through
orbit, into a coloured nebula, across a hyperspace jump, and finally to the
glowing core of a distant galaxy.

**Live:** https://voyage.1qaz.jp

![Atmosphere](docs/01-atmosphere.png)

---

## The journey

Scroll maps to a single normalised progress value `p ∈ [0, 1]` that drives the
camera along a track and cross-fades five scenes:

| # | Chapter | What you see |
|---|---------|--------------|
| 01 | 大気圏 · ATMOSPHERE | A glowing home planet with a procedural surface, an additive atmosphere shell, and the sun flaring just off its limb. |
| 02 | 軌道 · ORBIT | The camera pulls in low over the planet; the atmospheric rim glows along the terminator. |
| 03 | 星雲 · NEBULA | You fly past the heart of a magenta–violet–cyan gas cloud built from thousands of additive points. |
| 04 | 跳躍 · WARP | Stars stretch into radial streaks — a classic hyperspace jump. |
| 05 | 銀河 · GALAXY | Arrival: a tilted logarithmic-spiral galaxy with a bright core and blue outer arms. |

| Orbit | Nebula |
|---|---|
| ![Orbit](docs/02-orbit.png) | ![Nebula](docs/03-nebula.png) |

| Warp | Galaxy |
|---|---|
| ![Warp](docs/04-warp.png) | ![Galaxy](docs/05-galaxy.png) |

---

## How it works

- **Smooth scroll** — [Lenis](https://github.com/darkroomengineering/lenis) drives an
  inertial scroll; the render loop reads `scroll / limit` each frame as `p`.
- **One camera, one track** — a piecewise-linear `z` track moves the camera from
  `z = 16` down to `z = −138`, passing the planet, threading the nebula, and
  approaching the galaxy. Pointer position adds a subtle parallax.
- **Everything is a shader** — stars, nebula and galaxy are GPU point clouds
  drawn with custom GLSL; the planet surface is procedural fbm built on Ashima
  3D simplex noise with a fresnel atmosphere; warp is a `LineSegments` layer
  whose tails are pushed back along `+z` by a single `uWarp` uniform.
- **Additive, tamed** — flying *through* additive point clouds normally blows out
  to white. Two tricks keep the colour: point size is clamped, and a near-fade
  (`smoothstep(1.5, 14.0, dist)`) dissolves points that get too close to the lens.
- **Bloom that breathes** — an `UnrealBloomPass` whose strength rises during the
  warp and galaxy and eases *down* inside the nebula so the cloud stays colourful.

## Tech stack

- [Three.js](https://threejs.org/) `0.184` + GLSL (`ShaderMaterial`, `EffectComposer`, `UnrealBloomPass`)
- [Lenis](https://github.com/darkroomengineering/lenis) smooth scroll
- [Vite](https://vitejs.dev/) build — pure static output, no backend

## Project structure

```
index.html        # overlay: brand, chapter captions, progress rail, scroll hint
src/
  main.js         # renderer, camera track, scroll → p, per-frame scene wiring
  shaders.js      # all GLSL (snoise, stars, warp, cloud, planet, atmosphere)
  stars.js        # background starfield + warp streak builder
  clouds.js       # nebula + spiral-galaxy point clouds
  planet.js       # planet surface + atmosphere shell + sun
  style.css       # overlay / typography / vignette
```

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/  (static, deploy anywhere)
```

## Controls

Just scroll. Move the pointer for a little parallax. That's the whole interface.

---

Built by [masafy](https://github.com/masafykun). Part of a small series of
generative / WebGL experiments alongside
[FLUX](https://github.com/masafykun/yuragi-flux) and
[ORB](https://github.com/masafykun/kodou-orb).

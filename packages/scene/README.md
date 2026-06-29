# @czap/scene

Turns a typed timeline declaration — video, audio, transition, and effect tracks — into a compiled scene that a deterministic runtime ticks frame by frame.

> Install this directly when you author video timelines to render through `@czap/remotion` or the `czap` CLI. If you're starting a new project, start with the [`liteship`](https://www.npmjs.com/package/liteship) package instead — it brings the whole stack.

## Install

```bash
pnpm add @czap/scene effect@4.0.0-beta.32
```

`effect` v4 is a required peer and only ships as a beta — install the pin above (any `>=4.0.0-beta.0` satisfies it).

## 30 seconds

```ts
import { Track, Beat, compileScene, type SceneContract } from '@czap/scene';

const scene: SceneContract = {
  name: 'intro',
  duration: 4000, // milliseconds
  fps: 30,
  bpm: 120,
  tracks: [
    Track.video('hero', { from: Beat(0), to: Beat(8), source: { id: 'hero' } }),
    Track.audio('bed', { from: Beat(0), to: Beat(8), source: 'intro-bed' }),
  ],
  invariants: [], // checks compileScene runs against the resolved contract
  budgets: { p95FrameMs: 16 },
  site: ['node'],
};

console.log(compileScene(scene).trackSpawns.length);
```

Logs `2` — one spawn per track. `compileScene` resolves each `Beat(n)` mark against the scene's bpm and fps (here `Beat(8)` becomes frame 120), runs every declared invariant, and reports all violations in one error. `Scene.runtime(compiled)` then builds a live, tickable handle.

## Where it sits

A layered authoring package: it sits on the ECS (entity-component-system) world from `@czap/core`, and shares its timeline contracts with the rest of the stack through `@czap/_spine` types. Beat detection is not here — it lives in `@czap/assets`; bring its sample-space markers into `scene.beats` with `resolveBeatProjectionToSceneBeats`. The Node-only dev server ships at the `@czap/scene/dev` subpath so browser and Worker bundles never touch it. See the [package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md) for the full layout.

## If it does nothing

Beat-synced effect tracks (`syncTo: syncTo.beat(...)`) tick but never pulse when `scene.beats` is empty — the sync system queries the world for beat entities and finds none, with no warning. The fix: detect beats with `@czap/assets`, convert them with `resolveBeatProjectionToSceneBeats`, and set the result as `scene.beats` before `compileScene`.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Reference scene](https://github.com/freebatteryfactory/LiteShip/blob/main/examples/scenes/intro.ts) — a full music-video intro: envelopes, transitions, beat sync
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/scene/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.

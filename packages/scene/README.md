# @liteship/scene

Turns a typed timeline declaration — video, audio, transition, and effect tracks — into a compiled scene that a deterministic runtime ticks frame by frame.

> Install this directly when you author video timelines to render through `@liteship/remotion` or the `liteship` CLI. If you're starting a new project, start with the [`liteship`](https://www.npmjs.com/package/liteship) package instead — it brings the whole stack.

## Install

```bash
pnpm add @liteship/scene
```

## 30 seconds

```ts
import { Track, Beat, compileScene, type SceneContract } from '@liteship/scene';

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

A layered authoring package: it builds on the typed projection/execution substrate at `@liteship/core/ecs`, and shares its timeline contracts with the rest of the stack through `@liteship/_spine` types. Beat detection is not here — it lives in `@liteship/assets`; bring its sample-space markers into `scene.beats` with `resolveBeatProjectionToSceneBeats`. The Node-only dev server ships at the `@liteship/scene/dev` subpath so browser and Worker bundles never touch it. See the [package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md) for the full layout.

## If it does nothing

Beat-synced effect tracks (`syncTo: syncTo.beat(...)`) tick but never pulse when `scene.beats` is empty — the sync system queries the world for beat entities and finds none, with no warning. The fix: detect beats with `@liteship/assets`, convert them with `resolveBeatProjectionToSceneBeats`, and set the result as `scene.beats` before `compileScene`.

## Authored-motion adapter

`MotionSampleSystem(frameIndex)` is the Scene adapter for the shared motion kernel. Each selected entity carries its own admitted `RuntimeWritePlanPart` and `FrameRangePart`; the system samples that plan at entity-local time and writes one typed `MotionSamplePart`. `sampleSceneMotion(plan, t)` is the pure aggregate projection used by the differential oracle. Free-string `MotionProgram` queries, dynamic `motion:<cssVar>` component names, and closure-global plans are not part of the runtime contract.

This is **additive** to `TransitionSystem`, not a merge. `TransitionSystem`'s typed `BlendPart` is a video-**crossfade** mix factor between two `BetweenPart` entities — a different concept from an authored runtime write plan. Both coexist on one world. A differential oracle proves the Scene leg renders identically to browser CSS, the browser runtime floor, Stage, Remotion, and Worker.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Reference scene](https://github.com/freebatteryfactory/LiteShip/blob/main/examples/scenes/intro.ts) — a full music-video intro: envelopes, transitions, beat sync
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/scene/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — distributed as `@liteship/*` packages.

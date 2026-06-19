# ADR-0009: ECS as Scene Composition Substrate

**Status:** Accepted
**Date:** 2026-04-23

## Context

Scene composition needs a structure that is (a) declaratively authored, (b) statically walkable for verification, (c) flexible enough to model video tracks, audio tracks, transitions, effects, and sync anchors without forcing a nested hierarchy, and (d) performant on a per-frame hot path.

`@czap/core` already ships an ECS (`packages/core/src/ecs.ts`) with content-addressed entity ids, dense `Float64Array`-backed component stores (zero-allocation per tick), regular + dense system flavors, and four existing test lanes (`tests/unit/core/ecs-dense.test.ts`, `tests/integration/ecs-composition.integration.test.ts`, `tests/property/ecs-composable.prop.test.ts`, `tests/component/ecs-composable-world.test.ts`). Before this ADR it was used only for runtime bookkeeping.

## Decision

Scenes are ECS worlds. The internal expression of a `sceneComposition` capsule is a `World` populated by the scene compiler (`packages/scene/src/compile.ts`). Track helpers (`Track.video`, `Track.audio`, `Track.transition`, `Track.effect`) compile at declare time to entity seeds + system registrations.

Per-frame hot paths use dense `Part` stores (`Part.dense('Opacity', N)`, `Part.dense('Volume', N)`, etc.) for zero-alloc iteration. The runtime ECS and the scene ECS share the same substrate.

## Consequences

- Scenes inherit the zero-allocation hot-path discipline documented in ADR-0002.
- Music-video-style composition (transitions, sync anchors, multimodal effects) maps naturally to entity/component/system triads.
- Adding a new Track kind requires an ADR amendment (same closure rule as the assembly catalog in ADR-0008).
- Property tests walk the entity seed statically; generated scene harnesses derive determinism, sync-accuracy, and per-frame-budget checks from the world schema.
- Task 33-35 introduced two additive ECS primitives to make the pattern ergonomic: `World.setComponent(id, name, value)` for schema-free write-back, and entity query results that spread component values as direct properties alongside the `.components` Map. Both are backward-compatible; existing ECS consumers are unaffected.
- The authoring sugar promised by the Spec 1 design (§5.1/§5.3/§5.4) is wired through the same compile-to-components path: track `from`/`to` accept `Beat(n)` marks (`FrameMark`) that `compileScene` resolves to frame indices via scene BPM/fps BEFORE invariants run; `fade.in`/`fade.out`/`pulse.every` declarations compile to pre-resolved `Envelope` components read by VideoSystem (`_opacity`), AudioSystem (`_gain`), and EffectSystem (`_intensity`); transition `ease:` tags compile to an `Ease` component TransitionSystem maps through the closed easing catalog. Sugar catalogs follow the same cap-the-catalog closure rule — new envelope curves or easings require an ADR amendment.

## Amendment (0.4.0) — scenes are a LIVE runtime consumer

Through 0.3.x, a scene's only consumer was `@czap/stage` (offline dual-export to video). 0.4.0 makes the same ECS world a **live** runtime surface via `@czap/astro`'s `bridgeSceneToGraph(scene, handle, …)`: an rAF/signal clock ticks the systems, and the bridge splits the output by kind — a **discrete** state crossing (a `TransitionSystem` blend passing its midpoint, or the active pose changing) emits a `GraphPatch` to the live DocumentGraph runtime (re-cast through `castGraphDelta`), while the **continuous** tween value writes a leaf CSS var / GPU uniform each frame and **never** patches the graph (which would re-seal 60×/s). The `SVGSystem` egress (`applySvgAttrs`) is likewise applied to the live DOM by the `client:svg` directive. So the scene path is now dual: video (via `@czap/stage`) and live DOM/GPU (via `@czap/astro`). The discrete/continuous split is the load-bearing invariant — see [ADR-0015](./0015-document-graph-ir.md) for the runtime graph loader it feeds.

## Supporting evidence

- `packages/core/src/ecs.ts` (`_makeWorld` at L187; namespace export `World.make` is wired downstream of this declaration)
- `packages/scene/src/compile.ts`: introduced with this ADR; resolves `Beat()` marks, envelope spans, and ease tags into pure-data components at compile time
- `packages/scene/src/systems/*.ts`: 6 canonical systems (VideoSystem, AudioSystem, TransitionSystem, EffectSystem, SyncSystem, PassThroughMixer)
- `packages/scene/src/sugar/{beat,envelope,ease}.ts`: authoring sugar (`Beat`/`resolveFrameMark`, `fade`/`pulse`/`envelopeFactor`, `ease`/`easeFnFor`) consumed by `compileScene` and the canonical systems
- `examples/scenes/intro.ts`: reference music-video scene proving end-to-end composition, authored in `Beat()` musical time with envelope + ease sugar
- `tests/integration/scene-intro-example.test.ts`: validates 6-entity world compilation + structural determinism
- `tests/integration/scene-sugar-wiring.test.ts`: validates Beat-resolved ranges, envelope `_opacity`/`_gain` modulation, and eased `_blend` across live runtime ticks

## References

- `docs/adr/0002-zero-alloc.md` — zero-alloc discipline that scene tick inherits
- `docs/adr/0008-capsule-assembly-catalog.md` — capsule arm catalog this ADR adds `sceneComposition` to

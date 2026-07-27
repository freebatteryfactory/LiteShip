# ADR-0009: ECS as Scene Composition Substrate

**Status:** Accepted
**Date:** 2026-04-23

## Context

Scene composition needs a structure that is (a) declaratively authored, (b) statically walkable for verification, (c) flexible enough to model video tracks, audio tracks, transitions, effects, and sync anchors without forcing a nested hierarchy, and (d) performant on a per-frame hot path.

`@liteship/core/ecs` ships the projection/execution substrate: minted `Part<T>` identities, strict value admission, declared regular and dense system authority, and `Float64Array`-backed stores for zero-allocation per-tick work. Scene is its primary frame-driven consumer. The document graph remains the sealed and replayable state authority; ECS carries continuous execution that must not re-address the graph every frame.

## Decision

Scenes are ECS worlds. The internal expression of a `sceneComposition` capsule is a `World` populated by the scene compiler (`packages/scene/src/compile.ts`). Track helpers compile at declaration time to admitted entity seeds, and the runtime registers the canonical typed systems.

Per-frame hot paths may use Part-owned dense stores for zero-allocation iteration. The same typed substrate also supports sparse admitted values when a semantic component is not a numeric dense lane.

## Consequences

- Scenes inherit the zero-allocation hot-path discipline documented in ADR-0002.
- Music-video-style composition (transitions, sync anchors, multimodal effects) maps naturally to entity/component/system triads.
- Adding a new Track kind requires an ADR amendment (same closure rule as the assembly catalog in ADR-0008).
- Property tests walk the entity seed statically; generated scene harnesses derive determinism, sync-accuracy, and per-frame-budget checks from the world schema.
- Component identity is never a free string. `definePart` binds a name to one schema, `admitPart` owns the unknown-value boundary, and `defineSystem` / `defineDenseSystem` declare exactly which Parts may be queried, read, or written.
- The feature-edge census derives component producers and consumers from the same Part and system catalogs that execute, so an orphan such as the historical `MotionProgram` query is either reported or structurally impossible to spell.
- The authoring sugar promised by the Spec 1 design (§5.1/§5.3/§5.4) is wired through the same compile-to-components path: track `from`/`to` accept `Beat(n)` marks (`FrameMark`) that `compileScene` resolves to frame indices via scene BPM/fps BEFORE invariants run; `fade.in`/`fade.out`/`pulse.every` declarations compile to pre-resolved `Envelope` components read by VideoSystem (`_opacity`), AudioSystem (`_gain`), and EffectSystem (`_intensity`); transition `ease:` tags compile to an `Ease` component TransitionSystem maps through the closed easing catalog. Sugar catalogs follow the same cap-the-catalog closure rule — new envelope curves or easings require an ADR amendment.

## Amendment (0.4.0) — scenes are a LIVE runtime consumer

Through 0.3.x, a scene's only consumer was `@liteship/stage` (offline dual-export to video). 0.4.0 made the same ECS world a **live** runtime surface via `@liteship/astro`'s scene bridge: an rAF/signal clock ticks the systems, and the bridge splits the output by kind. A **discrete** state crossing emits a `GraphPatch` to the live document graph, while the **continuous** tween value writes a leaf CSS variable or GPU uniform each frame and **never** patches the graph. The `SVGSystem` egress is likewise applied to the live DOM by the `client:svg` directive. The discrete/continuous split is the load-bearing invariant; ECS is the execution substrate, not a competing persistence model.

## Supporting evidence

- `packages/core/src/ecs/runtime.ts` and the explicit `@liteship/core/ecs` subpath
- `packages/scene/src/compile.ts`: introduced with this ADR; resolves `Beat()` marks, envelope spans, and ease tags into pure-data components at compile time
- `packages/scene/src/parts.ts` and `packages/scene/src/systems/*.ts`: the canonical Part and system catalogs
- `packages/scene/src/sugar/{beat,envelope,ease}.ts`: authoring sugar (`Beat`/`resolveFrameMark`, `fade`/`pulse`/`envelopeFactor`, `ease`/`easeFnFor`) consumed by `compileScene` and the canonical systems
- `examples/scenes/intro.ts`: reference music-video scene proving end-to-end composition, authored in `Beat()` musical time with envelope + ease sugar
- `tests/integration/scene-intro-example.test.ts`: validates 6-entity world compilation + structural determinism
- `tests/integration/scene-sugar-wiring.test.ts`: validates Beat-resolved ranges, envelope `_opacity`/`_gain` modulation, and eased `_blend` across live runtime ticks

## References

- `docs/adr/0002-zero-alloc.md` — zero-alloc discipline that scene tick inherits
- `docs/adr/0008-capsule-assembly-catalog.md` — capsule arm catalog this ADR adds `sceneComposition` to

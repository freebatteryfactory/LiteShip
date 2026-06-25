# ADR-0021 — Scene → live-runtime bridge: discrete crossing vs continuous tween

**Status:** Accepted
**Date:** 2026-06-25

## Context

`@czap/scene` was an OFFLINE consumer: a signal-indexed ECS scene drove video encodes and deterministic simulation, never the live DOM. The 0.4.0 runtime spine ([ADR-0020](./0020-document-graph-runtime.md)) made the DocumentGraph a runtime citizen, which opened the question: can a scene drive the LIVE runtime too? The hazard is rate. A scene ticks every frame, and most of that motion is a CONTINUOUS tween (an eased blend value moving 0→1). If every frame fed a `GraphPatch` to the graph, the graph would re-seal 60×/s — destroying the content-addressing the IR exists for ([ADR-0020](./0020-document-graph-runtime.md)). But SOME scene output is a genuine STATE change (the active pose flips), which the graph SHOULD record. The two cannot be handled the same way.

## Decision

`bridgeSceneToGraph` composes the runtime graph handle with a scene handle and routes the scene's per-track output across ONE design boundary, split by KIND:

- **DISCRETE — a state crossing.** A transition blend passing 0→1 (the active pose flips from the "from" side to the "to" side). This is SPARSE. On a crossing the bridge builds a MINIMAL `GraphPatch` re-pointing the owning entity's pose to the new state and feeds it to the graph handle's `recast` — flipping `data-czap-state` through the exact same delta seam `client:satellite` drives. The graph is re-sealed ONLY on a crossing.
- **CONTINUOUS — the in-between tween.** The eased `_blend` value, which moves EVERY frame. The bridge writes it to a `--czap-*` CSS custom property AND dispatches a `czap:uniform-update` GPU uniform on the resolved leaf element directly. This NEVER touches the graph.

Put plainly: the discrete crossing is a graph mutation; the continuous tween is a leaf write. `bridgeSceneToGraph` `recast`s ONLY on a crossing and NEVER on a continuous frame. Element resolution reuses the runtime spine's `EntityElementResolver`, so the host owns the entity→element mapping exactly as the graph loader does; the loop is SSR-safe (no `requestAnimationFrame` off-DOM).

## Consequences

- `@czap/scene` is now a LIVE runtime consumer, not only an offline video/DST producer — the same scene definition can drive the page.
- The graph re-seals only on semantic state changes (rare), so content-addressing survives a 60fps scene; per-frame motion is a cheap leaf write that never invalidates the IR.
- `data-czap-state` flips through the SAME delta seam as every other cast, so author CSS keyed on state works identically whether the crossing came from a scene, a signal, or an AI patch.
- The discrete/continuous split is the LAW under test — a bridge that patched the graph on a continuous frame would be caught by the re-seal-rate it implies.

## Evidence

- `packages/astro/src/runtime/scene-bridge.ts` — `bridgeSceneToGraph`, the discrete/continuous router.
- `packages/scene/src/index.ts` — `SceneRuntimeHandle`, `applySvgAttrs` (the per-frame leaf writers).
- `packages/astro/src/runtime/graph-runtime.ts` — the `recast` delta seam the discrete path drives.

## Rejected alternatives

- **Feed every scene frame to the graph as a patch.** Re-seals the graph 60×/s, defeating content-addressing; only discrete crossings patch.
- **Write discrete crossings to a CSS var too (skip the graph).** The graph would no longer record the authored state, breaking state-keyed CSS and any consumer reading the live graph; a crossing IS a graph mutation.
- **A separate scene-only render path (don't reuse the cast pipeline).** Two code paths for `data-czap-state` would drift; reusing `recast` keeps one delta engine.

## References

- [ADR-0020](./0020-document-graph-runtime.md) — the runtime spine + delta seam this composes onto.
- [ADR-0009](./0009-ecs-scene-composition.md) — `@czap/scene` as the ECS composition substrate.

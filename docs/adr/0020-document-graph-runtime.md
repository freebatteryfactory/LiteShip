# ADR-0020 — DocumentGraph runtime lifecycle

**Status:** Accepted
**Date:** 2026-06-25

## Context

[ADR-0015](./0015-document-graph-ir.md) established the DocumentGraph as the build-time IR — the content-addressed, sealed document the compiler lowers. But the runtime only ever saw the COMPILED output (the boundary manifest `client:satellite` hydrates); the graph itself stopped at build time. The 0.4.0 direction (what began as the "live-runtime cut") needed the graph to be a first-class RUNTIME citizen: a sealed graph that can be serialized, shipped, loaded onto the live cast pipeline, and MUTATED at runtime (the prerequisite for the Scene→live bridge, [ADR-0021](./0021-scene-live-bridge.md), and the AI-apply seam, [ADR-0022](./0022-ai-apply-seam.md)). The hazard: a runtime graph loader consumes UNTRUSTED JSON, and re-casting a whole graph every frame would re-seal it 60×/s, defeating the content-addressing the IR exists for.

## Decision

`loadGraphRuntime` lowers a serialized graph onto the EXISTING live cast pipeline (the one `client:satellite` already drives), and `castGraphDelta` re-casts only the entities a `GraphPatch` touched. The loader is a runtime PRIMITIVE, not an editor: the producer that SERIALIZES a graph is downstream/out of scope.

The load flow treats the input as untrusted: parse → `validateGraph` + per-node `isWellFormedNode` (the SAME trust gate the AI seam reads) → `sealGraph` (RE-ADDRESS; never trust the supplied id/digest) → `lowerGraph` → per binding seed the initial state and `attachSignalObserver`. A malformed/invalid graph returns `null` (the `parseBoundary` posture — degrade cleanly, never throw mid-hydration). The delta seam diffs `prev`/`next` and re-lowers ONLY the touched entities (detach their old observers, re-seed, re-attach); untouched entities keep their live observers, so the graph is re-sealed only when it actually changes. `castGraphDelta` is exported so the AI seam reuses the EXACT re-cast path — one delta engine, two callers. SSR-safe: observer attachment and element resolution are host-callback-guarded, so importing the module on the server is inert.

## Consequences

- The DocumentGraph is now a runtime citizen: it can be loaded, observed, and mutated live — the foundation the Scene→live bridge and the AI-apply seam both compose onto.
- Untrusted-input safety is structural: re-sealing on load means a forged id/digest in the serialized graph cannot survive, and the shared `isWellFormedNode` gate means the loader and the AI seam admit by the same rule.
- Re-cast cost tracks CHANGE, not frame rate: a delta re-lowers only touched entities, so content-addressing is preserved (the explicit reason the Scene bridge writes continuous tweens to leaves, never to the graph).
- The loader degrades to `null` rather than throwing — a bad graph yields no hydration, not a crashed page.

## Evidence

- `packages/astro/src/runtime/graph-runtime.ts` — `loadGraphRuntime`, `castGraphDelta`, `GraphRuntimeHandle`.
- `packages/core/src/document-graph.ts` — `sealGraph`/`sealNode` (re-address), `GraphPatch.diff`/`.apply`.
- `packages/astro/src/runtime/index.ts` — the `client:graph` directive entry point.

## Rejected alternatives

- **Re-cast the whole graph on every change.** Re-seals the graph on every mutation, destroying the content-addressing the IR exists for; the delta seam re-lowers only what changed.
- **Trust the serialized id/digest.** A forged content address would let untrusted JSON impersonate a sealed graph; re-sealing on load makes the supplied address advisory.
- **Throw on a malformed graph.** A bad runtime graph would crash hydration; returning `null` degrades cleanly, consistent with the `parseBoundary` posture.

## References

- [ADR-0015](./0015-document-graph-ir.md) — the build-time DocumentGraph IR this extends to runtime.
- [ADR-0021](./0021-scene-live-bridge.md), [ADR-0022](./0022-ai-apply-seam.md) — the two consumers of the runtime spine + delta seam.

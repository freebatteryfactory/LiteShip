# ADR-0005 — Effect boundary rules

**Status:** Accepted
**Date:** 2026-04-21

## Context

LiteShip uses Effect v4 for async composition, resource lifecycle, and streams. Effect has runtime overhead; per-frame compute and event handlers must be sync. We need explicit categories for where Effect is used and where it isn't.

## Decision

Six categorized patterns:

1. **Setup/teardown.** `Signal.make`, `Cell.make`, `Derived.make`, `Compositor.create`, `SSE.create` return `Effect<..., never, Scope.Scope>`. Scope releases resources on close.
2. **Hot loops plain JS.** `computeStateSync`, `Boundary.evaluate`, `DenseStore` iteration. No Effect on inner loops.
3. **Event-handler grounding.** DOM handlers sync-update state via `Effect.runSync(SubscriptionRef.set(ref, val))`. Sanctioned seam: browser events are sync; Effect owns the Ref.
4. **State-machine wrapping.** Long-lived machines model transitions as plain mutable state; Effect appears only at the Scope boundary and public reader accessors.
5. **Resource cleanup (finalizers).** Sync finalizer-side `runSync` (e.g. `Queue.shutdown(...).pipe(Effect.runSync)`).
6. **Hot-path reads.** Compositor short-circuits `quantizer.state` via optional sync `stateSync()`; `Effect.runSync` remains as a safety-net fallback.

## Consequences

- Predictable per-frame cost: no Effect on rAF inner loop.
- Resource safety at setup/teardown; no leaks.
- `runSync` sites are inspectable bridges, not a smell.

## Category decisions (final)

Phase B §5.7 audit outcome:

| Category | Sites | Decision |
|---|---|---|
| 1. Setup/teardown | `Signal.make`, `Cell.make`, `Derived.make`, `Compositor.create`, `SSE.create`, `Quantizer.*`, `AnimatedQuantizer.make` | Correct by design. |
| 2. Hot loops | (empty) | `Boundary.evaluate` at 71 ns / >10M ops/s confirms no Effect on hot path. |
| 3. Event-handler grounding | `signal.ts` ×6, `zap.ts` ×1, `timeline.ts` ×3, `detect.ts` ×1, `astro/stream.ts` ×2, `blend.ts` ×1, `video.ts` ×2, `quantizer.ts` ×1 | Sanctioned seam — kept + documented. |
| 4. State-machine wrapping | `sse.ts` — **refactored**, 17 → 0 runSync sites | Converted to plain-JS reducer (single mutable `machine` record). All 2481 tests pass. |
| 5. Resource cleanup | `wire.ts` ×2 (`Queue.shutdown.pipe(runSync)`) | Inherent — finalizer seam. |
| 6. Hot-path reads | `compositor.ts:207` (quantizer.state fallback), `compositor.ts:272` (SubscriptionRef.set for `changes` Stream) | `stateSync` added to `AnimatedQuantizer` — fallback only reached by bespoke Quantizers. `changes` Stream publish is the one unavoidable seam — consumers rely on `Stream<CompositeState>` contract. |

**Production `Effect.runSync` count:** 35 → 21 (17 eliminated by SSE refactor). All remaining sites are category-classified and policy-justified.

## Rejected alternatives

- **All-Effect everywhere**: per-frame overhead unacceptable at 120 fps.
- **All-plain-JS**: loses Scope-backed resource safety.
- **Compositor stateRef → plain-JS pub/sub**: would break `Stream<CompositeState>` public API; gain <1 µs/frame.

## References

- `packages/core/src/signal.ts`: event-handler seam
- `packages/core/src/compositor.ts`: setup via Effect, per-frame plain JS
- `packages/web/src/stream/sse.ts`: pure-reducer state machine
- `packages/core/src/wire.ts`: finalizer seam
- `packages/quantizer/src/animated-quantizer.ts`: `stateSync` short-circuit

## Addendum (2026-06-30) — SSE overflow policy + the directive SSE bridge

Extends Category 1 (setup/teardown) and Category 4 (state-machine wrapping) to the live `client:stream` / `client:llm` directives.

### Context

`SSE.create`'s bounded receive `Queue` silently drop-newested on saturation — the worst policy for a live tail, and unrecoverable (dropped events fall outside the replay gap window; `lastEventId` has already advanced). The buffer is multiplexed: an LLM token and an id-keyed DOM patch both arrive as `type:'patch'`. And the `client:stream` / `client:llm` directives hand-rolled raw `EventSource`, bypassing `SSE.create` entirely (zero production call sites).

### Decision

**(A3 — the primitive.)** A per-connection `OverflowPolicy` (`drop-newest | drop-oldest | coalesce-by-id`, default `coalesce-by-id`; `'block'` excluded — `onmessage` is a synchronous browser callback that cannot suspend) on `SSEConfig`. `coalesce-by-id` is selective: it supersedes an earlier same-id patch in place over the FIFO `Queue` (the `GraphPatch.diff` shape, not a `Map` store); `extractCoalesceKey` returns `null` for every keyless/ordered message (LLM tokens, `batch`/`snapshot`/`signal`/`receipt`/`heartbeat`), which bypass coalesce and keep strict FIFO — and the saturation fallback evicts the oldest KEYED entry before any ordered token. Backpressure source-of-truth is `Queue.sizeUnsafe`; `BackpressureHint` carries `policy`/`droppedCount`/`coalescedCount`; first saturation emits `Diagnostics.warnOnce('sse-buffer-saturated')`. A `stateChanges: Stream<SSEState>` edge stream is added; the heartbeat watchdog is fixed to actually reconnect (its `close()` never fired `onerror`).

**(A3b — the bridge.)** `client:stream` consumes `SSE.create` through its **synchronous** `onMessage`/`onStateChange` callbacks — `SSE.create` invokes them inside the `EventSource` `onmessage`/`setStatus` (after the mandatory `parseMessage` preflight), so a patch/snapshot/signal is morphed within the same dispatch turn it arrived in. `client:llm` keeps its raw `EventSource` and processes frames synchronously in `onmessage` with its own already-guarded `decodeLLMEventData` — the mandatory, red-team-tested `parseMessage` preflight drops the bare-string payloads the LLM token protocol relies on, so the LLM path deliberately does NOT route through `SSE.create`, and adds NO public decode bypass to the primitive (the preflight invariant holds by construction). `client:llm` terminal frames (server `error`, `done`) close the live `EventSource`, not just stop reading.

**Why synchronous, not an async drain.** The directives' message processing is timing-critical: the live morph and LLM token rendering must complete in the dispatch turn (the directive's own rAF batching owns render throttling), and the framework's directive tests assert exactly that. Consuming `SSE.create.messages` (an async `Stream`) on a forked fiber broke that contract — processing slipped a macrotask behind each `onmessage`. The synchronous callback path restores it. `client:stream` still owns a `Scope` (via `ManagedRuntime` + `Scope.provide`) **only** for the connection lifecycle — `Scope.close` disposes the `EventSource`, heartbeat timer, and Queue together on `dispose`/VT-swap — but runs **no** drain fibers; `client:llm` needs no Effect runtime at all. The overflow buffer is therefore a **primitive-only** feature for buffered async consumers: a synchronous consumer holds no buffer, so there is nothing to overflow (the `messages`/`stateChanges` Streams remain available for those consumers).

### Consequences

- The live-tail/morph path (`client:stream`) inherits unified reconnect/resumption + the heartbeat fix + clean Scope teardown (dispose / VT-swap single-boot), processing each message synchronously in-turn.
- Overflow applies to the buffered `Stream` path, not the synchronous directives (no buffer ⇒ nothing to overflow); the directives' own rAF batching bounds render work, and an LLM token flood is processed in order with nothing dropped.
- The patch-path `parseMessage` security preflight stays non-bypassable.
- Directive teardown is synchronous and deterministic — the lifecycle gate runs repeatedly and exits cleanly.

### Rejected alternatives

- A `Map<id,msg>` coalesce store — collapses all keyless messages into one slot and severs FIFO order.
- Coalescing by `type === 'patch'` — merges LLM tokens (same discriminant).
- A public `decode` bypass on `SSE.create` — would let any consumer turn off the security preflight.
- A `block` overflow policy — would suspend the synchronous `onmessage` seam.
- Consuming `SSE.create.messages` (an async `Stream`) on a forked fiber — slipped message processing a macrotask behind `onmessage` and broke the directives' synchronous morph/token contract (~30 directive tests + the live render timing). Replaced by the synchronous `onMessage`/`onStateChange` callback path; the buffered `Stream` remains for consumers that genuinely want async backpressure.

### Evidence (addendum)

- `packages/web/src/{types,stream/sse-pure,stream/sse}.ts`, `packages/_spine/web.d.ts`; `packages/astro/src/runtime/{stream,llm}.ts`.
- `tests/property/sse-overflow.test.ts`, `tests/component/sse-client.test.ts`, `tests/unit/astro/stream-llm-lifecycle.test.ts`.
- Precedent: `packages/scene/src/runtime.ts` (imperative Scope bridge).

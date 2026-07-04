# ADR-0031 — Mutation clients and form bindings are rigging, not components

**Status:** Accepted
**Date:** 2026-07-04

## Context

ADR-0030 shipped the server-side return leg: a client can propose a `GraphPatch`, and the server validates it through the AI-cast refuse-seam before applying. The client side still repeated the same boilerplate at every call site: keep the current base, propose ops, send the patch, detect stale-base refusals, reload the host's base, retry once, then reflect the outcome into DOM. Example 06 made the drift visible because the educational page had to hand-roll the state machine before it could teach the channel.

The same pressure exists for forms, but LiteShip cannot cross the boundary into a data-grid, a component kit, or a form generator. The host owns the markup, the domain projection from `FormData` to sealed graph nodes, and the error UI. LiteShip owns the rig: event -> ops -> channel -> outcome.

## Decision

Ship `createGraphMutationClient` in `@czap/core` as the DOM-free client-side state half of the channel. It owns the current base, serializes submits in call order, advances the base on `applied`, and treats `refused` with `staleBase: true` as a bounded reload + re-propose loop when the host supplies `refreshBase`. The reload endpoint shape remains host-owned. Every failure maps to the channel's one response family; the client never throws.

Ship `bindGraphForm` in `@czap/web` as the thin DOM binding over that client. It captures `FormData` at submit time, runs the host's `toOps(data, base)` inside the client's submit builder, sets `data-czap-mutation-state`, and dispatches `czap:mutation` with the exact response. It renders no errors and writes no domain UI. A thrown ops builder is loud through `Diagnostics.warn`, because a silent submit that never becomes a patch is worse than a refused patch.

Ship `adoptAppliedGraph` in `@czap/astro/runtime` as the live-runtime counterpart. It accepts an unknown wire graph from a successful mutation response, proves it through `verifyAppliedGraph`, and advances the live graph runtime so `castGraphDelta` re-casts the changed cells. `adopt` absorbs missed intervening updates by diffing current -> next; it does not require the applied graph to descend from the current client base.

The wire refusal now carries structured stale-base information: `GraphMutationResponse` may return `{ status: 'refused', staleBase: true }`, and `graphMutationRoute` maps that case to HTTP 409. Invalid fresh proposals remain 422. Clients branch on the body shape, not string-matched messages or status text.

## Consequences

- A host can build a form-backed mutation without reimplementing base tracking, stale retry, or outcome events.
- The retry boundary stays finite and explicit. `maxStaleRetries` defaults to one only when `refreshBase` exists; no unbounded loop can hide a bad projection.
- `bindGraphForm` is intentionally not a schema-to-form system, two-way binding DSL, or component library. It is a bridge from a host-authored form to one validated graph-patch seam.
- Live runtimes can adopt server-applied graphs through the same guard the sender uses, so a forged applied graph is rejected before it reaches the cast pipeline.
- HTTP 409 is now meaningful for lost-update/stale-base refusals, while the JSON body remains the contract for transport-agnostic clients.

## Evidence

- `packages/core/src/graph-mutation-client.ts` — serialized client state machine, stale retry, never-throw contract.
- `packages/web/src/mutation/graph-form.ts` — form submit binding, state attribute, `czap:mutation` event, loud ops-builder failures.
- `packages/core/src/graph-mutation.ts` — `staleBase` response shape and shared `verifyAppliedGraph` guard.
- `packages/astro/src/graph-mutation-route.ts` — 409 for stale-base refusals.
- `packages/astro/src/runtime/graph-ai-apply.ts` — `adoptAppliedGraph` advancing the live runtime.
- `examples/06-mutation-roundtrip/` — runnable proof that the example no longer owns the boilerplate state machine.
- `tests/unit/core/graph-mutation-client.test.ts`, `tests/unit/web/graph-form.test.ts`, `tests/unit/astro/graph-ai-apply.test.ts`, `tests/unit/astro/graph-mutation-route.test.ts`.

## Rejected alternatives

- **A two-way `bind` DSL.** It would own domain projection and UI reflection. That crosses the rig/component boundary and turns LiteShip into a form framework.
- **Auto-generated forms from schemas.** The host's form markup, labels, validation presentation, and sealed-node projection are product code. LiteShip supplies the mutation seam, not the component catalog.
- **Unbounded stale retries.** A bad projection or a moving base would spin under load. One bounded retry with a host-owned reload path makes the recovery explicit.
- **String-match refusal messages.** The server knows stale-base and CAS-miss cases first-class. The wire carries `staleBase: true`; clients never infer it from prose.

## References

- [ADR-0014](./0014-genui-catalog.md) — the generated UI catalog boundary: closed catalog renderer, not a general component framework.
- [ADR-0015](./0015-document-graph-ir.md) — the host owns graph authority and persistence.
- [ADR-0020](./0020-document-graph-runtime.md) — live runtime advance and delta recast.
- [ADR-0030](./0030-client-server-mutation-channel.md) — the server-side mutation channel this completes on the client side.

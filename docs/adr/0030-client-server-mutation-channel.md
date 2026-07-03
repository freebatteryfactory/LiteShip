# ADR-0030 — Client→server graph-mutation channel (the return leg)

**Status:** Accepted
**Date:** 2026-07-03

## Context

LiteShip's live surface is one-directional: the stream pushes server→client (SSE), and the runtime re-casts a delta on each patch ([ADR-0020](./0020-document-graph-runtime.md)). The return leg was missing — a client (a human editing a dashboard: a sort, a filter, an inline edit) had no first-class way to propose a change BACK to the server's graph. Products were left to hand-roll an endpoint that decodes a patch and applies it, which is exactly where validation gets skipped: a raw `GraphPatch.apply` on the server trusts the client's bytes and mis-applies a forged content address, a dangling edge, or a stale base. The AI-apply seam ([ADR-0022](./0022-ai-apply-seam.md)) already made that bypass impossible for a MODEL's proposal; a human client's edit deserves the identical guarantee, over HTTP.

## Decision

Ship the mutation channel as a transport-agnostic core handler plus a host-owned store, reusing the AI-cast refuse-seam verbatim. `handleGraphMutation(request, store)` (`@czap/core`) decodes the untrusted patch, loads the host's current graph, runs it through `validateGraphPatchProposal → applyValidatedPatch` (the SAME validators an AI proposal clears), and persists via a host-supplied `GraphStore`. It returns exactly one of three shapes — `applied` (the new sealed graph), `refused` (the patch did not validate), or `error` (a server-side store failure) — and NEVER throws. `saveGraph(next, expected)` is a compare-and-swap: it commits only if the store still holds the base the patch was validated against, so two clients racing the same base cannot lose-update — optimistic concurrency falls out of content addressing for free. The core is pure transport-glue over the existing seam: no new validation, no persistence, no network. `@czap/astro`'s `graphMutationRoute(store)` wraps the handler into a plain `(request) => Response`; it injects no route of its own — the host mounts the endpoint, owns the `GraphStore`, and thus owns the authority ([ADR-0015](./0015-document-graph-ir.md)). The route requires `Content-Type: application/json`, forcing any cross-origin POST through a CORS preflight so a simple-request cannot smuggle a patch to a cookie-authed mount.

## Consequences

- `GraphPatch` now has THREE mutator paths — the editor, the AI cast, and a remote client over HTTP — and NONE can bypass validation: the server re-seals and re-pins `base` on every proposal, whatever the source.
- Optimistic concurrency is a property of the model, not bolted on: a stale-base proposal or a lost-update race is `refused` byte-for-byte, with the store untouched.
- The host keeps full authority: LiteShip provides the channel and the gate, never the persistence or the auth. A `GraphStore` error's message surfaces to the client (loud, debuggable — a blanket "internal error" would strand a host debugging a failed mutation), so a store whose errors could carry secrets must redact inside the store.
- `refused` (the client's patch was wrong — reload and re-propose) is distinct from `error` (a server fault — retryable), so a client reacts correctly instead of blindly retrying.
- The channel is one narrow, typed seam — a validated graph patch — not a general RPC / server-action framework; LiteShip's non-goals are unchanged.
- Everything a patch carries is JSON-faithful by construction, so a policy patch survives the wire intact. `CapSet.levels` is a canonical deduped, ladder-sorted ARRAY, not a `Set` — a `Set` `JSON.stringify`s to `{}` (silent loss) and its insertion order mis-addressed the same logical set — and a policy node's `grants` is now a VALIDATED CapSet schema (not opaque) that also requires the levels be canonical (deduped, ladder-sorted), so a malformed OR non-canonical grants is rejected by `isWellFormedNode` at the root — an untrusted client cannot seal a wire-ordered CapSet under a divergent content address. The corruption is designed out; no sender-side wire-safety fence is needed.

## Evidence

- `packages/core/src/graph-mutation.ts` — `handleGraphMutation`, `sendGraphMutation`, the `GraphStore` CAS, the three-outcome response.
- `packages/astro/src/graph-mutation-route.ts` — `graphMutationRoute`, the 200 / 422 / 415 / 400 mapping + the `application/json` CSRF gate.
- `examples/06-mutation-roundtrip/` — a runnable SSR app proving the round-trip end to end (client proposes → server validates + applies + persists → a stale re-proposal is refused).
- `tests/unit/core/graph-mutation.test.ts`, `tests/unit/astro/graph-mutation-route.test.ts` — CAS race, stale-base refusal, transport/shape failures, the content-type gate.

## Rejected alternatives

- **Apply a raw `GraphPatch` on the server (trust the client to have validated).** The catastrophic case ADR-0022 already ruled out — a forged address or stale base mis-applied. Demanding the patch clear `validateGraphPatchProposal → applyValidatedPatch` makes validation non-optional on the return leg too.
- **`@czap/astro` injects the route.** Removes the host's control of the URL, the auth in front of it, and the store behind it — the authority ADR-0015 places with the host. The channel ships the handler; the host mounts it.
- **Last-write-wins persistence.** Two clients racing the same base silently lose one edit. The compare-and-swap on `saveGraph` refuses the loser cleanly instead.
- **Accept any content type on the route.** `Request.json()` parses `text/plain`, so a cross-site simple-request could smuggle a patch with no preflight; requiring `application/json` restores the preflight guarantee. It does not replace host session/origin auth — that stays the host's.

## References

- [ADR-0015](./0015-document-graph-ir.md) — the document graph IR + the authority boundary (the host owns the store).
- [ADR-0022](./0022-ai-apply-seam.md) — the un-bypassable validate→apply seam this extends from a model proposal to a remote human client.
- [ADR-0020](./0020-document-graph-runtime.md) — the runtime delta seam the applied graph re-casts through.
- `packages/core/src/graph-mutation.ts`, `packages/astro/src/graph-mutation-route.ts` — the channel implementation.

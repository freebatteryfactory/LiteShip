# ADR-0022 — AI-apply seam: the un-bypassable validate→apply token witness

**Status:** Accepted
**Date:** 2026-06-25

## Context

[ADR-0015](./0015-document-graph-ir.md) defined the AI cast ENVELOPE — the graph→AIContext projection and the `GraphPatch` proposal validators — as a build-time/editor primitive. The 0.4.0 runtime spine ([ADR-0020](./0020-document-graph-runtime.md)) made it possible to apply a model's proposed patch to a LIVE graph. That is exactly where the danger is: an AI-proposed mutation that reaches the runtime WITHOUT going through validation is the catastrophic case (a forged content address, a dangling edge, a base mismatch silently mis-applied). The governing LiteShip rule is "LiteShip teaches graphs how to speak to models; products decide whether model suggestions become action" — so the thing that CALLS a model is downstream, but the seam that ADMITS a model's output must make bypassing validation IMPOSSIBLE, not merely discouraged.

## Decision

The seam exposes exactly two casts and imports zero model/provider/credential API: `castGraphContext(handle)` builds the model-facing `AIContext` from the live graph (cast OUT), and `admitGraphPatchProposal(handle, candidate)` validates an untrusted candidate against the live graph and, on success, applies it + re-casts the delta (cast IN).

Bypass is impossible by a TOKEN WITNESS, the same unforgeable-capability shape as the FactGate WeakSet ([ADR-0019](./0019-factgate-evidence-bound-gates.md)). `applyValidatedPatch`'s signature DEMANDS a `ValidatedProposal`, and the mint site (`mintValidated`) is NOT re-exported from `@czap/core` — so the only way to obtain one is to run the validators, which re-pin `base`, re-seal every node (defeating content-address forgery), and run the structural preview before minting. The admit path then re-casts through the runtime delta seam (`castGraphDelta`), NOT through `recast`'s raw `GraphPatch.apply`, which would skip the witness. Two further guards: validate and apply run back-to-back with NO `await` between them (a concurrent graph advance cannot slip a stale base through), and `applyValidatedPatch` re-asserts `proposal.base === graph.id` at apply time (a proposal validated against a since-advanced graph is rejected cleanly, not mis-applied).

## Consequences

- An AI-proposed mutation CANNOT reach the runtime graph without validation — the `ValidatedProposal` token is unforgeable outside the validators, so the admit seam structurally cannot apply an unvalidated patch.
- LiteShip ships the SEAM, not the producer: zero model/provider/credential code, so the same seam serves any model integration a downstream product builds, and authority over "should this suggestion act" stays with the host.
- Forged content addresses and stale bases are defeated by construction (re-seal on validate; base re-assert at apply; no `await` window).
- The cast-out path is pure (build context anywhere); the cast-in path is the only mutation door, and it is guarded.

## Evidence

- `packages/astro/src/runtime/graph-ai-apply.ts` — `castGraphContext`, `admitGraphPatchProposal`, the token-witness flow.
- `packages/core/src/ai-cast.ts` — `validateGraphPatchProposal`, `applyValidatedPatch`, `ValidatedProposal`.
- `packages/core/src/index.ts` — `mintValidated` deliberately NOT re-exported ("the envelope stays un-forgeable outside the validators").

## Rejected alternatives

- **Apply a raw `GraphPatch` directly (trust the caller to validate first).** A caller that forgets validation mis-applies a forged/dangling patch; demanding a `ValidatedProposal` token makes the validator non-optional.
- **Re-export `mintValidated` for convenience.** Any holder could mint a fake "validated" proposal — the token stops being a witness. Keeping the mint private is what makes it unforgeable.
- **`await` between validate and apply (e.g. a host hook).** Opens a window for a concurrent advance to invalidate the base; the back-to-back run + base re-assert closes it.

## References

- [ADR-0015](./0015-document-graph-ir.md) — the AI cast envelope this extends to the live runtime.
- [ADR-0019](./0019-factgate-evidence-bound-gates.md) — the same unforgeable-capability pattern (WeakSet there, private mint here).
- [ADR-0020](./0020-document-graph-runtime.md) — the delta seam the admit path re-casts through.

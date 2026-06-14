# ADR-0015 — Document graph IR + AI cast envelope

**Status:** Accepted
**Date:** 2026-06-14

## Context

Through ADR-0006 the compiler casts a definition to many targets (CSS, GLSL, WGSL, ARIA, AI, Tailwind), and ADR-0003 makes every output a function of a content address. But "the definition" had no single typed shape: each cast read boundaries, tokens, themes, and styles in its own way, and there was no addressable object a future producer (an editor, an AI cast) could *mutate* and re-cast. Without that object, two things stay impossible: proving that all casts of one definition share one source, and accepting an outside proposal (model output, editor edit) against a graph without hand-rolling validation per call site.

A second force: the AI cast is a framework **primitive**, not a producer. LiteShip must be able to summarize a definition for a model and accept the model's reply *without* importing a provider, making a network call, or ever letting raw model output reach a mutation. The envelope has to live in `@czap/core`; the model call lives in the host product built on top.

## Decision

Introduce the **document graph** as `@czap/core`'s canonical IR: a graph of typed nodes in eight families (`signal`, `entity`, `component`, `pose`, `transition`, `projection`, `policy`, `export`), each addressed by the content hash of its canonical CBOR bytes (FNV-1a, ADR-0003). `sealNode` / `sealGraph` mint addresses; `validateGraph` / `linearizeGraph` check and topologically order; `GraphPatch` is the only typed mutation path (propose -> validate -> apply -> re-seal). Every cast target reads from the sealed graph.

Layer the **AI cast** on the same graph as a pure envelope: `AICast.castContext` produces a deterministic, token-budgeted `AIContext`; a reply returns as a `GraphPatch` proposal that `validateGraphPatchProposal` (or `validateGeneratedUIProposal` for genui trees) turns into a `ValidatedProposal` carrying an unforgeable `ApplyToken`. `applyValidatedPatch` is the sole consumer of that envelope. The minter (`mintValidated`) is denied at the package subpath (`"./validated-output": null`) so no consumer can forge a proposal.

## Consequences

- "Computed from a content address of the definition" is now literal and structural: change one node, its address changes, and only dependent casts recompute. Identity across casts is provable (the F capsule, `core-graph-patch-identity`, locks `apply(a, diff(a, b)) ≡ b`).
- There is exactly one mutation path. The editor and the AI cast both go through `GraphPatch`; neither edits node maps by hand. Re-addressing on apply keeps the graph honest.
- The AI cast is safe by construction: pure (zero network/provider imports), no auto-apply, host owns authority. The only way to mutate from model output is through validation, and the witness that proves validation cannot be reflected or forged (identity-registry WeakSet + module-private symbol).
- Cost: the eight-family union is a closed set; adding a family is a typed change with a schema arm and an exhaustiveness check, not a copy-paste (see the schema-based node decoder, `DocumentGraphNodeSchema`). That is deliberate friction — it is what closed the "missed a family/field" bug class.

## Evidence

- `packages/core/src/document-graph.ts:40` — `NodeFamily` union (the eight families).
- `packages/core/src/document-graph-address.ts` — `sealNode` / `sealGraph` / `validateGraph` / `linearizeGraph` (`addressNode` stays module-local).
- `packages/core/src/graph-patch.ts` — `GraphPatch.diff` / `apply` (logical-key replace on `update`) / `validate` / `receipt`.
- `packages/core/src/ai-cast.ts` — `castContext`, `summarizeGraph`, `validateGraphPatchProposal`, `applyValidatedPatch`, the `AICast` namespace.
- `packages/core/src/validated-output.ts` — `ValidatedProposal`, `ApplyToken`, `assertTokenBinds`; `mintValidated` (the sole mint site).
- `packages/core/package.json:45` — `"./validated-output": null` subpath denial; guarded by `tests/unit/meta/validated-output-subpath-leak.test.ts`.
- `tests/generated/core-graph-patch-identity.test.ts` — round-trip capsule (property + bench).

## Rejected alternatives

- **Merge `NodeFamily` into `CellKind`.** Rejected: the runtime cell taxonomy and the document-graph node taxonomy answer different questions; merging them couples the IR shape to runtime scheduling and loses the closed-union exhaustiveness check.
- **Let casts read authored definitions directly (no IR).** Rejected: no addressable object to mutate or prove identity over; every new producer re-implements traversal.
- **Apply model output, then validate (or validate inline at call sites).** Rejected: any miss is a mutation that already happened. The envelope makes "validated" a type the mutator demands, not a convention call sites remember.
- **Export `mintValidated` for host convenience.** Rejected: exposing the mint site lets a consumer forge a `ValidatedProposal` and bypass validation (lesson #12, the `RUNG_TARGETS` subpath leak). Hosts get `applyValidatedPatch` and the validators; never the minter.

## References

- [ADR-0003](./0003-content-addressing.md) — content addressing via FNV-1a + CBOR.
- [ADR-0006](./0006-compiler-dispatch.md) — compiler dispatch tagged union (the cast targets that read the graph).
- [ADR-0014](./0014-genui-catalog.md) — the closed catalog the generated-UI proposal validates against.
- `docs/PACKAGE-SURFACES.md` — `@czap/core` document-graph and AI-cast surfaces.
- `docs/ARCHITECTURE.md` — "Document graph (the IR)" and "AI cast".

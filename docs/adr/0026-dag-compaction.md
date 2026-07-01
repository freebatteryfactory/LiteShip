# ADR-0026 — Receipt-DAG compaction via checkpoint reclamation

**Status:** Accepted
**Date:** 2026-06-30

## Context

The receipt DAG (`packages/core/src/dag.ts`) is append-only — `ingest` is copy-on-write, and the only reclamation was a wholesale `reset()` on the `@czap/astro` LLM tracker. A long-lived receipt stream (the live-tail case) grows `nodes` (and the consumer's `framesByReceipt` / `orderedReceipts`) without bound. `DAGNode.parents` is DERIVED from the content-hash-bearing `envelope.previous` (`parentsOf`), and `previous` is one of the five SHA-256 inputs to `Receipt.hashEnvelope` — a node's identity commits to its parents. That forecloses the naive "cap + evict oldest" or "re-point the frontier" approaches: re-pointing a retained node's parent corrupts its content address, fails `validateChain` (`chain_break`), and does not survive a `fromReceipts` reload.

## Decision

**Drop-only** compaction. `DAG.checkpoint(dag, { below: W })` (Effect — minting is async `crypto.subtle`, keeping it off hot paths) drops the provably-dominated prefix `{W} ∪ ancestors(W)` and returns, **out-of-band**, a real `ReceiptEnvelope` checkpoint attestation: `kind:'checkpoint'`, `previous:GENESIS`, `timestamp` = HLC-max over the dropped set, `subject.id = 'czap/checkpoint:' + W`, payload = a canonical `TypedRef` summary of the dropped hashes — minted via the same `Receipt.hashEnvelope` SHA-256 law (never the fnv1a content-address law). A dominance precondition throws `InvariantViolationError('dag.checkpoint.not-dominated')` unless every cross-boundary parent edge lands exactly on `W`. The pure `DAG.spliceCheckpoint` rebuilds the DAG from the surviving envelopes (`fromReceipts`), so the spliced DAG **equals a fresh reload by construction**.

`Receipt.validateChain(tail, { base, checkpoint })` accepts a first-envelope `previous === base` (the watermark) in addition to `GENESIS` — but **only when a verified checkpoint authorizes it**. `base` without a checkpoint is rejected (`checkpoint_invalid`); otherwise a caller could validate a truncated chain by passing `base = tail[0].previous` with no proof the omitted prefix was ever compacted. The checkpoint is bound to `base` by verifying its content hash, genesis shape, and that its `subject.id` commits exactly that watermark.

The `@czap/astro` receipt tracker auto-compacts below `_lastAckReceiptId` minus a retention margin, off the per-frame path; the consumer snapshots the DAG identity before the async mint and **aborts on a concurrent ingest** (compaction is best-effort, so the next trigger retries against a consistent DAG).

## Consequences

- Long-lived receipt streams are memory-bounded out of the box; `recordFrame` stays mint-free (ADR-0005 — no crypto on the per-frame path).
- The checkpoint is a **sibling-root attestation, not an ancestor** of the retained frontier (`isAncestor(checkpoint, retained) === false`). Under drop-only it cannot be one without re-minting; for memory reclamation it does not need to be.
- A compacted tail is verifiable ONLY against its checkpoint — base alone proves nothing.
- Reload round-trip equality, tail-identity, ancestor/fork invariance above the watermark, and replica-deterministic checkpoint hashes are property-pinned.
- **The anti-fork rule survives compaction.** Dropping `W` does not weaken fork detection: `checkForkRule` falls back to scanning the retained nodes that still name a missing (compacted) parent, so a later `previous === W` fork by an actor that already has a retained child of `W` is still rejected. This needs no extra DAG state — the retained children carry the boundary — so reload-equality holds.
- **Checkpoint validation is STRUCTURAL, not cryptographic (known limit).** `validateChain(tail, { base, checkpoint })` verifies the checkpoint's hash, genesis shape, `kind:"checkpoint"`, `subject.type:"run"`, the `czap/checkpoint-summary` payload schema, and that the retained tail advances the HLC past the checkpoint. That is sufficient for a TRUSTED checkpoint (the single-actor / own-compaction case this feature targets). It does NOT prove provenance: `validateChain` lacks the dropped set, so it cannot recompute the summary `content_hash`, and a malicious remote could mint a structurally-valid checkpoint with a fabricated payload and a timestamp just under `tail[0]`. Adversarial-input provenance requires a **signed** checkpoint (a trusted compactor's `Receipt.macEnvelope` over the attestation) — deliberately out of scope for this drop-only, single-actor compaction, and noted as future work.

## Rejected alternatives

- **Re-point retained parents to the checkpoint** — corrupts content-addressed identity; fails `validateChain`; does not survive `fromReceipts` reload.
- **Accept `base` without a checkpoint** — a truncated-chain bypass (no proof of compaction).
- **Equate `checkpoint.hash` to the boundary node's hash** — SHA-256 collision-impossible; forging the hash field fails `hash_mismatch`.
- **HLC-bound watermark as primary** — not ancestor-closed under forks; can orphan.
- **Auto-compact on `recordFrame`** — async crypto on the hot frame path (ADR-0005 violation).
- **Splice the current DAG by a stale drop-set** — a concurrent ingest of a late child of a dropped node would orphan it; abort-and-retry instead.

## Evidence

- `packages/core/src/dag.ts` (`checkpoint`, `spliceCheckpoint`, `DAG.Checkpoint`), `receipt.ts` (`ChainValidationOptions`, the checkpoint-gated genesis predicate, `checkpoint_invalid`), `packages/_spine/core.d.ts` (mirrored types).
- `packages/astro/src/runtime/{receipt-chain,llm-receipt-tracker}.ts` (auto-compact + concurrent-ingest abort).
- `tests/property/dag-compaction.prop.test.ts` — A–H (boundary validation incl. base-requires-checkpoint, reload round-trip, tail-identity, ancestor/fork invariance, replica determinism, preconditions, max-HLC, and the anti-fork rule surviving compaction).

## References

- ADR-0005 (Effect boundary), ADR-0010 (spine canonical types), ADR-0001 (namespace pattern).
- `packages/core/src/dag.ts`, `receipt.ts`; `packages/astro/src/runtime/{receipt-chain,llm-receipt-tracker}.ts`.

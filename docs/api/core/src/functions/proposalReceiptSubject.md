[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / proposalReceiptSubject

# Function: proposalReceiptSubject()

> **proposalReceiptSubject**\<`T`\>(`proposal`): [`ReceiptSubject`](../interfaces/ReceiptSubject.md)

Defined in: [core/src/validated-output.ts:220](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validated-output.ts#L220)

RESOLVED (open question #7 — receipt integration). A full [ReceiptEnvelope](../interfaces/ReceiptEnvelope.md) is async (it hashes via `crypto.subtle`/SHA-256 inside an
`Effect`, exactly like `GraphPatch.receipt`). Folding that into the validators
would force `validateGraphPatchProposal`/`validateGeneratedUIProposal` async and
pull the whole cast-IN path into Effect — a scope balloon for no extra safety,
since the envelope's unforgeability already lives in the apply token, not a
receipt.

Instead we wire the SMALL, real, SYNCHRONOUS integration that composes cleanly:
a `ValidatedProposal` already carries a content-address `subject` (the fnv1a∘
CanonicalCbor identity — the same kernel `GraphPatch.receipt` subject-keys its
envelope on via `{ type: 'artifact', id }`). This derives the EXACT
[ReceiptSubject](../interfaces/ReceiptSubject.md) a host would mint a receipt against, so a host can chain
the proposal into its receipt DAG WITHOUT re-running the model and without core
taking on the async hashing path. The full `ReceiptEnvelope` mint stays a
host-side step (the host owns timestamps/`previous`/chain authority — the
product boundary), seeded by this subject. That is the next step, not a stub:
the citable identity is real and pinned (see the content-address-subject law in
the capsule + unit tests).

## Type Parameters

### T

`T`

## Parameters

### proposal

[`ValidatedProposal`](../interfaces/ValidatedProposal.md)\<`T`\>

## Returns

[`ReceiptSubject`](../interfaces/ReceiptSubject.md)

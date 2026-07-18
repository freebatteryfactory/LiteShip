[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ChainValidationOptions

# Interface: ChainValidationOptions

Defined in: [core/src/receipt.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/receipt.ts#L65)

Options that let a chain be validated as a COMPACTED TAIL instead of a full
history (see `DAG.checkpoint`). Optional everywhere — omitting them is the
back-compat genesis-rooted check.

- `base`: a checkpoint watermark hash. The index-0 genesis predicate widens to
  accept `previous === base`, so a retained tail validates without its dropped
  prefix.
- `checkpoint`: the genesis-shaped checkpoint attestation that authorizes
  `base`. When supplied it is integrity-checked (hash + genesis shape +
  `subject.id === "czap/checkpoint:<base>"`); a mismatch fails `checkpoint_invalid`.
- `verifyCheckpoint`: an OPTIONAL provenance verifier for the checkpoint — the
  injectable capability that closes the one gap the structural checks cannot.

## Properties

### base?

> `readonly` `optional` **base?**: `string`

Defined in: [core/src/receipt.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/receipt.ts#L66)

***

### checkpoint?

> `readonly` `optional` **checkpoint?**: [`ReceiptEnvelope`](ReceiptEnvelope.md)

Defined in: [core/src/receipt.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/receipt.ts#L67)

***

### verifyCheckpoint?

> `readonly` `optional` **verifyCheckpoint?**: (`checkpoint`) => `Promise`\<`boolean`\>

Defined in: [core/src/receipt.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/receipt.ts#L88)

Provenance verifier for the checkpoint attestation (injected capability).

The structural checks prove the checkpoint is WELL-FORMED (hash, `kind`,
`subject.type`, payload schema, genesis shape, `subject.id`, HLC-advance) but
NOT that it was minted by `DAG.checkpoint` over the real dropped set — a
compacted-tail validator does not hold the dropped set, so it cannot recompute
the summary `content_hash`. A forged genesis-shaped `kind:"checkpoint"` envelope
with the right subject id and an older timestamp therefore passes the structural
floor and could authorize an arbitrarily TRUNCATED tail.

In a TRUSTED setting (single-actor self-compaction — you validate the checkpoint
YOU minted) the structural floor is sufficient and no verifier is needed. In an
ADVERSARIAL setting (an untrusted remote supplies the checkpoint) inject a
verifier that establishes provenance — e.g. checks a signature (a trusted
compactor's `Receipt.macEnvelope` over the attestation), or recomputes the
summary against a locally-held dropped set. It resolves `true` to accept, `false`
to reject (fails the chain `checkpoint_invalid`); any verification failure must
resolve `false`, not raise. Absent, only the structural floor applies.

#### Parameters

##### checkpoint

[`ReceiptEnvelope`](ReceiptEnvelope.md)

#### Returns

`Promise`\<`boolean`\>

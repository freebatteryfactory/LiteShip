[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ChainValidationOptions

# Interface: ChainValidationOptions

Defined in: [core/src/receipt.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/receipt.ts#L63)

Options that let a chain be validated as a COMPACTED TAIL instead of a full
history (see `DAG.checkpoint`). Optional everywhere — omitting them is the
back-compat genesis-rooted check.

- `base`: a checkpoint watermark hash. The index-0 genesis predicate widens to
  accept `previous === base`, so a retained tail validates without its dropped
  prefix.
- `checkpoint`: the genesis-shaped checkpoint attestation that authorizes
  `base`. When supplied it is integrity-checked (hash + genesis shape +
  `subject.id === "czap/checkpoint:<base>"`); a mismatch fails `checkpoint_invalid`.

## Properties

### base?

> `readonly` `optional` **base?**: `string`

Defined in: [core/src/receipt.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/receipt.ts#L64)

***

### checkpoint?

> `readonly` `optional` **checkpoint?**: [`ReceiptEnvelope`](ReceiptEnvelope.md)

Defined in: [core/src/receipt.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/receipt.ts#L65)

[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / ReplayDiscreteFromPatchReceiptsOptions

# Interface: ReplayDiscreteFromPatchReceiptsOptions

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:28

Options for replaying discrete cells from a local transition/receipt chain.

## Properties

### applyTransition?

> `readonly` `optional` **applyTransition?**: (`transition`) => `void`

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:34

Typed host reflection of an applied crossing (e.g. dispatch to the DOM).

#### Parameters

##### transition

[`DiscreteStateTransition`](../../motion/interfaces/DiscreteStateTransition.md)

#### Returns

`void`

***

### cellStore

> `readonly` **cellStore**: [`StateCellStore`](../../reactive/interfaces/StateCellStore.md)

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:32

***

### chainValidation?

> `readonly` `optional` **chainValidation?**: [`ChainValidationOptions`](../../evidence/interfaces/ChainValidationOptions.md)

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:46

Checkpoint-attestation retention (issue #150): when the bounded receipt
buffer evicted a prefix, the buffer owner minted a genesis-shaped
`DAG.checkpoint` over the dropped set and retains `{ base, checkpoint }`.
Threading it here lets a retained SUFFIX validate without its dropped
prefix — `validateChainDetailed` widens its genesis predicate to
`previous === base` and integrity-checks the attestation. Omitted, the
genesis-rooted floor applies unchanged (a truncated tail refuses —
`base` without a verified `checkpoint` is deliberately rejected; that
hole was closed once and stays closed).

***

### entries

> `readonly` **entries**: readonly [`PatchReceiptEntry`](PatchReceiptEntry.md)[]

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:31

***

### localBaseId

> `readonly` **localBaseId**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:29

***

### serverGraphId

> `readonly` **serverGraphId**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:30

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / ReplayDiscreteFromPatchReceiptsOptions

# Interface: ReplayDiscreteFromPatchReceiptsOptions

Defined in: [core/src/graph/graph-query-gap-replay.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L41)

Options for replaying discrete cells from a local transition/receipt chain.

## Properties

### applyTransition?

> `readonly` `optional` **applyTransition?**: (`transition`) => `void`

Defined in: [core/src/graph/graph-query-gap-replay.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L47)

Typed host reflection of an applied crossing (e.g. dispatch to the DOM).

#### Parameters

##### transition

[`DiscreteStateTransition`](DiscreteStateTransition.md)

#### Returns

`void`

***

### cellStore

> `readonly` **cellStore**: [`StateCellStore`](StateCellStore.md)

Defined in: [core/src/graph/graph-query-gap-replay.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L45)

***

### chainValidation?

> `readonly` `optional` **chainValidation?**: [`ChainValidationOptions`](ChainValidationOptions.md) \| (() => [`ChainValidationOptions`](ChainValidationOptions.md) \| `undefined`)

Defined in: [core/src/graph/graph-query-gap-replay.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L64)

Checkpoint-attestation retention (issue #150): when the bounded receipt
buffer evicted a prefix, the buffer owner minted a genesis-shaped
`DAG.checkpoint` over the dropped set and retains `{ base, checkpoint }`.
Threading it here lets a retained SUFFIX validate without its dropped
prefix — `validateChainDetailed` widens its genesis predicate to
`previous === base` and integrity-checks the attestation. Omitted, the
genesis-rooted floor applies unchanged (a truncated tail refuses —
`base` without a verified `checkpoint` is deliberately rejected; that
hole was closed once and stays closed).

May be a THUNK: the live buffer's retention advances on every eviction,
and an eviction can land while the QUERY read is in flight. A thunk is
resolved HERE, synchronously with the entries read, so retention and
buffer can never diverge across that await (PR #188 review, confirmed).

***

### entries

> `readonly` **entries**: readonly [`PatchReceiptEntry`](PatchReceiptEntry.md)[]

Defined in: [core/src/graph/graph-query-gap-replay.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L44)

***

### localBaseId

> `readonly` **localBaseId**: [`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

Defined in: [core/src/graph/graph-query-gap-replay.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L42)

***

### serverGraphId

> `readonly` **serverGraphId**: [`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

Defined in: [core/src/graph/graph-query-gap-replay.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L43)

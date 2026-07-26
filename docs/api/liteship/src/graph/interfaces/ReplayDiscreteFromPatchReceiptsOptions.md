[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / ReplayDiscreteFromPatchReceiptsOptions

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

> `readonly` **cellStore**: [`StateCellStoreShape`](../../reactive/interfaces/StateCellStoreShape.md)

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:32

***

### entries

> `readonly` **entries**: readonly [`PatchReceiptEntry`](PatchReceiptEntry.md)[]

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:31

***

### localBaseId

> `readonly` **localBaseId**: `ContentAddress`

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:29

***

### serverGraphId

> `readonly` **serverGraphId**: `ContentAddress`

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:30

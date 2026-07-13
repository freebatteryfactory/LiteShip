[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ReplayDiscreteFromPatchReceiptsOptions

# Interface: ReplayDiscreteFromPatchReceiptsOptions

Defined in: [core/src/graph-query-gap-replay.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L33)

Options for replaying discrete cells from a local transition/receipt chain.

## Properties

### applyTransition?

> `readonly` `optional` **applyTransition?**: (`transition`) => `void`

Defined in: [core/src/graph-query-gap-replay.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L39)

Typed host reflection of an applied crossing (e.g. dispatch to the DOM).

#### Parameters

##### transition

[`DiscreteStateTransition`](DiscreteStateTransition.md)

#### Returns

`void`

***

### cellStore

> `readonly` **cellStore**: [`StateCellStoreShape`](StateCellStoreShape.md)

Defined in: [core/src/graph-query-gap-replay.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L37)

***

### entries

> `readonly` **entries**: readonly [`PatchReceiptEntry`](PatchReceiptEntry.md)[]

Defined in: [core/src/graph-query-gap-replay.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L36)

***

### localBaseId

> `readonly` **localBaseId**: `ContentAddress`

Defined in: [core/src/graph-query-gap-replay.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L34)

***

### serverGraphId

> `readonly` **serverGraphId**: `ContentAddress`

Defined in: [core/src/graph-query-gap-replay.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L35)

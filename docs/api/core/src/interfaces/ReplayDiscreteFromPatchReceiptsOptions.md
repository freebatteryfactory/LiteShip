[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ReplayDiscreteFromPatchReceiptsOptions

# Interface: ReplayDiscreteFromPatchReceiptsOptions

Defined in: [core/src/graph-query-gap-replay.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L26)

Options for replaying discrete cells from a local patch/receipt chain.

## Properties

### applyDiscrete?

> `readonly` `optional` **applyDiscrete?**: (`payload`) => `void`

Defined in: [core/src/graph-query-gap-replay.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L31)

#### Parameters

##### payload

`unknown`

#### Returns

`void`

***

### cellStore

> `readonly` **cellStore**: [`StateCellStoreShape`](StateCellStoreShape.md)

Defined in: [core/src/graph-query-gap-replay.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L30)

***

### entries

> `readonly` **entries**: readonly [`PatchReceiptEntry`](PatchReceiptEntry.md)[]

Defined in: [core/src/graph-query-gap-replay.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L29)

***

### localBaseId

> `readonly` **localBaseId**: `ContentAddress`

Defined in: [core/src/graph-query-gap-replay.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L27)

***

### serverGraphId

> `readonly` **serverGraphId**: `ContentAddress`

Defined in: [core/src/graph-query-gap-replay.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L28)

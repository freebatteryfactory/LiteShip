[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / chainPatchesBetween

# Function: chainPatchesBetween()

> **chainPatchesBetween**(`localBaseId`, `serverGraphId`, `entries`): readonly [`GraphPatch`](../interfaces/GraphPatch.md)[]

Defined in: [core/src/graph-query-gap-replay.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L87)

Walk a linear patch/receipt chain from `localBaseId` toward `serverGraphId`.

## Parameters

### localBaseId

`ContentAddress`

### serverGraphId

`ContentAddress`

### entries

readonly [`PatchReceiptEntry`](../interfaces/PatchReceiptEntry.md)[]

## Returns

readonly [`GraphPatch`](../interfaces/GraphPatch.md)[]

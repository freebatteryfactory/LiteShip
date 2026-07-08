[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / replayDiscreteFromPatchReceipts

# Function: replayDiscreteFromPatchReceipts()

> **replayDiscreteFromPatchReceipts**(`options`): `object`

Defined in: [core/src/graph-query-gap-replay.ts:166](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L166)

Replay missed discrete crossings from a patch/receipt chain — continuous
transients are stripped by the discrete/continuous law.

## Parameters

### options

[`ReplayDiscreteFromPatchReceiptsOptions`](../interfaces/ReplayDiscreteFromPatchReceiptsOptions.md)

## Returns

`object`

### discretePayloads

> `readonly` **discretePayloads**: readonly `unknown`[]

### replayedCells

> `readonly` **replayedCells**: readonly [`StateCell`](../interfaces/StateCell.md)\<`string`\> & `object`[]

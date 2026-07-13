[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / replayDiscreteFromPatchReceipts

# Function: replayDiscreteFromPatchReceipts()

> **replayDiscreteFromPatchReceipts**(`options`): `Promise`\<\{ `replayedCells`: readonly [`ReplayableRecoveryCell`](../type-aliases/ReplayableRecoveryCell.md)[]; `transitions`: readonly [`DiscreteStateTransition`](../interfaces/DiscreteStateTransition.md)[]; \}\>

Defined in: [core/src/graph-query-gap-replay.ts:153](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L153)

Replay missed discrete crossings from a transition/receipt chain.

The selected branch's receipts are run through the structural floor
([Receipt.validateChainDetailed](../variables/Receipt.md#validatechaindetailed): hash self-consistency, chain
continuity, HLC ordering) BEFORE anything applies — a reordered / truncated /
forked / HLC-regressed chain applies nothing (Law 15). Surviving transitions
are grouped per cell and the HIGHEST-generation one is applied via
[applyTransition](applyTransition.md); the store's generation guard is the belt-and-suspenders.

## Parameters

### options

[`ReplayDiscreteFromPatchReceiptsOptions`](../interfaces/ReplayDiscreteFromPatchReceiptsOptions.md)

## Returns

`Promise`\<\{ `replayedCells`: readonly [`ReplayableRecoveryCell`](../type-aliases/ReplayableRecoveryCell.md)[]; `transitions`: readonly [`DiscreteStateTransition`](../interfaces/DiscreteStateTransition.md)[]; \}\>

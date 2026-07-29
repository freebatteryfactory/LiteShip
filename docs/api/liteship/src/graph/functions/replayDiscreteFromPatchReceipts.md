[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / replayDiscreteFromPatchReceipts

# Function: replayDiscreteFromPatchReceipts()

> **replayDiscreteFromPatchReceipts**(`options`): `Promise`\<\{ `replayedCells`: readonly [`ReplayableRecoveryCell`](../../reactive/type-aliases/ReplayableRecoveryCell.md)[]; `transitions`: readonly [`DiscreteStateTransition`](../../motion/interfaces/DiscreteStateTransition.md)[]; \}\>

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:92

Replay missed discrete crossings from a transition/receipt chain.

The selected branch's receipts are run through the structural floor
(`Receipt.validateChainDetailed`: hash self-consistency, chain
continuity, HLC ordering) BEFORE anything applies — a reordered / truncated /
forked / HLC-regressed chain applies nothing (Law 15). Surviving transitions
are grouped per cell and the HIGHEST-generation one is applied via
`applyTransition`; the store's generation guard is the belt-and-suspenders.

## Parameters

### options

[`ReplayDiscreteFromPatchReceiptsOptions`](../interfaces/ReplayDiscreteFromPatchReceiptsOptions.md)

## Returns

`Promise`\<\{ `replayedCells`: readonly [`ReplayableRecoveryCell`](../../reactive/type-aliases/ReplayableRecoveryCell.md)[]; `transitions`: readonly [`DiscreteStateTransition`](../../motion/interfaces/DiscreteStateTransition.md)[]; \}\>

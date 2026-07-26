[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/motion](../README.md) / applyTransition

# Function: applyTransition()

> **applyTransition**(`cellStore`, `transition`): [`StateCell`](../../reactive/interfaces/StateCell.md)

Defined in: core/dist/motion/state-transition.d.ts:131

Apply a validated [DiscreteStateTransition](../interfaces/DiscreteStateTransition.md) to a cell store. The typed
parameter is the uncompilable seam (Law 16): a `StateCell & { kind: 'continuous' }`
or a raw `SignalNode` is NOT a `DiscreteStateTransition`, so it cannot be
passed here — the wrong call does not compile. The store's generation-rollback
guard makes a stale/duplicate transition a byte-identical no-op (Law 15).

## Parameters

### cellStore

[`StateCellStoreShape`](../../reactive/interfaces/StateCellStoreShape.md)

### transition

[`DiscreteStateTransition`](../interfaces/DiscreteStateTransition.md)

## Returns

[`StateCell`](../../reactive/interfaces/StateCell.md)

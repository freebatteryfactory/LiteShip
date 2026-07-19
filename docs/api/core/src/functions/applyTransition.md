[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / applyTransition

# Function: applyTransition()

> **applyTransition**(`cellStore`, `transition`): [`StateCell`](../interfaces/StateCell.md)

Defined in: [core/src/motion/state-transition.ts:217](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/state-transition.ts#L217)

Apply a validated [DiscreteStateTransition](../interfaces/DiscreteStateTransition.md) to a cell store. The typed
parameter is the uncompilable seam (Law 16): a `StateCell & { kind: 'continuous' }`
or a raw [SignalNode](../interfaces/SignalNode.md) is NOT a `DiscreteStateTransition`, so it cannot be
passed here — the wrong call does not compile. The store's generation-rollback
guard makes a stale/duplicate transition a byte-identical no-op (Law 15).

## Parameters

### cellStore

[`StateCellStoreShape`](../interfaces/StateCellStoreShape.md)

### transition

[`DiscreteStateTransition`](../interfaces/DiscreteStateTransition.md)

## Returns

[`StateCell`](../interfaces/StateCell.md)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / ResolvedStateAckPayload

# Interface: ResolvedStateAckPayload

Defined in: [worker/src/compositor-types.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L41)

Acknowledgement payload emitted by the worker after it applies a
resolved-state update from the main thread.

## Properties

### additionalOutputsChanged

> `readonly` **additionalOutputsChanged**: `boolean`

Defined in: [worker/src/compositor-types.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L50)

Whether non-discrete outputs (blend, CSS, etc.) changed in this round.

***

### generation

> `readonly` **generation**: `number`

Defined in: [worker/src/compositor-types.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L43)

Generation counter the worker acknowledges.

***

### states

> `readonly` **states**: readonly `object`[]

Defined in: [worker/src/compositor-types.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L45)

The state transitions the worker actually observed.

[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ResolvedStateAckPayload

# Interface: ResolvedStateAckPayload

Defined in: [\_spine/worker.d.ts:362](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L362)

Acknowledgement payload emitted by the worker after it applies a
resolved-state update from the main thread.

## Properties

### additionalOutputsChanged

> `readonly` **additionalOutputsChanged**: `boolean`

Defined in: [\_spine/worker.d.ts:371](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L371)

Whether non-discrete outputs (blend, CSS, etc.) changed in this round.

***

### generation

> `readonly` **generation**: `number`

Defined in: [\_spine/worker.d.ts:364](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L364)

Generation counter the worker acknowledges.

***

### states

> `readonly` **states**: readonly `object`[]

Defined in: [\_spine/worker.d.ts:366](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L366)

The state transitions the worker actually observed.

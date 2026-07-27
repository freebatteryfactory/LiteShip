[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ResolvedStateAckPayload

# Interface: ResolvedStateAckPayload

Defined in: [\_spine/worker.d.ts:361](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L361)

Acknowledgement payload emitted by the worker after it applies a
resolved-state update from the main thread.

## Properties

### additionalOutputsChanged

> `readonly` **additionalOutputsChanged**: `boolean`

Defined in: [\_spine/worker.d.ts:370](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L370)

Whether non-discrete outputs (blend, CSS, etc.) changed in this round.

***

### generation

> `readonly` **generation**: `number`

Defined in: [\_spine/worker.d.ts:363](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L363)

Generation counter the worker acknowledges.

***

### states

> `readonly` **states**: readonly `object`[]

Defined in: [\_spine/worker.d.ts:365](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L365)

The state transitions the worker actually observed.

[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / AsyncOwnedResource

# Interface: AsyncOwnedResource

Defined in: [\_spine/core.d.ts:174](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L174)

A resource that owns its teardown through LiteShip's one public lifecycle.
Synchronous finalizers run before `dispose()` returns; the promise joins async
finalizers and carries aggregate failure. `[Symbol.asyncDispose]` makes the
value usable with `await using`.

## Extended by

- [`SSEClient`](SSEClient.md)
- [`CompositorWorker`](CompositorWorker.md)
- [`RenderWorker`](RenderWorker.md)
- [`WorkerHost`](WorkerHost.md)

## Properties

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:175](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L175)

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:177](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L177)

#### Returns

`Promise`\<`void`\>

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:176](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L176)

#### Returns

`Promise`\<`void`\>

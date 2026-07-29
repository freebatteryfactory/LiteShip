[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / AsyncOwnedResource

# Interface: AsyncOwnedResource

Defined in: [\_spine/core.d.ts:181](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L181)

A resource that owns its teardown through LiteShip's one public lifecycle.
Synchronous finalizers run before `dispose()` returns; the promise joins async
finalizers and carries aggregate failure. `[Symbol.asyncDispose]` makes the
value usable with `await using`.

## Extended by

- [`FrameCapture`](FrameCapture.md)
- [`Timeline`](Timeline.md)
- [`PhysicalStateTracker`](PhysicalStateTracker.md)
- [`SSEClient`](SSEClient.md)
- [`CompositorWorker`](CompositorWorker.md)
- [`RenderWorker`](RenderWorker.md)
- [`WorkerHost`](WorkerHost.md)

## Properties

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:182](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L182)

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:184](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L184)

#### Returns

`Promise`\<`void`\>

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:183](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L183)

#### Returns

`Promise`\<`void`\>

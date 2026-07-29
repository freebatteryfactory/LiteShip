[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [worker/src](../README.md) / RenderWorker

# Interface: RenderWorker

Defined in: [worker/src/render-worker.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/render-worker.ts#L38)

Host-facing surface of a render worker. Owns the underlying `Worker`
and `OffscreenCanvas` once transferred; created by
[RenderWorker.create](../variables/RenderWorker.md#create). Release it with `await worker.dispose()`.

## Extends

- [`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md)

## Properties

### lifetime

> `readonly` **lifetime**: [`Lifetime`](../../../liteship/src/reactive/type-aliases/Lifetime.md)

Defined in: core/dist/reactive/lifetime.d.ts:108

The owning disposal handle — for advanced/debug composition only.

#### Inherited from

[`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md).[`lifetime`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md#lifetime)

***

### worker

> `readonly` **worker**: `Worker`

Defined in: [worker/src/render-worker.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/render-worker.ts#L40)

The underlying Worker instance.

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:112

Well-known disposer so the resource works with an `await using` declaration.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md).[`[asyncDispose]`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md#asyncdispose)

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:110

Tear down exactly once; the returned promise settles when async finalizers settle. Idempotent.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md).[`dispose`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md#dispose)

***

### onComplete()

> **onComplete**(`callback`): () => `void`

Defined in: [worker/src/render-worker.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/render-worker.ts#L58)

Subscribe to render completion. Returns an unsubscribe function.

#### Parameters

##### callback

(`totalFrames`) => `void`

#### Returns

() => `void`

***

### onFrame()

> **onFrame**(`callback`): () => `void`

Defined in: [worker/src/render-worker.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/render-worker.ts#L55)

Subscribe to per-frame output. Returns an unsubscribe function.

#### Parameters

##### callback

(`output`) => `void`

#### Returns

() => `void`

***

### startRender()

> **startRender**(`config`): `void`

Defined in: [worker/src/render-worker.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/render-worker.ts#L49)

Start rendering frames with the given video configuration.

#### Parameters

##### config

[`VideoConfig`](../../../liteship/src/media/interfaces/VideoConfig.md)

#### Returns

`void`

***

### stopRender()

> **stopRender**(): `void`

Defined in: [worker/src/render-worker.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/render-worker.ts#L52)

Stop an in-progress render.

#### Returns

`void`

***

### transferCanvas()

> **transferCanvas**(`canvas`): `void`

Defined in: [worker/src/render-worker.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/render-worker.ts#L46)

Transfer an OffscreenCanvas to the worker.
The canvas must have been obtained via `canvas.transferControlToOffscreen()`.

#### Parameters

##### canvas

`OffscreenCanvas`

#### Returns

`void`

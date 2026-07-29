[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [worker/src](../README.md) / WorkerHost

# Interface: WorkerHost

Defined in: [worker/src/host.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L73)

Host-facing surface of a worker host. Owns a compositor worker and,
optionally, a render worker created on demand via
[WorkerHost.attachCanvas](#attachcanvas). Returned by [WorkerHost.create](../variables/WorkerHost.md#create); use
`await host.dispose()` to join every child release.

## Extends

- [`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md)

## Properties

### compositor

> `readonly` **compositor**: `CompositorWorker`

Defined in: [worker/src/host.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L75)

The compositor worker instance.

***

### lifetime

> `readonly` **lifetime**: [`Lifetime`](../../../liteship/src/reactive/type-aliases/Lifetime.md)

Defined in: core/dist/reactive/lifetime.d.ts:108

The owning disposal handle — for advanced/debug composition only.

#### Inherited from

[`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md).[`lifetime`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md#lifetime)

***

### renderer

> `readonly` **renderer**: [`RenderWorker`](RenderWorker.md) \| `null`

Defined in: [worker/src/host.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L78)

The render worker instance, or null if no canvas has been attached.

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

### attachCanvas()

> **attachCanvas**(`canvas`): `void`

Defined in: [worker/src/host.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L90)

Attach an HTMLCanvasElement for off-thread rendering.

Calls `canvas.transferControlToOffscreen()` and transfers the
resulting OffscreenCanvas to the render worker. A render worker
is created on demand if one does not already exist.

This can only be called once per canvas element -- the browser
does not allow transferring control multiple times.

#### Parameters

##### canvas

[`TransferableCanvas`](TransferableCanvas.md)

#### Returns

`void`

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

### onState()

> **onState**(`callback`): () => `void`

Defined in: [worker/src/host.ts:106](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L106)

Subscribe to CompositeState updates from the compositor worker.
Returns an unsubscribe function.

#### Parameters

##### callback

(`state`) => `void`

#### Returns

() => `void`

***

### startRender()

> **startRender**(`config`): `void`

Defined in: [worker/src/host.ts:97](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L97)

Start off-thread video rendering. Width/height default to the
attached canvas's dimensions and fps to 60 — only `durationMs`
is required (see [WorkerHostRenderConfig](WorkerHostRenderConfig.md)).

#### Parameters

##### config

[`WorkerHostRenderConfig`](WorkerHostRenderConfig.md)

#### Returns

`void`

***

### stopRender()

> **stopRender**(): `void`

Defined in: [worker/src/host.ts:100](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L100)

Stop an in-progress off-thread render.

#### Returns

`void`

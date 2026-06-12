[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / WorkerHostShape

# Interface: WorkerHostShape

Defined in: [worker/src/host.ts:71](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/host.ts#L71)

Host-facing surface of a worker host. Owns a compositor worker and,
optionally, a render worker created on demand via
[WorkerHostShape.attachCanvas](#attachcanvas). Returned by [WorkerHost.create](../variables/WorkerHost.md#create).

## Properties

### compositor

> `readonly` **compositor**: [`CompositorWorkerShape`](CompositorWorkerShape.md)

Defined in: [worker/src/host.ts:73](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/host.ts#L73)

The compositor worker instance.

***

### renderer

> `readonly` **renderer**: [`RenderWorkerShape`](RenderWorkerShape.md) \| `null`

Defined in: [worker/src/host.ts:76](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/host.ts#L76)

The render worker instance, or null if no canvas has been attached.

## Methods

### attachCanvas()

> **attachCanvas**(`canvas`): `void`

Defined in: [worker/src/host.ts:88](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/host.ts#L88)

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

> **dispose**(): `void`

Defined in: [worker/src/host.ts:107](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/host.ts#L107)

Dispose both workers and release all resources.

#### Returns

`void`

***

### onState()

> **onState**(`callback`): () => `void`

Defined in: [worker/src/host.ts:104](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/host.ts#L104)

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

Defined in: [worker/src/host.ts:95](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/host.ts#L95)

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

Defined in: [worker/src/host.ts:98](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/host.ts#L98)

Stop an in-progress off-thread render.

#### Returns

`void`

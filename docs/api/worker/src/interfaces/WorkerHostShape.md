[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / WorkerHostShape

# Interface: WorkerHostShape

Defined in: [worker/src/host.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L72)

Host-facing surface of a worker host. Owns a compositor worker and,
optionally, a render worker created on demand via
[WorkerHostShape.attachCanvas](#attachcanvas). Returned by [WorkerHost.create](../variables/WorkerHost.md#create).

## Properties

### compositor

> `readonly` **compositor**: [`CompositorWorkerShape`](CompositorWorkerShape.md)

Defined in: [worker/src/host.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L74)

The compositor worker instance.

***

### renderer

> `readonly` **renderer**: [`RenderWorkerShape`](RenderWorkerShape.md) \| `null`

Defined in: [worker/src/host.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L77)

The render worker instance, or null if no canvas has been attached.

## Methods

### attachCanvas()

> **attachCanvas**(`canvas`): `void`

Defined in: [worker/src/host.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L89)

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

Defined in: [worker/src/host.ts:108](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L108)

Dispose both workers and release all resources.

#### Returns

`void`

***

### onState()

> **onState**(`callback`): () => `void`

Defined in: [worker/src/host.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L105)

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

Defined in: [worker/src/host.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L96)

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

Defined in: [worker/src/host.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L99)

Stop an in-progress off-thread render.

#### Returns

`void`

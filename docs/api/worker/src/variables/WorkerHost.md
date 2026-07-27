[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / WorkerHost

# Variable: WorkerHost

> **WorkerHost**: `object`

Defined in: [worker/src/host.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L73)

`WorkerHost` -- main-thread lifecycle wrapper that owns a
[CompositorWorker](CompositorWorker.md) and (optionally) a
[RenderWorker](RenderWorker.md), exposing a single unified surface for DOM
integration.

Typical flow:
1. `const host = WorkerHost.create({...})` on the main thread.
2. `host.attachCanvas(canvasEl)` to lazily mint a render worker and
   transfer its `OffscreenCanvas`.
3. `host.startRender(videoConfig)` / `host.stopRender()` to control
   the render loop.
4. `host.onState(cb)` to subscribe to composite state updates.
5. `await host.dispose()` when the host is unmounted -- releases both
   workers and every subscription.

## Type Declaration

### create

> `readonly` **create**: (`config?`, `startupTelemetry?`) => [`WorkerHost`](../interfaces/WorkerHost.md) = `_createWorkerHost`

Create a worker host. The compositor worker starts immediately; the
render worker is created lazily on the first
[WorkerHost.attachCanvas](../interfaces/WorkerHost.md#attachcanvas) call.

#### Parameters

##### config?

[`WorkerConfig`](../interfaces/WorkerConfig.md)

##### startupTelemetry?

`CompositorWorkerStartupTelemetry`

#### Returns

[`WorkerHost`](../interfaces/WorkerHost.md)

## Example

```ts
import { WorkerHost } from '@liteship/worker';

const host = WorkerHost.create({ poolCapacity: 64 });
host.attachCanvas(canvas);
// width/height default to the attached canvas's dimensions, fps to 60.
host.startRender({ durationMs: 5000 });
const unsub = host.onState((state) => console.log(state.discrete));
// ...
unsub();
await host.dispose();
```

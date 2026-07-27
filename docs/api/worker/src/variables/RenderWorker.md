[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / RenderWorker

# Variable: RenderWorker

> **RenderWorker**: `object`

Defined in: [worker/src/render-worker.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/render-worker.ts#L38)

Factory namespace for the render worker.

Call [RenderWorker.create](#create) on the main thread to mint a worker
that owns an `OffscreenCanvas` and renders `VideoFrameOutput` frames
off the main thread. Transfer control via
[RenderWorker.transferCanvas](../interfaces/RenderWorker.md#transfercanvas) before calling `startRender`.

## Type Declaration

### create

> `readonly` **create**: (`config?`) => [`RenderWorker`](../interfaces/RenderWorker.md) = `_createRenderWorker`

Spin up a render worker. The worker starts idle; transfer an
`OffscreenCanvas` via
[RenderWorker.transferCanvas](../interfaces/RenderWorker.md#transfercanvas) before calling
`startRender`.

Construction-time knobs ([WorkerConfig](../interfaces/WorkerConfig.md)) are sent to the
worker in the init message: `targetFps` enables wall-clock frame
pacing of the render loop; omitted fields fall back to worker-local
defaults (unpaced free-run).

#### Parameters

##### config?

[`WorkerConfig`](../interfaces/WorkerConfig.md)

#### Returns

[`RenderWorker`](../interfaces/RenderWorker.md)

## Example

```ts
import { RenderWorker } from '@liteship/worker';

// Pace frame emission at 30fps wall-clock (live preview); omit
// targetFps to free-run at maximum speed (offline encode).
const renderer = RenderWorker.create({ targetFps: 30 });
const offscreen = canvas.transferControlToOffscreen();
renderer.transferCanvas(offscreen);
renderer.onFrame((frame) => {
  // project frame.state.outputs.css and frame.progress somewhere
});
renderer.startRender({ durationMs: 4000, fps: 30, width: 640, height: 360 });
```

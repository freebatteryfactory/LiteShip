[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / WorkerConfig

# Interface: WorkerConfig

Defined in: [worker/src/messages.ts:23](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/messages.ts#L23)

Tunable knobs that the main thread sends to a worker at construction time.

Omitted fields fall back to worker-local defaults chosen by
[CompositorWorker](../namespaces/CompositorWorker/README.md) / [RenderWorker](../namespaces/RenderWorker/README.md).

## Properties

### poolCapacity?

> `readonly` `optional` **poolCapacity?**: `number`

Defined in: [worker/src/messages.ts:25](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/messages.ts#L25)

Maximum number of pooled `CompositeState` slots the worker may hold.

***

### targetFps?

> `readonly` `optional` **targetFps?**: `number`

Defined in: [worker/src/messages.ts:37](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/messages.ts#L37)

Target frames-per-second for the render loop (affects frame pacing).

Wall-clock production throttle: the render worker waits out the
remainder of each `1000 / targetFps` budget before drawing the next
frame, so frames are never *emitted* faster than this rate (useful
for live preview). This is a different axis from `VideoConfig.fps`,
which controls content timing -- frame count and per-frame
timestamps -- and is unaffected by pacing. Omitted: the loop
free-runs at maximum speed (offline-encode behavior).

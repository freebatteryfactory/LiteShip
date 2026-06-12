[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [worker/src](../../README.md) / CompositorWorker

# CompositorWorker

Factory namespace for the compositor worker.

Call [CompositorWorker.create](../../variables/CompositorWorker.md#create) on the main thread to spin up a
worker that evaluates quantizer boundaries and emits
[CompositorWorkerState](../../type-aliases/CompositorWorkerState.md) snapshots. The returned
[CompositorWorkerShape](../../interfaces/CompositorWorkerShape.md) owns the underlying `Worker` -- call
`dispose()` (or park via the lease pool) when finished.

## Example

```ts
import { Boundary } from '@czap/core';
import { CompositorWorker } from '@czap/worker';

const compositor = CompositorWorker.create({ poolCapacity: 64 });
// Boundary.make computes the content-addressed id; the quantizer
// name defaults to the boundary's input name ('brightness').
const brightness = Boundary.make({
  input: 'brightness',
  // at[i] is [lower bound, state]: 'dim' from 0, 'bright' from 0.5.
  at: [[0, 'dim'], [0.5, 'bright']],
});
compositor.addQuantizer(brightness);
const unsub = compositor.onState((state) => {
  // state.discrete.brightness === 'bright' | 'dim'
});
compositor.evaluate('brightness', 0.7); // 0.7 >= 0.5 -> 'bright'
compositor.requestCompute();
// ...later:
unsub();
compositor.dispose();
```

## Type Aliases

- [Shape](type-aliases/Shape.md)
- [StartupStage](type-aliases/StartupStage.md)
- [StartupTelemetry](type-aliases/StartupTelemetry.md)

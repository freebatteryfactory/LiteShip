[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [core/src](../../README.md) / Compositor

# Compositor

Compositor — the live merge point for every attached [Quantizer](../../interfaces/Quantizer.md).

`Compositor.create` returns a live compositor bound to a fresh
[RuntimeCoordinator](../../variables/RuntimeCoordinator.md), paired with the [Lifetime](../../variables/Lifetime.md) that owns its
teardown. Adding quantizers, marking dirty flags, and emitting CSS/GLSL/ARIA
outputs all flow through the zero-allocation hot path backed by
[CompositorStatePool](../../variables/CompositorStatePool.md).

## Example

```ts
import { Compositor } from '@czap/core';

const { compositor, lifetime } = Compositor.create({ poolCapacity: 64, speculative: true });
compositor.add('viewport', viewportQuantizer);
const state = compositor.compute();
// state.discrete.viewport === 'tablet'
// state.outputs.css['--czap-viewport'] === 'tablet'
await lifetime.dispose();
```

## Type Aliases

- [Config](type-aliases/Config.md)
- [Handle](type-aliases/Handle.md)
- [Shape](type-aliases/Shape.md)

[**LiteShip**](../../../../../README.md)

***

[LiteShip](../../../../../README.md) / [liteship/src/media](../../README.md) / Compositor

# Compositor

Compositor — the live merge point for every attached `Quantizer`.

`Compositor.create` returns a live compositor bound to a fresh
`RuntimeCoordinator`, paired with the `Lifetime` that owns its
teardown. Adding quantizers, marking dirty flags, and emitting CSS/GLSL/ARIA
outputs all flow through the zero-allocation hot path backed by
[CompositorStatePool](../../type-aliases/CompositorStatePool.md).

## Example

```ts
import { Compositor } from '@liteship/core';

const compositor = Compositor.create({ poolCapacity: 64, speculative: true });
compositor.add('viewport', viewportQuantizer);
const state = compositor.compute();
// state.discrete.viewport === 'tablet'
// state.outputs.css['--liteship-viewport'] === 'tablet'
await compositor.dispose();
```

## Type Aliases

- [Config](type-aliases/Config.md)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Compositor

# Variable: Compositor

> `const` **Compositor**: `CompositorFactory`

Defined in: [core/src/media/compositor.ts:241](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/compositor.ts#L241)

Compositor — the live merge point for every attached [Quantizer](../interfaces/Quantizer.md).

`Compositor.create` returns a live compositor bound to a fresh
[RuntimeCoordinator](RuntimeCoordinator.md), paired with the [Lifetime](Lifetime.md) that owns its
teardown. Adding quantizers, marking dirty flags, and emitting CSS/GLSL/ARIA
outputs all flow through the zero-allocation hot path backed by
[CompositorStatePool](CompositorStatePool.md).

## Example

```ts
import { Compositor } from '@liteship/core';

const { compositor, lifetime } = Compositor.create({ poolCapacity: 64, speculative: true });
compositor.add('viewport', viewportQuantizer);
const state = compositor.compute();
// state.discrete.viewport === 'tablet'
// state.outputs.css['--liteship-viewport'] === 'tablet'
await lifetime.dispose();
```

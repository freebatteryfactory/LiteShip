[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / createQuantizer

# Function: createQuantizer()

> **createQuantizer**\<`B`, `O`\>(`definition`, `runtime?`): [`OwnedQuantizer`](../type-aliases/OwnedQuantizer.md)\<`B`, `O`\>

Defined in: [quantizer/src/quantizer.ts:591](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L591)

Allocate a live [LiveQuantizer](../interfaces/LiveQuantizer.md) from an immutable [QuantizerConfig](../interfaces/QuantizerConfig.md)
definition, paired with the [Lifetime](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts) that owns its teardown.

The instance evaluates numeric input values against the boundary's thresholds,
dispatches state transitions, and routes per-state outputs (CSS, GLSL, WGSL,
ARIA, AI) gated by MotionTier. Disposing the lifetime closes the state /
outputs / crossings kernels (completing every subscriber and making publish
inert).

Pass a [QuantizerRuntime](../interfaces/QuantizerRuntime.md) to inject the wall-clock boundary that advances
this instance's monotonic crossing HLC; omit it to default to `@liteship/core`'s
`wallClock`. The clock is per-instantiation, never part of the cached config's
identity.

## Type Parameters

### B

`B` *extends* [`Boundary`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Boundary.md)

### O

`O` *extends* [`QuantizerOutputs`](../interfaces/QuantizerOutputs.md)\<`B`\>

## Parameters

### definition

[`QuantizerConfig`](../interfaces/QuantizerConfig.md)\<`B`, `O`\>

The immutable config authored by [defineQuantizer](defineQuantizer.md)

### runtime?

[`QuantizerRuntime`](../interfaces/QuantizerRuntime.md)

Optional per-instantiation clock / HLC node injection

## Returns

[`OwnedQuantizer`](../type-aliases/OwnedQuantizer.md)\<`B`, `O`\>

An [OwnedQuantizer](../type-aliases/OwnedQuantizer.md) — the live instance that owns its own teardown via `dispose()`

## Example

```ts
import { defineBoundary } from '@liteship/core';
import { defineQuantizer, createQuantizer } from '@liteship/quantizer';

const boundary = defineBoundary({
  input: 'width',
  at: [[0, 'sm'], [768, 'lg']],
});
const config = defineQuantizer(boundary, {
  outputs: { css: { sm: { display: 'block' }, lg: { display: 'grid' } } },
});
const live = createQuantizer(config);
live.evaluate(1024);
const result = live.currentOutputs.read();
// result.css => { display: 'grid' }
await live.dispose();
```

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [liteship/src](../README.md) / defineQuantizer

# Function: defineQuantizer()

> **defineQuantizer**\<`B`, `O`\>(`boundary`, `options`): [`QuantizerConfig`](../reactive/interfaces/QuantizerConfig.md)\<`B`, `O`\>

Defined in: quantizer/dist/quantizer.d.ts:242

Author a content-addressed [QuantizerConfig](../reactive/interfaces/QuantizerConfig.md) from a boundary definition
and its per-target outputs — the PURE, immutable definition (authored intent).

This performs validation and content-addressing up front: an unknown `tier`
throws, tier-gated outputs warn once at definition time, and the config is
memoized by its content address (identical definitions return the SAME object).
Pass the result to [createQuantizer](../reactive/functions/createQuantizer.md) to materialize a live reactive instance.

## Type Parameters

### B

`B` *extends* [`Boundary`](../type-aliases/Boundary.md)

### O

`O` *extends* `QuantizerOutputs`\<`B`\>

## Parameters

### boundary

`B`

The boundary definition to quantize against

### options

[`DefineQuantizerOptions`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts)\<`B`, `O`\>

The `outputs` tables plus optional `tier`, `spring`, and `force`

## Returns

[`QuantizerConfig`](../reactive/interfaces/QuantizerConfig.md)\<`B`, `O`\>

The immutable, content-addressed [QuantizerConfig](../reactive/interfaces/QuantizerConfig.md)

## Example

```ts
import { defineBoundary } from '@liteship/core';
import { defineQuantizer, createQuantizer } from '@liteship/quantizer';

const boundary = defineBoundary({
  input: 'width',
  at: [[0, 'sm'], [640, 'md'], [1024, 'lg']],
});
const config = defineQuantizer(boundary, {
  outputs: { css: { sm: { fontSize: '14px' }, md: { fontSize: '16px' }, lg: { fontSize: '18px' } } },
});
const live = createQuantizer(config);
const result = live.evaluate(800); // 'md'
await live.dispose();
```

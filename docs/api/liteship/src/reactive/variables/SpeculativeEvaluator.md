[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / SpeculativeEvaluator

# Variable: SpeculativeEvaluator

> `const` **SpeculativeEvaluator**: `object`

Defined in: core/dist/reactive/speculative.d.ts:58

SpeculativeEvaluator -- threshold proximity prefetching for boundaries.
Pre-computes the next discrete state when a signal is near a threshold,
using velocity estimation and hysteresis-based prefetch windows.

## Type Declaration

### make

> **make**: *typeof* `_make`

## Example

```ts
const boundary = defineBoundary({
  thresholds: [600],
  states: ['small', 'large'] as const,
});
const spec = SpeculativeEvaluator.make(boundary);
const { current, prefetched, confidence } = spec.evaluate(595, 1.5);
// current='small', prefetched='large', confidence ~0.85
```

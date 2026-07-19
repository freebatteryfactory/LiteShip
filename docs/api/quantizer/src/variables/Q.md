[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / Q

# Variable: Q

> `const` **Q**: `object`

Defined in: [quantizer/src/quantizer.ts:675](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L675)

Quantizer builder namespace.

`Q.from(boundary)` starts a fluent builder that produces a content-addressed
[QuantizerConfig](../interfaces/QuantizerConfig.md). Calling `config.create()` yields a reactive
[LiveQuantizer](../interfaces/LiveQuantizer.md) (paired with its [Lifetime](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/lifetime.ts)) that evaluates numeric
input values against boundary thresholds, dispatches state transitions, and
routes per-state outputs (CSS, GLSL, WGSL, ARIA, AI) gated by MotionTier.

## Type Declaration

### from

> `readonly` **from**: \<`B`\>(`boundary`, `options?`) => [`QuantizerBuilder`](../interfaces/QuantizerBuilder.md)\<`B`\> = `fromBoundary`

Create a quantizer builder from a boundary definition.

Starts a fluent chain: `Q.from(boundary).outputs({...})` produces a
content-addressed `QuantizerConfig` whose `.create()` method yields a
reactive `LiveQuantizer` paired with its owning [Lifetime](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/lifetime.ts).

#### Type Parameters

##### B

`B` *extends* [`Shape`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)\<`string`, readonly \[`string`, `string`\]\>

#### Parameters

##### boundary

`B`

The boundary definition to quantize against

##### options?

[`QuantizerFromOptions`](../interfaces/QuantizerFromOptions.md)

Optional motion tier and spring configuration

#### Returns

[`QuantizerBuilder`](../interfaces/QuantizerBuilder.md)\<`B`\>

A [QuantizerBuilder](../interfaces/QuantizerBuilder.md) for chaining `.outputs()` and `.force()`

#### Example

```ts
import { Boundary } from '@liteship/core';
import { Q } from '@liteship/quantizer';

const boundary = Boundary.make({
  input: 'width',
  at: [[0, 'sm'], [640, 'md'], [1024, 'lg']],
});
const config = Q.from(boundary).outputs({
  css: { sm: { fontSize: '14px' }, md: { fontSize: '16px' }, lg: { fontSize: '18px' } },
});
const { quantizer: live, lifetime } = config.create();
const result = live.evaluate(800); // 'md'
await lifetime.dispose();
```

## Example

```ts
import { Boundary } from '@liteship/core';
import { Q } from '@liteship/quantizer';

const boundary = Boundary.make({
  input: 'width',
  at: [[0, 'sm'], [768, 'lg']],
});
const config = Q.from(boundary).outputs({
  css: { sm: { display: 'block' }, lg: { display: 'grid' } },
});
const { quantizer: live, lifetime } = config.create();
live.evaluate(1024);
const result = live.currentOutputs.read();
// result.css => { display: 'grid' }
await lifetime.dispose();
```

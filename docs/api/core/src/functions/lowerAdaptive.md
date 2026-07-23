[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / lowerAdaptive

# Function: lowerAdaptive()

> **lowerAdaptive**\<`B`\>(`spec`, `lowering`): [`Adaptive`](../interfaces/Adaptive.md)

Defined in: [core/src/authoring/adaptive.ts:357](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L357)

Lower a single [AdaptiveSpec](../interfaces/AdaptiveSpec.md) into an [Adaptive](../interfaces/Adaptive.md) by CALLING the
five sibling constructors — never reimplementing them.

Concretely: `boundary = defineBoundary(spec.boundary)`;
`style = defineStyle({ ...spec.style, boundary })` (generated boundary wins);
`quantizer = defineQuantizer(boundary, spec.quantize)` (the configCache makes
this referentially identical to the hand-lowered call);
`tokens = spec.tokens.map(defineToken)`; `theme = defineTheme(spec.theme)`.
The aggregate `id` addresses the normalized tier and member ids.
`explain`/`attrs`/`plan` are pure projections of those members.

## Type Parameters

### B

`B` *extends* `object`

## Parameters

### spec

[`AdaptiveSpec`](../interfaces/AdaptiveSpec.md)\<`B`\>

### lowering

[`AdaptiveLowering`](../interfaces/AdaptiveLowering.md)

## Returns

[`Adaptive`](../interfaces/Adaptive.md)

## Example

```ts
const adaptive = defineAdaptive({
  boundary: { input: 'viewport.width', at: [[0, 'sm'], [768, 'md'], [1024, 'lg']] },
  style: { base: { properties: { 'font-size': '14px' } }, states: { lg: { properties: { 'font-size': '18px' } } } },
});
adaptive.explain(800).boundary.state; // 'md'
```

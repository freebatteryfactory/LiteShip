[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Adaptive

# Interface: Adaptive

Defined in: [core/src/authoring/adaptive.ts:192](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L192)

A lowered adaptive: the five constructor outputs plus their aggregate content
address and three pure projections (`attrs`, `explain`, `plan`). Each member
IS the hand-lowered constructor output — same content address, and for the
quantizer the SAME object the configCache returns.

## Properties

### boundary

> `readonly` **boundary**: [`Boundary`](../type-aliases/Boundary.md)

Defined in: [core/src/authoring/adaptive.ts:194](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L194)

`defineBoundary(spec.boundary)`.

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [core/src/authoring/adaptive.ts:204](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L204)

FNV-1a content address of `{ boundary, style, quantizer, tokens, theme }` ids.

***

### quantizer?

> `readonly` `optional` **quantizer?**: `AdaptiveQuantizerConfig`\<[`Boundary`](../type-aliases/Boundary.md)\>

Defined in: [core/src/authoring/adaptive.ts:198](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L198)

`defineQuantizer(boundary, spec.quantize)` — undefined when `spec.quantize` is omitted.

***

### style

> `readonly` **style**: [`Style`](../type-aliases/Style.md)

Defined in: [core/src/authoring/adaptive.ts:196](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L196)

`defineStyle({ boundary, ...spec.style })`.

***

### theme?

> `readonly` `optional` **theme?**: [`Theme`](../type-aliases/Theme.md)

Defined in: [core/src/authoring/adaptive.ts:202](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L202)

`defineTheme(spec.theme)` — undefined when `spec.theme` is omitted.

***

### tokens?

> `readonly` `optional` **tokens?**: readonly [`Token`](../type-aliases/Token.md)[]

Defined in: [core/src/authoring/adaptive.ts:200](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L200)

`spec.tokens.map(defineToken)` — undefined when `spec.tokens` is omitted.

## Methods

### attrs()

> **attrs**(): `Record`\<`string`, `string`\>

Defined in: [core/src/authoring/adaptive.ts:206](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L206)

The headless DOM attr set a boundary-aware consumer needs.

#### Returns

`Record`\<`string`, `string`\>

***

### explain()

> **explain**(`value`): [`AdaptiveExplanation`](AdaptiveExplanation.md)

Defined in: [core/src/authoring/adaptive.ts:208](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L208)

Explain the adaptive at one input value (state, matched thresholds, quantized, style, tier).

#### Parameters

##### value

`number`

#### Returns

[`AdaptiveExplanation`](AdaptiveExplanation.md)

***

### plan()

> **plan**(): [`AdaptivePlan`](AdaptivePlan.md)

Defined in: [core/src/authoring/adaptive.ts:210](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L210)

The build-time plan (member ids, compiled CSS, attrs).

#### Returns

[`AdaptivePlan`](AdaptivePlan.md)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [liteship/src](../README.md) / Adaptive

# Interface: Adaptive

Defined in: core/dist/authoring/adaptive.d.ts:173

A lowered adaptive: the five constructor outputs plus their aggregate content
address and three pure projections (`attrs`, `explain`, `plan`). Each member
IS the hand-lowered constructor output — same content address, and for the
quantizer the SAME object the configCache returns.

## Properties

### boundary

> `readonly` **boundary**: [`Boundary`](../type-aliases/Boundary.md)

Defined in: core/dist/authoring/adaptive.d.ts:175

`defineBoundary(spec.boundary)`.

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: core/dist/authoring/adaptive.d.ts:185

FNV-1a content address of normalized tier + `{ boundary, style, quantizer, tokens, theme }` ids.

***

### quantizer?

> `readonly` `optional` **quantizer?**: `AdaptiveQuantizerConfig`\<[`Boundary`](../type-aliases/Boundary.md)\>

Defined in: core/dist/authoring/adaptive.d.ts:179

`defineQuantizer(boundary, spec.quantize)` — undefined when `spec.quantize` is omitted.

***

### style

> `readonly` **style**: [`Style`](../type-aliases/Style.md)

Defined in: core/dist/authoring/adaptive.d.ts:177

`defineStyle({ boundary, ...spec.style })`.

***

### theme?

> `readonly` `optional` **theme?**: [`Theme`](../type-aliases/Theme.md)

Defined in: core/dist/authoring/adaptive.d.ts:183

`defineTheme(spec.theme)` — undefined when `spec.theme` is omitted.

***

### tokens?

> `readonly` `optional` **tokens?**: readonly [`Token`](../type-aliases/Token.md)[]

Defined in: core/dist/authoring/adaptive.d.ts:181

`spec.tokens.map(defineToken)` — undefined when `spec.tokens` is omitted.

## Methods

### attrs()

> **attrs**(): `Record`\<`string`, `string`\>

Defined in: core/dist/authoring/adaptive.d.ts:187

The headless DOM attr set a boundary-aware consumer needs.

#### Returns

`Record`\<`string`, `string`\>

***

### explain()

> **explain**(`value`): `AdaptiveExplanation`

Defined in: core/dist/authoring/adaptive.d.ts:189

Explain the adaptive at one input value (state, matched thresholds, quantized, style, tier).

#### Parameters

##### value

`number`

#### Returns

`AdaptiveExplanation`

***

### plan()

> **plan**(): `AdaptivePlan`

Defined in: core/dist/authoring/adaptive.d.ts:191

The build-time plan (member ids, compiled CSS, attrs).

#### Returns

`AdaptivePlan`

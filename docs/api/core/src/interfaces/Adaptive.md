[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Adaptive

# Interface: Adaptive

Defined in: [core/src/authoring/adaptive.ts:222](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L222)

A lowered adaptive: the five constructor outputs plus their aggregate content
address and three pure projections (`attrs`, `explain`, `plan`). Each member
IS the hand-lowered constructor output — same content address, and for the
quantizer the SAME object the configCache returns.

## Properties

### boundary

> `readonly` **boundary**: [`Boundary`](../type-aliases/Boundary.md)

Defined in: [core/src/authoring/adaptive.ts:224](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L224)

`defineBoundary(spec.boundary)`.

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [core/src/authoring/adaptive.ts:234](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L234)

FNV-1a content address of normalized tier + `{ boundary, style, quantizer, tokens, theme }` ids.

***

### quantizer?

> `readonly` `optional` **quantizer?**: `AdaptiveQuantizerConfig`\<[`Boundary`](../type-aliases/Boundary.md)\>

Defined in: [core/src/authoring/adaptive.ts:228](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L228)

`defineQuantizer(boundary, spec.quantize)` — undefined when `spec.quantize` is omitted.

***

### style

> `readonly` **style**: [`Style`](../type-aliases/Style.md)

Defined in: [core/src/authoring/adaptive.ts:226](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L226)

`defineStyle({ boundary, ...spec.style })`.

***

### theme?

> `readonly` `optional` **theme?**: [`Theme`](../type-aliases/Theme.md)

Defined in: [core/src/authoring/adaptive.ts:232](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L232)

`defineTheme(spec.theme)` — undefined when `spec.theme` is omitted.

***

### tokens?

> `readonly` `optional` **tokens?**: readonly [`Token`](../type-aliases/Token.md)[]

Defined in: [core/src/authoring/adaptive.ts:230](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L230)

`spec.tokens.map(defineToken)` — undefined when `spec.tokens` is omitted.

## Methods

### attrs()

> **attrs**(): `Record`\<`string`, `string`\>

Defined in: [core/src/authoring/adaptive.ts:236](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L236)

The headless DOM attr set a boundary-aware consumer needs.

#### Returns

`Record`\<`string`, `string`\>

***

### explain()

> **explain**(`value`): [`AdaptiveExplanation`](AdaptiveExplanation.md)

Defined in: [core/src/authoring/adaptive.ts:238](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L238)

Explain the adaptive at one input value (state, matched thresholds, quantized, style, tier).

#### Parameters

##### value

`number`

#### Returns

[`AdaptiveExplanation`](AdaptiveExplanation.md)

***

### plan()

> **plan**(): [`AdaptivePlan`](AdaptivePlan.md)

Defined in: [core/src/authoring/adaptive.ts:240](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L240)

The build-time plan (member ids, compiled CSS, attrs).

#### Returns

[`AdaptivePlan`](AdaptivePlan.md)

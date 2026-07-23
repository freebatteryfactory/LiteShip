[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / AdaptivePlan

# Interface: AdaptivePlan

Defined in: [core/src/authoring/adaptive.ts:202](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L202)

The build-time plan of an adaptive: the member content addresses, the compiled
CSS (the `@layer`-wrapped boundary + style CSS), and the headless DOM attrs.
Everything projects from the members — no recomputation of identity.

## Properties

### attrs

> `readonly` **attrs**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [core/src/authoring/adaptive.ts:209](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L209)

The headless boundary attr set (`Adaptive.attrs()`).

***

### boundaryId

> `readonly` **boundaryId**: `ContentAddress`

Defined in: [core/src/authoring/adaptive.ts:203](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L203)

***

### css

> `readonly` **css**: `string`

Defined in: [core/src/authoring/adaptive.ts:207](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L207)

`StyleCSSCompiler.compile(style).layers` — the cascade-layered scoped CSS.

***

### quantizerId?

> `readonly` `optional` **quantizerId?**: `ContentAddress`

Defined in: [core/src/authoring/adaptive.ts:205](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L205)

***

### styleId

> `readonly` **styleId**: `ContentAddress`

Defined in: [core/src/authoring/adaptive.ts:204](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L204)

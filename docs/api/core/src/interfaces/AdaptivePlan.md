[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / AdaptivePlan

# Interface: AdaptivePlan

Defined in: [core/src/authoring/adaptive.ts:164](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L164)

The build-time plan of an adaptive: the member content addresses, the compiled
CSS (the `@layer`-wrapped boundary + style CSS), and the headless DOM attrs.
Everything projects from the members — no recomputation of identity.

## Properties

### attrs

> `readonly` **attrs**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [core/src/authoring/adaptive.ts:171](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L171)

The headless boundary attr set (`Adaptive.attrs()`).

***

### boundaryId

> `readonly` **boundaryId**: `ContentAddress`

Defined in: [core/src/authoring/adaptive.ts:165](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L165)

***

### css

> `readonly` **css**: `string`

Defined in: [core/src/authoring/adaptive.ts:169](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L169)

`StyleCSSCompiler.compile(style).layers` — the cascade-layered scoped CSS.

***

### quantizerId?

> `readonly` `optional` **quantizerId?**: `ContentAddress`

Defined in: [core/src/authoring/adaptive.ts:167](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L167)

***

### styleId

> `readonly` **styleId**: `ContentAddress`

Defined in: [core/src/authoring/adaptive.ts:166](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L166)

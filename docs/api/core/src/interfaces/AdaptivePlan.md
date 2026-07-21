[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / AdaptivePlan

# Interface: AdaptivePlan

Defined in: [core/src/authoring/adaptive.ts:172](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L172)

The build-time plan of an adaptive: the member content addresses, the compiled
CSS (the `@layer`-wrapped boundary + style CSS), and the headless DOM attrs.
Everything projects from the members — no recomputation of identity.

## Properties

### attrs

> `readonly` **attrs**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [core/src/authoring/adaptive.ts:179](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L179)

The headless boundary attr set (`Adaptive.attrs()`).

***

### boundaryId

> `readonly` **boundaryId**: `ContentAddress`

Defined in: [core/src/authoring/adaptive.ts:173](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L173)

***

### css

> `readonly` **css**: `string`

Defined in: [core/src/authoring/adaptive.ts:177](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L177)

`StyleCSSCompiler.compile(style).layers` — the cascade-layered scoped CSS.

***

### quantizerId?

> `readonly` `optional` **quantizerId?**: `ContentAddress`

Defined in: [core/src/authoring/adaptive.ts:175](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L175)

***

### styleId

> `readonly` **styleId**: `ContentAddress`

Defined in: [core/src/authoring/adaptive.ts:174](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L174)

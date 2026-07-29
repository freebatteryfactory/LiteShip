[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / AdaptivePlan

# Interface: AdaptivePlan

Defined in: [core/src/authoring/adaptive.ts:204](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L204)

The build-time plan of an adaptive: the member content addresses, the compiled
CSS (the `@layer`-wrapped boundary + style CSS), and the headless DOM attrs.
Everything projects from the members — no recomputation of identity.

## Properties

### attrs

> `readonly` **attrs**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [core/src/authoring/adaptive.ts:211](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L211)

The headless boundary attr set (`Adaptive.attrs()`).

***

### boundaryId

> `readonly` **boundaryId**: [`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

Defined in: [core/src/authoring/adaptive.ts:205](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L205)

***

### css

> `readonly` **css**: `string`

Defined in: [core/src/authoring/adaptive.ts:209](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L209)

Compiler-owned CSS driven by this Adaptive's runtime state marker.

***

### quantizerId?

> `readonly` `optional` **quantizerId?**: [`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

Defined in: [core/src/authoring/adaptive.ts:207](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L207)

***

### styleId

> `readonly` **styleId**: [`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

Defined in: [core/src/authoring/adaptive.ts:206](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/adaptive.ts#L206)

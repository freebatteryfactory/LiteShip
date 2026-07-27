[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / EdgeHostCompileContext

# Interface: EdgeHostCompileContext

Defined in: [\_spine/edge.d.ts:224](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L224)

Edge host context extended with the selected manifest entry and tiers.

## Extends

- [`EdgeHostContext`](EdgeHostContext.md)

## Properties

### boundaryId

> `readonly` **boundaryId**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/edge.d.ts:226](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L226)

***

### boundaryName?

> `readonly` `optional` **boundaryName?**: `string`

Defined in: [\_spine/edge.d.ts:227](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L227)

***

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](ExtendedDeviceCapabilities.md)

Defined in: [\_spine/edge.d.ts:219](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L219)

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`capabilities`](EdgeHostContext.md#capabilities)

***

### theme?

> `readonly` `optional` **theme?**: [`ThemeCompileResult`](ThemeCompileResult.md)

Defined in: [\_spine/edge.d.ts:225](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L225)

***

### tier

> `readonly` **tier**: [`EdgeTierResult`](EdgeTierResult.md)

Defined in: [\_spine/edge.d.ts:220](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L220)

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`tier`](EdgeHostContext.md#tier)

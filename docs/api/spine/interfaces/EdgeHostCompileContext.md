[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / EdgeHostCompileContext

# Interface: EdgeHostCompileContext

Defined in: [\_spine/edge.d.ts:244](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L244)

Edge host context extended with the selected manifest entry and tiers.

## Extends

- [`EdgeHostContext`](EdgeHostContext.md)

## Properties

### boundaryId

> `readonly` **boundaryId**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/edge.d.ts:246](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L246)

***

### boundaryName?

> `readonly` `optional` **boundaryName?**: `string`

Defined in: [\_spine/edge.d.ts:247](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L247)

***

### capabilities

> `readonly` **capabilities**: [`ExtendedDeviceCapabilities`](ExtendedDeviceCapabilities.md)

Defined in: [\_spine/edge.d.ts:239](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L239)

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`capabilities`](EdgeHostContext.md#capabilities)

***

### theme?

> `readonly` `optional` **theme?**: [`ThemeCompileResult`](ThemeCompileResult.md)

Defined in: [\_spine/edge.d.ts:245](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L245)

***

### tier

> `readonly` **tier**: [`EdgeTierResult`](EdgeTierResult.md)

Defined in: [\_spine/edge.d.ts:240](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L240)

#### Inherited from

[`EdgeHostContext`](EdgeHostContext.md).[`tier`](EdgeHostContext.md#tier)

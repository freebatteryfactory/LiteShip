[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / buildResponsiveImageSet

# Function: buildResponsiveImageSet()

> **buildResponsiveImageSet**(`variants`): `string`

Defined in: [core/src/responsive-media.ts:115](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/responsive-media.ts#L115)

Build a CSS `image-set()` value from variants (native CSS first).

Uses `type()` only when variants carry standard image extensions; unknown
types are omitted rather than guessed.

## Parameters

### variants

readonly [`ResponsiveMediaVariant`](../interfaces/ResponsiveMediaVariant.md)[]

## Returns

`string`

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / buildResponsiveImageSet

# Function: buildResponsiveImageSet()

> **buildResponsiveImageSet**(`variants`, `baseWidth?`): `string`

Defined in: [core/src/responsive-media.ts:122](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/responsive-media.ts#L122)

Build a CSS `image-set()` value from variants (native CSS first).

Uses `type()` only when variants carry standard image extensions; unknown
types are omitted rather than guessed.

## Parameters

### variants

readonly [`ResponsiveMediaVariant`](../interfaces/ResponsiveMediaVariant.md)[]

### baseWidth?

`number`

## Returns

`string`

[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/media](../README.md) / buildResponsiveImageSet

# Function: buildResponsiveImageSet()

> **buildResponsiveImageSet**(`variants`, `baseWidth?`): `string`

Defined in: core/dist/media/responsive-media.d.ts:86

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

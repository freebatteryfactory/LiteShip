[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / buildResponsiveSrcset

# Function: buildResponsiveSrcset()

> **buildResponsiveSrcset**(`variants`, `baseWidth?`): `string`

Defined in: [core/src/responsive-media.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/responsive-media.ts#L90)

Build a `srcset` string from variants with `w` or `x` descriptors.

Variants without enough metadata are skipped; result is empty when none qualify.

## Parameters

### variants

readonly [`ResponsiveMediaVariant`](../interfaces/ResponsiveMediaVariant.md)[]

### baseWidth?

`number`

## Returns

`string`

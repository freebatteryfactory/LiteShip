[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/media](../README.md) / buildResponsiveSrcset

# Function: buildResponsiveSrcset()

> **buildResponsiveSrcset**(`variants`, `baseWidth?`): `string`

Defined in: core/dist/media/responsive-media.d.ts:79

Build a `srcset` string from variants with `w` or `x` descriptors.

Variants without enough metadata are skipped; result is empty when none qualify.

## Parameters

### variants

readonly [`ResponsiveMediaVariant`](../interfaces/ResponsiveMediaVariant.md)[]

### baseWidth?

`number`

## Returns

`string`

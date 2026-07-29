[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/schema](../README.md) / ContentAddress

# Variable: ContentAddress

> **ContentAddress**: (`value`) => [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/schema/brands.d.ts:25

Wrap a plain string as a ContentAddress.

## Parameters

### value

`string`

## Returns

[`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

## Throws

`ValidationError` when `value` is not `fnv1a:` + 8 lowercase hex.

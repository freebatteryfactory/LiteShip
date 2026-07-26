[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / ContentAddress

# Variable: ContentAddress

> **ContentAddress**: (`value`) => `ContentAddress`

Defined in: core/dist/schema/brands.d.ts:25

Wrap a plain string as a ContentAddress.

## Parameters

### value

`string`

## Returns

`ContentAddress`

## Throws

`ValidationError` when `value` is not `fnv1a:` + 8 lowercase hex.

[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/genui](../README.md) / ContentAddress

# Variable: ContentAddress

> **ContentAddress**: (`value`) => `ContentAddress`

Defined in: genui/dist/brands.d.ts:12

Wrap canonical fnv1a bytes as a spine ContentAddress.

## Parameters

### value

`string`

## Returns

`ContentAddress`

## Throws

`ValidationError` when `value` is not `fnv1a:` + 8 lowercase hex.

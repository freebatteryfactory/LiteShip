[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [genui/src](../README.md) / ContentAddress

# Variable: ContentAddress

> **ContentAddress**: (`value`) => [`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

Defined in: [genui/src/brands.ts:15](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/genui/src/brands.ts#L15)

Wrap canonical fnv1a bytes as a spine ContentAddress.

## Parameters

### value

`string`

## Returns

[`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

## Throws

`ValidationError` when `value` is not `fnv1a:` + 8 lowercase hex.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ContentAddress

# Variable: ContentAddress

> **ContentAddress**: (`value`) => `ContentAddress`

Defined in: [core/src/schema/brands.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/brands.ts#L42)

Wrap a plain string as a ContentAddress.

## Parameters

### value

`string`

## Returns

`ContentAddress`

## Throws

`ValidationError` when `value` is not `fnv1a:` + 8 lowercase hex.

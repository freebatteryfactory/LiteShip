[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [canonical/src](../README.md) / ContentAddress

# Variable: ContentAddress

> **ContentAddress**: (`value`) => `` `fnv1a:${string}` ``

Defined in: [canonical/src/brands.ts:19](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/canonical/src/brands.ts#L19)

Parse a plain string into a ContentAddress.

## Parameters

### value

`string`

## Returns

`` `fnv1a:${string}` ``

## Throws

`ValidationError` when `value` is not `fnv1a:` + 8 lowercase hex.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / IntegrityDigest

# Variable: IntegrityDigest

> **IntegrityDigest**: (`value`) => `IntegrityDigest`

Defined in: [core/src/schema/brands.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/brands.ts#L48)

Wrap a plain string as an IntegrityDigest.

## Parameters

### value

`string`

## Returns

`IntegrityDigest`

## Throws

`ValidationError` when `value` is not `(sha256|blake3):` + 64 lowercase hex.

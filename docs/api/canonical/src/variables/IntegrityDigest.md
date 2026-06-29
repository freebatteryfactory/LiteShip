[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [canonical/src](../README.md) / IntegrityDigest

# Variable: IntegrityDigest

> **IntegrityDigest**: (`value`) => [`IntegrityDigest`](../type-aliases/IntegrityDigest.md)

Defined in: [canonical/src/brands.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/canonical/src/brands.ts#L22)

Parse a plain string into an IntegrityDigest.

## Parameters

### value

`string`

## Returns

[`IntegrityDigest`](../type-aliases/IntegrityDigest.md)

## Throws

`ValidationError` when `value` is not `sha256:`/`blake3:` + 64 lowercase hex.

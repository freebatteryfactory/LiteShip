[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/schema](../README.md) / IntegrityDigest

# Variable: IntegrityDigest

> **IntegrityDigest**: (`value`) => [`IntegrityDigest`](../../../../spine/type-aliases/IntegrityDigest.md)

Defined in: core/dist/schema/brands.d.ts:30

Wrap a plain string as an IntegrityDigest.

## Parameters

### value

`string`

## Returns

[`IntegrityDigest`](../../../../spine/type-aliases/IntegrityDigest.md)

## Throws

`ValidationError` when `value` is not `(sha256|blake3):` + 64 lowercase hex.

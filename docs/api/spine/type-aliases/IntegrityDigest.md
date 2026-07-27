[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / IntegrityDigest

# Type Alias: IntegrityDigest

> **IntegrityDigest** = `string` & `object`

Defined in: [\_spine/core.d.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L83)

Cryptographic content digest. Format: `sha256:<64-hex>` or `blake3:<64-hex>`.
The algorithmic complement to [ContentAddress](ContentAddress.md): same canonical bytes,
stronger hash. Carried by [AddressedDigest](../interfaces/AddressedDigest.md) on external/release
artifacts where collision resistance matters (see ADR-0011).

## Type Declaration

### \[IntegrityDigestBrand\]

> `readonly` **\[IntegrityDigestBrand\]**: `true`

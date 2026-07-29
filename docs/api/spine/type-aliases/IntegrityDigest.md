[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / IntegrityDigest

# Type Alias: IntegrityDigest

> **IntegrityDigest** = `string` & `object`

Defined in: [\_spine/core.d.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L90)

Cryptographic content digest. Format: `sha256:<64-hex>` or `blake3:<64-hex>`.
The algorithmic complement to [ContentAddress](ContentAddress.md): same canonical bytes,
stronger hash. Carried by [AddressedDigest](../interfaces/AddressedDigest.md) on external/release
artifacts, where a 32-bit fnv1a label is an ergonomic identity but never
tamper evidence against an attacker who can influence the bytes.

## Type Declaration

### \[IntegrityDigestBrand\]

> `readonly` **\[IntegrityDigestBrand\]**: `true`

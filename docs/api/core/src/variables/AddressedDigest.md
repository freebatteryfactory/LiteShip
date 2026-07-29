[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / AddressedDigest

# Variable: AddressedDigest

> **AddressedDigest**: `object`

Defined in: [core/src/evidence/addressed-digest.ts:14](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/addressed-digest.ts#L14)

Namespace surface: call [AddressedDigest.of](#of) to mint a digest pair from raw bytes.

## Type Declaration

### of

> **of**: (`bytes`, `algo`) => [`AddressedDigest`](../../../spine/interfaces/AddressedDigest.md) = `addressedDigestOfCore`

Derive an AddressedDigest from raw bytes (sync).

#### Parameters

##### bytes

`Uint8Array`

##### algo?

`"sha256"` \| `"blake3"`

#### Returns

[`AddressedDigest`](../../../spine/interfaces/AddressedDigest.md)

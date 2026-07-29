[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/evidence](../README.md) / AddressedDigest

# Variable: AddressedDigest

> **AddressedDigest**: `object`

Defined in: core/dist/evidence/addressed-digest.d.ts:10

Namespace surface: call [AddressedDigest.of](#of) to mint a digest pair from raw bytes.

## Type Declaration

### of

> **of**: (`bytes`, `algo?`) => [`AddressedDigest`](../../../../spine/interfaces/AddressedDigest.md)

Derive an AddressedDigest from raw bytes (sync).

#### Parameters

##### bytes

`Uint8Array`

##### algo?

`"sha256"` \| `"blake3"`

#### Returns

[`AddressedDigest`](../../../../spine/interfaces/AddressedDigest.md)

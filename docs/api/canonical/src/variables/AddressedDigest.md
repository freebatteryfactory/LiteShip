[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [canonical/src](../README.md) / AddressedDigest

# Variable: AddressedDigest

> **AddressedDigest**: `object`

Defined in: [canonical/src/addressed-digest.ts:15](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/canonical/src/addressed-digest.ts#L15)

Namespace surface: call [AddressedDigest.of](#of) to mint a digest pair from raw bytes.

## Type Declaration

### of

> **of**: (`bytes`, `algo`) => [`AddressedDigest`](../interfaces/AddressedDigest.md) = `addressedDigestOf`

Derive an AddressedDigest from raw bytes. Supports `sha256` and `blake3`.

#### Parameters

##### bytes

`Uint8Array`

##### algo?

`"sha256"` \| `"blake3"`

#### Returns

[`AddressedDigest`](../interfaces/AddressedDigest.md)

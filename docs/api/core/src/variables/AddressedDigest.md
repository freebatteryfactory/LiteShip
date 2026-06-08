[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / AddressedDigest

# Variable: AddressedDigest

> **AddressedDigest**: `object`

Defined in: [core/src/addressed-digest.ts:15](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/addressed-digest.ts#L15)

Namespace surface: call [AddressedDigest.of](#of) to mint a digest pair from raw bytes.

## Type Declaration

### of

> **of**: (`bytes`, `algo`) => `Effect`\<`AddressedDigest`, `Error`\> = `AddressedDigestOf`

Derive an AddressedDigest from raw bytes. Supports `sha256` and `blake3`.

#### Parameters

##### bytes

`Uint8Array`

##### algo?

`"sha256"` \| `"blake3"`

#### Returns

`Effect`\<`AddressedDigest`, `Error`\>

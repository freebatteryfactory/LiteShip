[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [canonical/src](../README.md) / addressedDigestOf

# Function: addressedDigestOf()

> **addressedDigestOf**(`bytes`, `algo?`): [`AddressedDigest`](../interfaces/AddressedDigest.md)

Defined in: [canonical/src/addressed-digest.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/canonical/src/addressed-digest.ts#L30)

Derive an [AddressedDigest](../variables/AddressedDigest.md) from raw bytes. Supports `sha256` and `blake3`.

## Parameters

### bytes

`Uint8Array`

### algo?

`"sha256"` \| `"blake3"`

## Returns

[`AddressedDigest`](../interfaces/AddressedDigest.md)

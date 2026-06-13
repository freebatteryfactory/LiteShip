[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / contentAddressOf

# Function: contentAddressOf()

> **contentAddressOf**(`value`): `ContentAddress`

Defined in: [core/src/content-address.ts:63](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/content-address.ts#L63)

Mint a [ContentAddress](../variables/ContentAddress.md) (fnv1a over canonical CBOR) — the one identity
kernel (CUT B1). The mint expression is written explicitly (not via
canonicalAddressBytes) so the canonical-identity source guard can see
that identity is paired with `CanonicalCbor`, never cborg / JSON.

## Parameters

### value

`unknown`

## Returns

`ContentAddress`

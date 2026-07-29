[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/evidence](../README.md) / contentAddressOf

# Function: contentAddressOf()

> **contentAddressOf**(`value`): [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/evidence/content-address.d.ts:31

Mint a [ContentAddress](../../schema/variables/ContentAddress.md) (fnv1a over canonical CBOR) — the one identity
kernel (CUT B1). The mint expression is written explicitly (not via
[canonicalAddressBytes](canonicalAddressBytes.md)) so the canonical-identity source guard can see
that identity is paired with `CanonicalCbor`, never cborg / JSON.

## Parameters

### value

`unknown`

## Returns

[`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

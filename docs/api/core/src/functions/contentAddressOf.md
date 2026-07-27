[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / contentAddressOf

# Function: contentAddressOf()

> **contentAddressOf**(`value`): [`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

Defined in: [core/src/evidence/content-address.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/content-address.ts#L81)

Mint a [ContentAddress](../variables/ContentAddress.md) (fnv1a over canonical CBOR) — the one identity
kernel (CUT B1). The mint expression is written explicitly (not via
[canonicalAddressBytes](canonicalAddressBytes.md)) so the canonical-identity source guard can see
that identity is paired with `CanonicalCbor`, never cborg / JSON.

## Parameters

### value

`unknown`

## Returns

[`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / canonicalAddressBytes

# Function: canonicalAddressBytes()

> **canonicalAddressBytes**(`value`): `Uint8Array`

Defined in: [core/src/evidence/content-address.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/content-address.ts#L53)

Canonical CBOR bytes for a value — the shared byte sequence both a fnv1a
identity ([contentAddressOf](contentAddressOf.md)) and a sha256 integrity digest
(`AddressedDigest.of`) derive from, so the two laws cannot disagree.

## Parameters

### value

`unknown`

## Returns

`Uint8Array`

[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/evidence](../README.md) / canonicalAddressBytes

# Function: canonicalAddressBytes()

> **canonicalAddressBytes**(`value`): `Uint8Array`

Defined in: core/dist/evidence/content-address.d.ts:24

Canonical CBOR bytes for a value — the shared byte sequence both a fnv1a
identity ([contentAddressOf](contentAddressOf.md)) and a sha256 integrity digest
(`AddressedDigest.of`) derive from, so the two laws cannot disagree.

## Parameters

### value

`unknown`

## Returns

`Uint8Array`

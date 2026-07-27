[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / AddressedDigest

# Interface: AddressedDigest

Defined in: [\_spine/core.d.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L92)

A pair of hashes over the same canonical bytes: the ergonomic identity
([ContentAddress](../type-aliases/ContentAddress.md), fnv1a) plus a cryptographic digest
([IntegrityDigest](../type-aliases/IntegrityDigest.md), sha256 or blake3). Used by external-artifact
carriers like ShipCapsule (ADR-0011). `algo` records which hash family
minted the integrity digest; v0.1.0 emits `sha256`, v0.2 will emit `blake3`.

## Properties

### algo

> `readonly` **algo**: `"sha256"` \| `"blake3"`

Defined in: [\_spine/core.d.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L95)

***

### display\_id

> `readonly` **display\_id**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/core.d.ts:93](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L93)

***

### integrity\_digest

> `readonly` **integrity\_digest**: [`IntegrityDigest`](../type-aliases/IntegrityDigest.md)

Defined in: [\_spine/core.d.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L94)

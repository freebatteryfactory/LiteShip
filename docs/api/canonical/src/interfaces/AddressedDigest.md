[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [canonical/src](../README.md) / AddressedDigest

# Interface: AddressedDigest

Defined in: [canonical/src/addressed-digest.ts:15](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/canonical/src/addressed-digest.ts#L15)

Pair of identity hash + cryptographic digest over the same canonical bytes.

## Properties

### algo

> `readonly` **algo**: `"sha256"` \| `"blake3"`

Defined in: [canonical/src/addressed-digest.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/canonical/src/addressed-digest.ts#L18)

***

### display\_id

> `readonly` **display\_id**: `` `fnv1a:${string}` ``

Defined in: [canonical/src/addressed-digest.ts:16](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/canonical/src/addressed-digest.ts#L16)

***

### integrity\_digest

> `readonly` **integrity\_digest**: [`IntegrityDigest`](../type-aliases/IntegrityDigest.md)

Defined in: [canonical/src/addressed-digest.ts:17](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/canonical/src/addressed-digest.ts#L17)

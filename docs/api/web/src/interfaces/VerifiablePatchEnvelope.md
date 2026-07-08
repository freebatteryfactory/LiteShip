[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / VerifiablePatchEnvelope

# Interface: VerifiablePatchEnvelope

Defined in: [web/src/dpu/watch-and-prepare.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L48)

Stamped verifiable-patch envelope — marker + CAS base/result ids + sha256 digest
over the HTML fragment bytes (meta excluded; same law as graph 304 validators).

## Properties

### baseGraphId

> `readonly` **baseGraphId**: `ContentAddress`

Defined in: [web/src/dpu/watch-and-prepare.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L51)

***

### digest

> `readonly` **digest**: `AddressedDigest`

Defined in: [web/src/dpu/watch-and-prepare.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L53)

***

### html

> `readonly` **html**: `string`

Defined in: [web/src/dpu/watch-and-prepare.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L54)

***

### marker

> `readonly` **marker**: `string`

Defined in: [web/src/dpu/watch-and-prepare.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L50)

Stable logical marker name (from `nodeLogicalKey`), never a node id.

***

### resultGraphId

> `readonly` **resultGraphId**: `ContentAddress`

Defined in: [web/src/dpu/watch-and-prepare.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L52)

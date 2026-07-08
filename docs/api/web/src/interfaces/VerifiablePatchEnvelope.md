[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / VerifiablePatchEnvelope

# Interface: VerifiablePatchEnvelope

Defined in: [web/src/dpu/watch-and-prepare.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L41)

Stamped verifiable-patch envelope — marker + CAS base/result ids + sha256 digest
over the HTML fragment bytes (meta excluded; same law as graph 304 validators).

## Properties

### baseGraphId

> `readonly` **baseGraphId**: `ContentAddress`

Defined in: [web/src/dpu/watch-and-prepare.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L44)

***

### digest

> `readonly` **digest**: `AddressedDigest`

Defined in: [web/src/dpu/watch-and-prepare.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L46)

***

### html

> `readonly` **html**: `string`

Defined in: [web/src/dpu/watch-and-prepare.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L47)

***

### marker

> `readonly` **marker**: `string`

Defined in: [web/src/dpu/watch-and-prepare.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L43)

Stable logical marker name (from `nodeLogicalKey`), never a node id.

***

### resultGraphId

> `readonly` **resultGraphId**: `ContentAddress`

Defined in: [web/src/dpu/watch-and-prepare.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L45)

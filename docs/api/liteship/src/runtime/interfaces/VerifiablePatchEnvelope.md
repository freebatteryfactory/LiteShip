[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / VerifiablePatchEnvelope

# Interface: VerifiablePatchEnvelope

Defined in: web/dist/dpu/watch-and-prepare.d.ts:44

Stamped verifiable-patch envelope — marker + CAS base/result ids + sha256 digest
over the HTML fragment bytes (meta excluded; same law as graph 304 validators).

## Properties

### baseGraphId

> `readonly` **baseGraphId**: `ContentAddress`

Defined in: web/dist/dpu/watch-and-prepare.d.ts:47

***

### digest

> `readonly` **digest**: `AddressedDigest`

Defined in: web/dist/dpu/watch-and-prepare.d.ts:49

***

### html

> `readonly` **html**: `string`

Defined in: web/dist/dpu/watch-and-prepare.d.ts:50

***

### marker

> `readonly` **marker**: `string`

Defined in: web/dist/dpu/watch-and-prepare.d.ts:46

Stable logical marker name (from `nodeLogicalKey`), never a node id.

***

### resultGraphId

> `readonly` **resultGraphId**: `ContentAddress`

Defined in: web/dist/dpu/watch-and-prepare.d.ts:48

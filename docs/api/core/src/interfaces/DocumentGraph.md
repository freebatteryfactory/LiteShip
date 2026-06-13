[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DocumentGraph

# Interface: DocumentGraph

Defined in: [core/src/document-graph.ts:168](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L168)

The top-level addressable graph. Two-law addressing (ADR-0003/0011): `id` is
the `fnv1a` identity (dedup), `digest` is the paired `fnv1a`+`sha256`
`AddressedDigest` (receipts / exports) — both derived from one CanonicalCbor
byte sequence over the sorted node ids + edges, so they cannot disagree.

## Properties

### \_tag

> `readonly` **\_tag**: `"DocumentGraph"`

Defined in: [core/src/document-graph.ts:169](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L169)

***

### \_version

> `readonly` **\_version**: `1`

Defined in: [core/src/document-graph.ts:170](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L170)

***

### digest

> `readonly` **digest**: `AddressedDigest`

Defined in: [core/src/document-graph.ts:172](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L172)

***

### edges

> `readonly` **edges**: readonly [`DocumentGraphEdge`](DocumentGraphEdge.md)[]

Defined in: [core/src/document-graph.ts:175](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L175)

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [core/src/document-graph.ts:171](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L171)

***

### meta

> `readonly` **meta**: [`CellMeta`](CellMeta.md)

Defined in: [core/src/document-graph.ts:173](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L173)

***

### nodes

> `readonly` **nodes**: readonly [`DocumentGraphNode`](../type-aliases/DocumentGraphNode.md)[]

Defined in: [core/src/document-graph.ts:174](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L174)

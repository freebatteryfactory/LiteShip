[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / DocumentGraph

# Interface: DocumentGraph

Defined in: [core/src/graph/document-graph.ts:170](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L170)

The top-level addressable graph. Two-law addressing: `id` is
the `fnv1a` identity (dedup), `digest` is the paired `fnv1a`+`sha256`
`AddressedDigest` (receipts / exports) — both derived from one CanonicalCbor
byte sequence over the sorted node ids + edges, so they cannot disagree.

## Properties

### \_tag

> `readonly` **\_tag**: `"DocumentGraph"`

Defined in: [core/src/graph/document-graph.ts:171](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L171)

***

### \_version

> `readonly` **\_version**: `1`

Defined in: [core/src/graph/document-graph.ts:172](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L172)

***

### digest

> `readonly` **digest**: [`AddressedDigest`](../../../spine/interfaces/AddressedDigest.md)

Defined in: [core/src/graph/document-graph.ts:174](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L174)

***

### edges

> `readonly` **edges**: readonly [`DocumentGraphEdge`](DocumentGraphEdge.md)[]

Defined in: [core/src/graph/document-graph.ts:177](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L177)

***

### id

> `readonly` **id**: [`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

Defined in: [core/src/graph/document-graph.ts:173](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L173)

***

### meta

> `readonly` **meta**: [`CellMeta`](CellMeta.md)

Defined in: [core/src/graph/document-graph.ts:175](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L175)

***

### nodes

> `readonly` **nodes**: readonly [`DocumentGraphNode`](../type-aliases/DocumentGraphNode.md)[]

Defined in: [core/src/graph/document-graph.ts:176](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L176)

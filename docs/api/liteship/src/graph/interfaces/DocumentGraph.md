[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / DocumentGraph

# Interface: DocumentGraph

Defined in: core/dist/graph/document-graph.d.ts:154

The top-level addressable graph. Two-law addressing (ADR-0003/0011): `id` is
the `fnv1a` identity (dedup), `digest` is the paired `fnv1a`+`sha256`
`AddressedDigest` (receipts / exports) — both derived from one CanonicalCbor
byte sequence over the sorted node ids + edges, so they cannot disagree.

## Properties

### \_tag

> `readonly` **\_tag**: `"DocumentGraph"`

Defined in: core/dist/graph/document-graph.d.ts:155

***

### \_version

> `readonly` **\_version**: `1`

Defined in: core/dist/graph/document-graph.d.ts:156

***

### digest

> `readonly` **digest**: [`AddressedDigest`](../../../../spine/interfaces/AddressedDigest.md)

Defined in: core/dist/graph/document-graph.d.ts:158

***

### edges

> `readonly` **edges**: readonly [`DocumentGraphEdge`](DocumentGraphEdge.md)[]

Defined in: core/dist/graph/document-graph.d.ts:161

***

### id

> `readonly` **id**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/graph/document-graph.d.ts:157

***

### meta

> `readonly` **meta**: [`CellMeta`](../../schema/interfaces/CellMeta.md)

Defined in: core/dist/graph/document-graph.d.ts:159

***

### nodes

> `readonly` **nodes**: readonly [`DocumentGraphNode`](../type-aliases/DocumentGraphNode.md)[]

Defined in: core/dist/graph/document-graph.d.ts:160

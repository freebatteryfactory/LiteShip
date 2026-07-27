[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / ExportNode

# Interface: ExportNode

Defined in: core/dist/graph/document-graph.d.ts:129

8. Export — NET-NEW. An egress ADDRESS node: it carries the digest of a
resolved artifact (and optional receipt-chain head), not the bytes. This is
the seam the P4 dual-export proof binds to.

## Extends

- `NodeBase`\<`"export"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphExportNode"`

Defined in: core/dist/graph/document-graph.d.ts:45

#### Inherited from

`NodeBase._tag`

***

### \_version

> `readonly` **\_version**: `1`

Defined in: core/dist/graph/document-graph.d.ts:46

#### Inherited from

`NodeBase._version`

***

### artifactDigest

> `readonly` **artifactDigest**: [`AddressedDigest`](../../../../spine/interfaces/AddressedDigest.md)

Defined in: core/dist/graph/document-graph.d.ts:132

***

### carrier

> `readonly` **carrier**: `"svg"` \| `"astro-page"` \| `"video"` \| `"ship-capsule"` \| `"receipt"`

Defined in: core/dist/graph/document-graph.d.ts:130

***

### family

> `readonly` **family**: `"export"`

Defined in: core/dist/graph/document-graph.d.ts:47

#### Inherited from

`NodeBase.family`

***

### id

> `readonly` **id**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/graph/document-graph.d.ts:49

`fnv1a` content address over the node payload (set by `addressNode`/`sealNode`).

#### Inherited from

`NodeBase.id`

***

### meta

> `readonly` **meta**: [`CellMeta`](../../schema/interfaces/CellMeta.md)

Defined in: core/dist/graph/document-graph.d.ts:51

HLC created/updated + version. Excluded from the content address (volatile).

#### Inherited from

`NodeBase.meta`

***

### receiptHash?

> `readonly` `optional` **receiptHash?**: `string`

Defined in: core/dist/graph/document-graph.d.ts:134

sha256 receipt-chain head (the receipt byte law / `TypedRef`), distinct from `id`'s fnv1a law.

***

### sourceRefs

> `readonly` **sourceRefs**: readonly [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)[]

Defined in: core/dist/graph/document-graph.d.ts:131

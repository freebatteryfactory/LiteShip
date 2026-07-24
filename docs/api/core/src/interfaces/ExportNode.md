[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ExportNode

# Interface: ExportNode

Defined in: [core/src/graph/document-graph.ts:141](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L141)

8. Export — NET-NEW. An egress ADDRESS node: it carries the digest of a
resolved artifact (and optional receipt-chain head), not the bytes. This is
the seam the P4 dual-export proof binds to.

## Extends

- `NodeBase`\<`"export"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphExportNode"`

Defined in: [core/src/graph/document-graph.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L49)

#### Inherited from

`NodeBase._tag`

***

### \_version

> `readonly` **\_version**: `1`

Defined in: [core/src/graph/document-graph.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L50)

#### Inherited from

`NodeBase._version`

***

### artifactDigest

> `readonly` **artifactDigest**: `AddressedDigest`

Defined in: [core/src/graph/document-graph.ts:144](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L144)

***

### carrier

> `readonly` **carrier**: `"svg"` \| `"astro-page"` \| `"video"` \| `"ship-capsule"` \| `"receipt"`

Defined in: [core/src/graph/document-graph.ts:142](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L142)

***

### family

> `readonly` **family**: `"export"`

Defined in: [core/src/graph/document-graph.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L51)

#### Inherited from

`NodeBase.family`

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [core/src/graph/document-graph.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L53)

`fnv1a` content address over the node payload (set by `addressNode`/`sealNode`).

#### Inherited from

`NodeBase.id`

***

### meta

> `readonly` **meta**: [`CellMeta`](CellMeta.md)

Defined in: [core/src/graph/document-graph.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L55)

HLC created/updated + version. Excluded from the content address (volatile).

#### Inherited from

`NodeBase.meta`

***

### receiptHash?

> `readonly` `optional` **receiptHash?**: `string`

Defined in: [core/src/graph/document-graph.ts:146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L146)

sha256 receipt-chain head (the receipt byte law / `TypedRef`), distinct from `id`'s fnv1a law.

***

### sourceRefs

> `readonly` **sourceRefs**: readonly `ContentAddress`[]

Defined in: [core/src/graph/document-graph.ts:143](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L143)

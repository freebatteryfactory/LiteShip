[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ExportNode

# Interface: ExportNode

Defined in: [core/src/document-graph.ts:132](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L132)

8. Export — NET-NEW. An egress ADDRESS node: it carries the digest of a
resolved artifact (and optional receipt-chain head), not the bytes. This is
the seam the P4 dual-export proof binds to.

## Extends

- `NodeBase`\<`"export"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphExportNode"`

Defined in: [core/src/document-graph.ts:48](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L48)

#### Inherited from

`NodeBase._tag`

***

### \_version

> `readonly` **\_version**: `1`

Defined in: [core/src/document-graph.ts:49](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L49)

#### Inherited from

`NodeBase._version`

***

### artifactDigest

> `readonly` **artifactDigest**: `AddressedDigest`

Defined in: [core/src/document-graph.ts:135](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L135)

***

### carrier

> `readonly` **carrier**: `"svg"` \| `"astro-page"` \| `"video"` \| `"ship-capsule"` \| `"receipt"`

Defined in: [core/src/document-graph.ts:133](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L133)

***

### family

> `readonly` **family**: `"export"`

Defined in: [core/src/document-graph.ts:50](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L50)

#### Inherited from

`NodeBase.family`

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [core/src/document-graph.ts:52](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L52)

`fnv1a` content address over the node payload (set by `addressNode`/`sealNode`).

#### Inherited from

`NodeBase.id`

***

### meta

> `readonly` **meta**: [`CellMeta`](CellMeta.md)

Defined in: [core/src/document-graph.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L54)

HLC created/updated + version. Excluded from the content address (volatile).

#### Inherited from

`NodeBase.meta`

***

### receiptHash?

> `readonly` `optional` **receiptHash?**: `string`

Defined in: [core/src/document-graph.ts:137](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L137)

sha256 receipt-chain head (the receipt byte law / `TypedRef`), distinct from `id`'s fnv1a law.

***

### sourceRefs

> `readonly` **sourceRefs**: readonly `ContentAddress`[]

Defined in: [core/src/document-graph.ts:134](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L134)

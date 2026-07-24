[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / PolicyNode

# Interface: PolicyNode

Defined in: [core/src/graph/document-graph.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L124)

7. Policy — NET-NEW. A pre-projection capability/constraint gate read by the
escalation chooser (P5c). Constrains which projection targets are admissible
given the runtime site, the required [CapTier](../type-aliases/CapTier.md), and optional budgets.

## Extends

- `NodeBase`\<`"policy"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphPolicyNode"`

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

### appliesTo

> `readonly` **appliesTo**: readonly `ContentAddress`[]

Defined in: [core/src/graph/document-graph.ts:125](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L125)

***

### budgets?

> `readonly` `optional` **budgets?**: `object`

Defined in: [core/src/graph/document-graph.ts:129](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L129)

#### allocClass?

> `readonly` `optional` **allocClass?**: `"zero"` \| `"bounded"` \| `"unbounded"`

#### memoryMb?

> `readonly` `optional` **memoryMb?**: `number`

#### p95Ms?

> `readonly` `optional` **p95Ms?**: `number`

***

### family

> `readonly` **family**: `"policy"`

Defined in: [core/src/graph/document-graph.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L51)

#### Inherited from

`NodeBase.family`

***

### grants

> `readonly` **grants**: [`CapSet`](CapSet.md)

Defined in: [core/src/graph/document-graph.ts:127](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L127)

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

### requires

> `readonly` **requires**: [`CapTier`](../type-aliases/CapTier.md)

Defined in: [core/src/graph/document-graph.ts:126](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L126)

***

### sites

> `readonly` **sites**: readonly [`RuntimeSite`](../type-aliases/RuntimeSite.md)[]

Defined in: [core/src/graph/document-graph.ts:128](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L128)

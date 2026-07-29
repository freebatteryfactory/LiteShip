[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / PolicyNode

# Interface: PolicyNode

Defined in: core/dist/graph/document-graph.d.ts:113

7. Policy — NET-NEW. A pre-projection capability/constraint gate read by the
escalation chooser (P5c). Constrains which projection targets are admissible
given the runtime site, the required [CapTier](../../evidence/type-aliases/CapTier.md), and optional budgets.

## Extends

- `NodeBase`\<`"policy"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphPolicyNode"`

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

### appliesTo

> `readonly` **appliesTo**: readonly [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)[]

Defined in: core/dist/graph/document-graph.d.ts:114

***

### budgets?

> `readonly` `optional` **budgets?**: `object`

Defined in: core/dist/graph/document-graph.d.ts:118

#### allocClass?

> `readonly` `optional` **allocClass?**: `"zero"` \| `"bounded"` \| `"unbounded"`

#### memoryMb?

> `readonly` `optional` **memoryMb?**: `number`

#### p95Ms?

> `readonly` `optional` **p95Ms?**: `number`

***

### family

> `readonly` **family**: `"policy"`

Defined in: core/dist/graph/document-graph.d.ts:47

#### Inherited from

`NodeBase.family`

***

### grants

> `readonly` **grants**: [`CapSet`](../../evidence/interfaces/CapSet.md)

Defined in: core/dist/graph/document-graph.d.ts:116

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

### requires

> `readonly` **requires**: [`CapTier`](../../evidence/type-aliases/CapTier.md)

Defined in: core/dist/graph/document-graph.d.ts:115

***

### sites

> `readonly` **sites**: readonly [`RuntimeSite`](../type-aliases/RuntimeSite.md)[]

Defined in: core/dist/graph/document-graph.d.ts:117

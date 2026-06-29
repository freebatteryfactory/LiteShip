[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / PolicyNode

# Interface: PolicyNode

Defined in: [core/src/document-graph.ts:115](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L115)

7. Policy — NET-NEW. A pre-projection capability/constraint gate read by the
escalation chooser (P5c). Constrains which projection targets are admissible
given the runtime site, the required [CapTier](../type-aliases/CapTier.md), and optional budgets.

## Extends

- `NodeBase`\<`"policy"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphPolicyNode"`

Defined in: [core/src/document-graph.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L48)

#### Inherited from

`NodeBase._tag`

***

### \_version

> `readonly` **\_version**: `1`

Defined in: [core/src/document-graph.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L49)

#### Inherited from

`NodeBase._version`

***

### appliesTo

> `readonly` **appliesTo**: readonly `ContentAddress`[]

Defined in: [core/src/document-graph.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L116)

***

### budgets?

> `readonly` `optional` **budgets?**: `object`

Defined in: [core/src/document-graph.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L120)

#### allocClass?

> `readonly` `optional` **allocClass?**: `"zero"` \| `"bounded"` \| `"unbounded"`

#### memoryMb?

> `readonly` `optional` **memoryMb?**: `number`

#### p95Ms?

> `readonly` `optional` **p95Ms?**: `number`

***

### family

> `readonly` **family**: `"policy"`

Defined in: [core/src/document-graph.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L50)

#### Inherited from

`NodeBase.family`

***

### grants

> `readonly` **grants**: [`CapSet`](CapSet.md)

Defined in: [core/src/document-graph.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L118)

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [core/src/document-graph.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L52)

`fnv1a` content address over the node payload (set by `addressNode`/`sealNode`).

#### Inherited from

`NodeBase.id`

***

### meta

> `readonly` **meta**: [`CellMeta`](CellMeta.md)

Defined in: [core/src/document-graph.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L54)

HLC created/updated + version. Excluded from the content address (volatile).

#### Inherited from

`NodeBase.meta`

***

### requires

> `readonly` **requires**: [`CapTier`](../type-aliases/CapTier.md)

Defined in: [core/src/document-graph.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L117)

***

### sites

> `readonly` **sites**: readonly [`RuntimeSite`](../type-aliases/RuntimeSite.md)[]

Defined in: [core/src/document-graph.ts:119](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L119)

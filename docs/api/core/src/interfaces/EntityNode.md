[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / EntityNode

# Interface: EntityNode

Defined in: [core/src/graph/document-graph.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L65)

2. Entity — ECS identity. Maps to `EntityId`/`ComposableEntity`.

## Extends

- `NodeBase`\<`"entity"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphEntityNode"`

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

### components

> `readonly` **components**: readonly `ContentAddress`[]

Defined in: [core/src/graph/document-graph.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L67)

Sorted refs to [ComponentNode](ComponentNode.md) ids.

***

### family

> `readonly` **family**: `"entity"`

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

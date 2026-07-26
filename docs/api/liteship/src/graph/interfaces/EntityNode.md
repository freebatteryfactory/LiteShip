[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / EntityNode

# Interface: EntityNode

Defined in: core/dist/graph/document-graph.d.ts:59

2. Entity — ECS identity. Maps to `EntityId`/`ComposableEntity`.

## Extends

- `NodeBase`\<`"entity"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphEntityNode"`

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

### components

> `readonly` **components**: readonly `ContentAddress`[]

Defined in: core/dist/graph/document-graph.d.ts:61

Sorted refs to [ComponentNode](ComponentNode.md) ids.

***

### family

> `readonly` **family**: `"entity"`

Defined in: core/dist/graph/document-graph.d.ts:47

#### Inherited from

`NodeBase.family`

***

### id

> `readonly` **id**: `ContentAddress`

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

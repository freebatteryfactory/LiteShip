[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / EntityNode

# Interface: EntityNode

Defined in: [core/src/document-graph.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L64)

2. Entity — ECS identity. Maps to `EntityId`/`ComposableEntity`.

## Extends

- `NodeBase`\<`"entity"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphEntityNode"`

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

### components

> `readonly` **components**: readonly `ContentAddress`[]

Defined in: [core/src/document-graph.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L66)

Sorted refs to [ComponentNode](ComponentNode.md) ids.

***

### family

> `readonly` **family**: `"entity"`

Defined in: [core/src/document-graph.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L50)

#### Inherited from

`NodeBase.family`

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

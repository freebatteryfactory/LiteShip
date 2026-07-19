[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / PoseNode

# Interface: PoseNode

Defined in: [core/src/graph/document-graph.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L84)

4. Pose — a STATIC design-time keyed variant: an entity's projected output
bindings pinned at one discrete boundary state. The per-frame transient is
[EvaluateResult](EvaluateResult.md) (`evaluated`, optional cache); a Pose is the addressed,
named cell — transients are never content-addressed.

## Extends

- `NodeBase`\<`"pose"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphPoseNode"`

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

### bindings

> `readonly` **bindings**: `Readonly`\<`Record`\<`string`, `number` \| `string`\>\>

Defined in: [core/src/graph/document-graph.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L87)

***

### entityRef

> `readonly` **entityRef**: `ContentAddress`

Defined in: [core/src/graph/document-graph.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L85)

***

### evaluated?

> `readonly` `optional` **evaluated?**: [`EvaluateResult`](EvaluateResult.md)\<`string`\>

Defined in: [core/src/graph/document-graph.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L88)

***

### family

> `readonly` **family**: `"pose"`

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

### state

> `readonly` **state**: [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/graph/document-graph.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L86)

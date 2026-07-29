[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / PoseNode

# Interface: PoseNode

Defined in: core/dist/graph/document-graph.d.ts:76

4. Pose — a STATIC design-time keyed variant: an entity's projected output
bindings pinned at one discrete boundary state. The per-frame transient is
[EvaluateResult](../../../../quantizer/src/interfaces/EvaluateResult.md) (`evaluated`, optional cache); a Pose is the addressed,
named cell — transients are never content-addressed.

## Extends

- `NodeBase`\<`"pose"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphPoseNode"`

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

### bindings

> `readonly` **bindings**: `Readonly`\<`Record`\<`string`, `number` \| `string`\>\>

Defined in: core/dist/graph/document-graph.d.ts:79

***

### entityRef

> `readonly` **entityRef**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/graph/document-graph.d.ts:77

***

### evaluated?

> `readonly` `optional` **evaluated?**: [`EvaluateResult`](../../../../quantizer/src/interfaces/EvaluateResult.md)\<`string`\>

Defined in: core/dist/graph/document-graph.d.ts:80

***

### family

> `readonly` **family**: `"pose"`

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

### state

> `readonly` **state**: [`StateName`](../../schema/type-aliases/StateName.md)

Defined in: core/dist/graph/document-graph.d.ts:78

[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / ComponentNode

# Interface: ComponentNode

Defined in: core/dist/graph/document-graph.d.ts:64

3. Component — a boundary/token/style slot. Carries the kernel inputs inline so eval is reproducible.

## Extends

- `NodeBase`\<`"component"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphComponentNode"`

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

### boundaryRef?

> `readonly` `optional` **boundaryRef?**: `ContentAddress`

Defined in: core/dist/graph/document-graph.d.ts:66

***

### family

> `readonly` **family**: `"component"`

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

***

### name

> `readonly` **name**: `string`

Defined in: core/dist/graph/document-graph.d.ts:65

***

### states?

> `readonly` `optional` **states?**: readonly [`StateName`](../../schema/type-aliases/StateName.md)[]

Defined in: core/dist/graph/document-graph.d.ts:68

***

### thresholds?

> `readonly` `optional` **thresholds?**: readonly `ThresholdValue`[]

Defined in: core/dist/graph/document-graph.d.ts:67

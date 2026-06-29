[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ComponentNode

# Interface: ComponentNode

Defined in: [core/src/document-graph.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L70)

3. Component — a boundary/token/style slot. Carries the kernel inputs inline so eval is reproducible.

## Extends

- `NodeBase`\<`"component"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphComponentNode"`

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

### boundaryRef?

> `readonly` `optional` **boundaryRef?**: `ContentAddress`

Defined in: [core/src/document-graph.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L72)

***

### family

> `readonly` **family**: `"component"`

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

***

### name

> `readonly` **name**: `string`

Defined in: [core/src/document-graph.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L71)

***

### states?

> `readonly` `optional` **states?**: readonly [`StateName`](../type-aliases/StateName.md)[]

Defined in: [core/src/document-graph.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L74)

***

### thresholds?

> `readonly` `optional` **thresholds?**: readonly `ThresholdValue`[]

Defined in: [core/src/document-graph.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L73)

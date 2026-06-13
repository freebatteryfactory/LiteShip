[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / TransitionNode

# Interface: TransitionNode

Defined in: [core/src/document-graph.ts:91](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L91)

5. Transition — a blend/choice between two poses. Reuses `EdgeType` as the routing flavor.

## Extends

- `NodeBase`\<`"transition"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphTransitionNode"`

Defined in: [core/src/document-graph.ts:48](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L48)

#### Inherited from

`NodeBase._tag`

***

### \_version

> `readonly` **\_version**: `1`

Defined in: [core/src/document-graph.ts:49](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L49)

#### Inherited from

`NodeBase._version`

***

### durationMs?

> `readonly` `optional` **durationMs?**: `number`

Defined in: [core/src/document-graph.ts:95](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L95)

***

### family

> `readonly` **family**: `"transition"`

Defined in: [core/src/document-graph.ts:50](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L50)

#### Inherited from

`NodeBase.family`

***

### fromPose

> `readonly` **fromPose**: `ContentAddress`

Defined in: [core/src/document-graph.ts:92](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L92)

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [core/src/document-graph.ts:52](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L52)

`fnv1a` content address over the node payload (set by `addressNode`/`sealNode`).

#### Inherited from

`NodeBase.id`

***

### meta

> `readonly` **meta**: [`CellMeta`](CellMeta.md)

Defined in: [core/src/document-graph.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L54)

HLC created/updated + version. Excluded from the content address (volatile).

#### Inherited from

`NodeBase.meta`

***

### routing

> `readonly` **routing**: [`EdgeType`](../type-aliases/EdgeType.md)

Defined in: [core/src/document-graph.ts:94](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L94)

***

### toPose

> `readonly` **toPose**: `ContentAddress`

Defined in: [core/src/document-graph.ts:93](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph.ts#L93)

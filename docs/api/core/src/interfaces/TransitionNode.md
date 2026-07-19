[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / TransitionNode

# Interface: TransitionNode

Defined in: [core/src/graph/document-graph.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L92)

5. Transition — a blend/choice between two poses. Reuses `EdgeType` as the routing flavor.

## Extends

- `NodeBase`\<`"transition"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphTransitionNode"`

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

### durationMs?

> `readonly` `optional` **durationMs?**: `number`

Defined in: [core/src/graph/document-graph.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L96)

***

### easing?

> `readonly` `optional` **easing?**: [`RuntimeEasing`](RuntimeEasing.md)

Defined in: [core/src/graph/document-graph.ts:104](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L104)

The authored easing curve, carried on the node so `interpretTransition`
projects the SAME descriptor onto the runtime floor (`RuntimeWritePlan.easing`)
that the native CSS path compiles into `linear()` — one source, one kernel
(Law 4). Omitted ⇒ the interpreter defaults it to `{ kind: 'ease' }`, matching
the CSS `transition` default timing function.

***

### family

> `readonly` **family**: `"transition"`

Defined in: [core/src/graph/document-graph.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L51)

#### Inherited from

`NodeBase.family`

***

### fromPose

> `readonly` **fromPose**: `ContentAddress`

Defined in: [core/src/graph/document-graph.ts:93](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L93)

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

### routing

> `readonly` **routing**: [`EdgeType`](../type-aliases/EdgeType.md)

Defined in: [core/src/graph/document-graph.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L95)

***

### toPose

> `readonly` **toPose**: `ContentAddress`

Defined in: [core/src/graph/document-graph.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L94)

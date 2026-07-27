[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / TransitionNode

# Interface: TransitionNode

Defined in: core/dist/graph/document-graph.d.ts:83

5. Transition — a blend/choice between two poses. Reuses `EdgeType` as the routing flavor.

## Extends

- `NodeBase`\<`"transition"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphTransitionNode"`

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

### durationMs?

> `readonly` `optional` **durationMs?**: `number`

Defined in: core/dist/graph/document-graph.d.ts:87

***

### easing?

> `readonly` `optional` **easing?**: [`RuntimeEasing`](../../motion/interfaces/RuntimeEasing.md)

Defined in: core/dist/graph/document-graph.d.ts:95

The authored easing curve, carried on the node so `interpretTransition`
projects the SAME descriptor onto the runtime floor (`RuntimeWritePlan.easing`)
that the native CSS path compiles into `linear()` — one source, one kernel
(Law 4). Omitted ⇒ the interpreter defaults it to `{ kind: 'ease' }`, matching
the CSS `transition` default timing function.

***

### family

> `readonly` **family**: `"transition"`

Defined in: core/dist/graph/document-graph.d.ts:47

#### Inherited from

`NodeBase.family`

***

### fromPose

> `readonly` **fromPose**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/graph/document-graph.d.ts:84

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

### routing

> `readonly` **routing**: `EdgeType`

Defined in: core/dist/graph/document-graph.d.ts:86

***

### toPose

> `readonly` **toPose**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/graph/document-graph.d.ts:85

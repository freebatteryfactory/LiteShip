[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / SignalNode

# Interface: SignalNode

Defined in: [core/src/graph/document-graph.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L59)

1. Signal — an input axis. Maps to `CellKind 'signal'` / `BoundaryDef.input`.

## Extends

- `NodeBase`\<`"signal"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphSignalNode"`

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

### family

> `readonly` **family**: `"signal"`

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

### input

> `readonly` **input**: [`SignalInput`](../type-aliases/SignalInput.md)

Defined in: [core/src/graph/document-graph.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L60)

***

### meta

> `readonly` **meta**: [`CellMeta`](CellMeta.md)

Defined in: [core/src/graph/document-graph.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L55)

HLC created/updated + version. Excluded from the content address (volatile).

#### Inherited from

`NodeBase.meta`

***

### range?

> `readonly` `optional` **range?**: readonly \[`number`, `number`\]

Defined in: [core/src/graph/document-graph.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L61)

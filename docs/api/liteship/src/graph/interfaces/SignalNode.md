[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / SignalNode

# Interface: SignalNode

Defined in: core/dist/graph/document-graph.d.ts:54

1. Signal — an input axis. Maps to `CellKind 'signal'` / `BoundaryDef.input`.

## Extends

- `NodeBase`\<`"signal"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphSignalNode"`

Defined in: core/dist/graph/document-graph.d.ts:45

#### Inherited from

`NodeBase._tag`

***

### \_version

> `readonly` **\_version**: `1`

Defined in: core/dist/graph/document-graph.d.ts:46

#### Inherited from

[`SignalNode`](../../../../core/src/interfaces/SignalNode.md).[`_version`](../../../../core/src/interfaces/SignalNode.md#_version)

***

### family

> `readonly` **family**: `"signal"`

Defined in: core/dist/graph/document-graph.d.ts:47

#### Inherited from

`NodeBase.family`

***

### id

> `readonly` **id**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/graph/document-graph.d.ts:49

`fnv1a` content address over the node payload (set by `addressNode`/`sealNode`).

#### Inherited from

[`EntityNode`](EntityNode.md).[`id`](EntityNode.md#id)

***

### input

> `readonly` **input**: [`SignalInput`](../../schema/type-aliases/SignalInput.md)

Defined in: core/dist/graph/document-graph.d.ts:55

***

### meta

> `readonly` **meta**: [`CellMeta`](../../schema/interfaces/CellMeta.md)

Defined in: core/dist/graph/document-graph.d.ts:51

HLC created/updated + version. Excluded from the content address (volatile).

#### Inherited from

[`EntityNode`](EntityNode.md).[`meta`](EntityNode.md#meta)

***

### range?

> `readonly` `optional` **range?**: readonly \[`number`, `number`\]

Defined in: core/dist/graph/document-graph.d.ts:56

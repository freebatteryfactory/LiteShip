[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / ProjectionNode

# Interface: ProjectionNode

Defined in: core/dist/graph/document-graph.d.ts:102

6. Projection — the cast of a component to a target. Wraps a compiler
`CompileResult` BY REFERENCE (`resultDigest`), never inlined: the node stays
small/cacheable and `@liteship/core` does not type-import `@liteship/compiler`.

## Extends

- `NodeBase`\<`"projection"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphProjectionNode"`

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

### family

> `readonly` **family**: `"projection"`

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

### keys

> `readonly` **keys**: [`ProjectionKeys`](ProjectionKeys.md)

Defined in: core/dist/graph/document-graph.d.ts:105

***

### meta

> `readonly` **meta**: [`CellMeta`](../../schema/interfaces/CellMeta.md)

Defined in: core/dist/graph/document-graph.d.ts:51

HLC created/updated + version. Excluded from the content address (volatile).

#### Inherited from

`NodeBase.meta`

***

### resultDigest

> `readonly` **resultDigest**: `AddressedDigest`

Defined in: core/dist/graph/document-graph.d.ts:106

***

### sourceRef

> `readonly` **sourceRef**: `ContentAddress`

Defined in: core/dist/graph/document-graph.d.ts:104

***

### target

> `readonly` **target**: `"css"` \| `"glsl"` \| `"wgsl"` \| `"aria"` \| `"ai"` \| `"svg"` \| `"config"`

Defined in: core/dist/graph/document-graph.d.ts:103

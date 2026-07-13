[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ProjectionNode

# Interface: ProjectionNode

Defined in: [core/src/document-graph.ts:112](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L112)

6. Projection — the cast of a component to a target. Wraps a compiler
`CompileResult` BY REFERENCE (`resultDigest`), never inlined: the node stays
small/cacheable and `@czap/core` does not type-import `@czap/compiler`.

## Extends

- `NodeBase`\<`"projection"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphProjectionNode"`

Defined in: [core/src/document-graph.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L49)

#### Inherited from

`NodeBase._tag`

***

### \_version

> `readonly` **\_version**: `1`

Defined in: [core/src/document-graph.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L50)

#### Inherited from

`NodeBase._version`

***

### family

> `readonly` **family**: `"projection"`

Defined in: [core/src/document-graph.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L51)

#### Inherited from

`NodeBase.family`

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [core/src/document-graph.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L53)

`fnv1a` content address over the node payload (set by `addressNode`/`sealNode`).

#### Inherited from

`NodeBase.id`

***

### keys

> `readonly` **keys**: [`ProjectionKeys`](ProjectionKeys.md)

Defined in: [core/src/document-graph.ts:115](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L115)

***

### meta

> `readonly` **meta**: [`CellMeta`](CellMeta.md)

Defined in: [core/src/document-graph.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L55)

HLC created/updated + version. Excluded from the content address (volatile).

#### Inherited from

`NodeBase.meta`

***

### resultDigest

> `readonly` **resultDigest**: `AddressedDigest`

Defined in: [core/src/document-graph.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L116)

***

### sourceRef

> `readonly` **sourceRef**: `ContentAddress`

Defined in: [core/src/document-graph.ts:114](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L114)

***

### target

> `readonly` **target**: `"css"` \| `"glsl"` \| `"wgsl"` \| `"aria"` \| `"ai"` \| `"config"` \| `"svg"`

Defined in: [core/src/document-graph.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L113)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ProjectionNode

# Interface: ProjectionNode

Defined in: [core/src/document-graph.ts:103](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L103)

6. Projection — the cast of a component to a target. Wraps a compiler
`CompileResult` BY REFERENCE (`resultDigest`), never inlined: the node stays
small/cacheable and `@czap/core` does not type-import `@czap/compiler`.

## Extends

- `NodeBase`\<`"projection"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"DocGraphProjectionNode"`

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

### family

> `readonly` **family**: `"projection"`

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

### keys

> `readonly` **keys**: [`ProjectionKeys`](ProjectionKeys.md)

Defined in: [core/src/document-graph.ts:106](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L106)

***

### meta

> `readonly` **meta**: [`CellMeta`](CellMeta.md)

Defined in: [core/src/document-graph.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L54)

HLC created/updated + version. Excluded from the content address (volatile).

#### Inherited from

`NodeBase.meta`

***

### resultDigest

> `readonly` **resultDigest**: `AddressedDigest`

Defined in: [core/src/document-graph.ts:107](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L107)

***

### sourceRef

> `readonly` **sourceRef**: `ContentAddress`

Defined in: [core/src/document-graph.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L105)

***

### target

> `readonly` **target**: `"css"` \| `"glsl"` \| `"wgsl"` \| `"aria"` \| `"ai"` \| `"config"` \| `"svg"`

Defined in: [core/src/document-graph.ts:104](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts#L104)

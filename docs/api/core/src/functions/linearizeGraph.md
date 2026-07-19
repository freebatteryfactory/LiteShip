[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / linearizeGraph

# Function: linearizeGraph()

> **linearizeGraph**(`graph`): `object`

Defined in: [core/src/graph/document-graph-address.ts:144](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph-address.ts#L144)

Topologically order the node ids (Kahn's algorithm via `Plan.topoSort`).
`cycle` is populated with the participating node ids when the graph is cyclic.

## Parameters

### graph

#### edges

readonly [`DocumentGraphEdge`](../interfaces/DocumentGraphEdge.md)[]

#### nodes

readonly [`DocumentGraphNode`](../type-aliases/DocumentGraphNode.md)[]

## Returns

`object`

### cycle?

> `readonly` `optional` **cycle?**: readonly `ContentAddress`[]

### sorted

> `readonly` **sorted**: readonly `ContentAddress`[]

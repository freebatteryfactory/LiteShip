[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / linearizeGraph

# Function: linearizeGraph()

> **linearizeGraph**(`graph`): `object`

Defined in: core/dist/graph/document-graph-address.d.ts:68

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

> `readonly` `optional` **cycle?**: readonly [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)[]

### sorted

> `readonly` **sorted**: readonly [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)[]

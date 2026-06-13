[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / linearizeGraph

# Function: linearizeGraph()

> **linearizeGraph**(`graph`): `object`

Defined in: [core/src/document-graph-address.ts:100](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/document-graph-address.ts#L100)

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

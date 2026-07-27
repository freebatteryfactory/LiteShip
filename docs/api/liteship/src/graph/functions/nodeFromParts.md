[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / nodeFromParts

# Function: nodeFromParts()

> **nodeFromParts**\<`N`\>(`parts`): `N`

Defined in: core/dist/graph/document-graph-address.d.ts:37

Build a sealed [DocumentGraphNode](../type-aliases/DocumentGraphNode.md) from authoring parts — mints `id` via
`addressNode` / [sealNode](sealNode.md). Graph-level `digest` is minted by
[sealGraph](sealGraph.md), not here.

## Type Parameters

### N

`N` *extends* [`DocumentGraphNode`](../type-aliases/DocumentGraphNode.md)

## Parameters

### parts

[`DocumentGraphNodeParts`](../type-aliases/DocumentGraphNodeParts.md)\<`N`\>

## Returns

`N`

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / nodeFromParts

# Function: nodeFromParts()

> **nodeFromParts**\<`N`\>(`parts`): `N`

Defined in: [core/src/document-graph-address.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph-address.ts#L80)

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

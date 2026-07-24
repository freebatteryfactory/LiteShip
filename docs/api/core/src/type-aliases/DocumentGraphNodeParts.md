[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DocumentGraphNodeParts

# Type Alias: DocumentGraphNodeParts\<N\>

> **DocumentGraphNodeParts**\<`N`\> = `Omit`\<`N`, `"id"`\> & `object`

Defined in: [core/src/graph/document-graph-address.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph-address.ts#L71)

Authoring parts for a [DocumentGraphNode](DocumentGraphNode.md) before addressing — `id` is ignored.

## Type Declaration

### id?

> `readonly` `optional` **id?**: [`ContentAddress`](ContentAddress.md)

## Type Parameters

### N

`N` *extends* [`DocumentGraphNode`](DocumentGraphNode.md) = [`DocumentGraphNode`](DocumentGraphNode.md)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / NodePatchOp

# Interface: NodePatchOp

Defined in: [core/src/graph-patch.ts:42](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/graph-patch.ts#L42)

A node-level mutation: add/remove/update a single addressed [DocumentGraphNode](../type-aliases/DocumentGraphNode.md).

## Properties

### family

> `readonly` **family**: [`NodeFamily`](../type-aliases/NodeFamily.md)

Defined in: [core/src/graph-patch.ts:44](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/graph-patch.ts#L44)

***

### node

> `readonly` **node**: [`DocumentGraphNode`](../type-aliases/DocumentGraphNode.md)

Defined in: [core/src/graph-patch.ts:45](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/graph-patch.ts#L45)

***

### op

> `readonly` **op**: `"add"` \| `"remove"` \| `"update"`

Defined in: [core/src/graph-patch.ts:43](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/graph-patch.ts#L43)

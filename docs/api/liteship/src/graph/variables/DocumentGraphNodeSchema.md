[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / DocumentGraphNodeSchema

# Variable: DocumentGraphNodeSchema

> `const` **DocumentGraphNodeSchema**: [`LiteshipStandardSchema`](../../schema/type-aliases/LiteshipStandardSchema.md)

Defined in: core/dist/graph/document-graph-schema.d.ts:36

The single source of truth for "is this a well-formed DocumentGraph node?".
Carries the Standard Schema V1 `~standard` interop property (kernel `~standard`
bridge, vendor `liteship`), so any Standard-Schema-aware consumer can use the
same node gate directly. [isWellFormedNode](../functions/isWellFormedNode.md) behavior is unchanged.

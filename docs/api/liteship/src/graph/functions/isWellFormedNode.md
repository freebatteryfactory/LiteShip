[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / isWellFormedNode

# Function: isWellFormedNode()

> **isWellFormedNode**(`value`): `value is DocumentGraphNode`

Defined in: core/dist/graph/document-graph-schema.d.ts:205

Type guard: does this untrusted value conform to ONE of the eight
`DocumentGraphNode` family schemas (correct `_tag`/`_version`/`family` and the
family's required, correctly-typed fields)? The shared trust gate both the AI
proposal validator and the runtime graph loader read.

## Parameters

### value

`unknown`

## Returns

`value is DocumentGraphNode`

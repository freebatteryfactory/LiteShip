[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / isWellFormedNode

# Function: isWellFormedNode()

> **isWellFormedNode**(`value`): `value is DocumentGraphNode`

Defined in: [core/src/graph/document-graph-schema.ts:248](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph-schema.ts#L248)

Type guard: does this untrusted value conform to ONE of the eight
`DocumentGraphNode` family schemas (correct `_tag`/`_version`/`family` and the
family's required, correctly-typed fields)? The shared trust gate both the AI
proposal validator and the runtime graph loader read.

## Parameters

### value

`unknown`

## Returns

`value is DocumentGraphNode`

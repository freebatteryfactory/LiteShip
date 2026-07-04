[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / isWellFormedNode

# Variable: isWellFormedNode

> `const` **isWellFormedNode**: (`value`) => `value is DocumentGraphNode`

Defined in: [core/src/document-graph-schema.ts:213](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph-schema.ts#L213)

Type guard: does this untrusted value conform to ONE of the eight
`DocumentGraphNode` family schemas (correct `_tag`/`_version`/`family` and the
family's required, correctly-typed fields)? The shared trust gate both the AI
proposal validator and the runtime graph loader read.

## Parameters

### value

`unknown`

## Returns

`value is DocumentGraphNode`

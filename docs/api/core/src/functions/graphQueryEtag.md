[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / graphQueryEtag

# Function: graphQueryEtag()

> **graphQueryEtag**(`graph`): `string`

Defined in: [core/src/graph-query.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query.ts#L53)

The cache validator for conditional reads — sha256 `integrity_digest`, NOT the
fnv1a display `id`. The digest excludes mutable `meta` by construction.

## Parameters

### graph

[`DocumentGraph`](../interfaces/DocumentGraph.md)

## Returns

`string`

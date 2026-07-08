[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / normalizeGraphQueryEtag

# Function: normalizeGraphQueryEtag()

> **normalizeGraphQueryEtag**(`value`): `string` \| \{ `errors`: readonly `string`[]; \}

Defined in: [core/src/graph-query.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query.ts#L118)

Normalize a SINGLE HTTP etag value (e.g. a response `ETag` header) to bare sha256, or refuse fnv1a.

## Parameters

### value

`string` \| `undefined`

## Returns

`string` \| \{ `errors`: readonly `string`[]; \}

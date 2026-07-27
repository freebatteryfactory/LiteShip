[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / normalizeGraphQueryEtag

# Function: normalizeGraphQueryEtag()

> **normalizeGraphQueryEtag**(`value`): `string` \| \{ `errors`: readonly `string`[]; \}

Defined in: core/dist/graph/graph-query.d.ts:72

Normalize a SINGLE HTTP etag value (e.g. a response `ETag` header) to bare sha256, or refuse fnv1a.

## Parameters

### value

`string` \| `undefined`

## Returns

`string` \| \{ `errors`: readonly `string`[]; \}

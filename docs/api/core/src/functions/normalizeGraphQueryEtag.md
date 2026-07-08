[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / normalizeGraphQueryEtag

# Function: normalizeGraphQueryEtag()

> **normalizeGraphQueryEtag**(`value`): `string` \| \{ `errors`: readonly `string`[]; \}

Defined in: [core/src/graph-query.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query.ts#L58)

Normalize an HTTP `If-None-Match` / wire etag to bare sha256, or refuse fnv1a.

## Parameters

### value

`string` \| `undefined`

## Returns

`string` \| \{ `errors`: readonly `string`[]; \}

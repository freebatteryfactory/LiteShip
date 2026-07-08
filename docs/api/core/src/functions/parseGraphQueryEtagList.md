[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / parseGraphQueryEtagList

# Function: parseGraphQueryEtagList()

> **parseGraphQueryEtagList**(`value`): [`GraphQueryEtagCandidates`](../interfaces/GraphQueryEtagCandidates.md) \| \{ `errors`: readonly `string`[]; \}

Defined in: [core/src/graph-query.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query.ts#L77)

Parse a full `If-None-Match` header into ALL comma-separated members
(RFC 9110 §13.1.2 — a compliant cache may list several stored validators;
evaluating only the first would 422 or full-200 requests that should 304).
Any fnv1a member refuses the whole request — a client that cached the
display id is the silent-stale bug this channel exists to prevent.

## Parameters

### value

`string` \| `undefined`

## Returns

[`GraphQueryEtagCandidates`](../interfaces/GraphQueryEtagCandidates.md) \| \{ `errors`: readonly `string`[]; \}

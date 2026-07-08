[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / parseGraphQueryIfNoneMatch

# Variable: parseGraphQueryIfNoneMatch

> `const` **parseGraphQueryIfNoneMatch**: (`value`) => `string` \| \{ `errors`: readonly `string`[]; \} = `normalizeGraphQueryEtag`

Defined in: [astro/src/graph-query-route.ts:175](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/graph-query-route.ts#L175)

Parse `If-None-Match` for tests / host adapters — re-exported for route parity.

Normalize a SINGLE HTTP etag value (e.g. a response `ETag` header) to bare sha256, or refuse fnv1a.

## Parameters

### value

`string` \| `undefined`

## Returns

`string` \| \{ `errors`: readonly `string`[]; \}

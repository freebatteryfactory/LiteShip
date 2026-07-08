[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / parseGraphQueryIfNoneMatch

# Variable: parseGraphQueryIfNoneMatch

> `const` **parseGraphQueryIfNoneMatch**: (`value`) => `string` \| \{ `errors`: readonly `string`[]; \} = `normalizeGraphQueryEtag`

Defined in: [astro/src/graph-query-route.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/graph-query-route.ts#L99)

Parse `If-None-Match` for tests / host adapters — re-exported for route parity.

Normalize an HTTP `If-None-Match` / wire etag to bare sha256, or refuse fnv1a.

## Parameters

### value

`string` \| `undefined`

## Returns

`string` \| \{ `errors`: readonly `string`[]; \}

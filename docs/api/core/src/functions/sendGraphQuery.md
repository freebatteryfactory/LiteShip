[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / sendGraphQuery

# Function: sendGraphQuery()

> **sendGraphQuery**(`url`, `options?`): `Promise`\<[`GraphQueryResponse`](../type-aliases/GraphQueryResponse.md)\>

Defined in: [core/src/graph/graph-query.ts:282](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query.ts#L282)

Client-side sender: QUERY the host's graph read endpoint with optional conditional
etag and bounded retries. Tries `QUERY` first; on 405/501/404 falls back to POST with
[GRAPH\_QUERY\_FALLBACK\_HEADER](../variables/GRAPH_QUERY_FALLBACK_HEADER.md) (loud — not a silent downgrade). NEVER rejects.

## Parameters

### url

`string`

### options?

[`SendGraphQueryOptions`](../interfaces/SendGraphQueryOptions.md) = `{}`

## Returns

`Promise`\<[`GraphQueryResponse`](../type-aliases/GraphQueryResponse.md)\>

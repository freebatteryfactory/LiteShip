[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / sendGraphQuery

# Function: sendGraphQuery()

> **sendGraphQuery**(`url`, `options?`): `Promise`\<[`GraphQueryResponse`](../type-aliases/GraphQueryResponse.md)\>

Defined in: core/dist/graph/graph-query.d.ts:99

Client-side sender: QUERY the host's graph read endpoint with optional conditional
etag and bounded retries. Tries `QUERY` first; on 405/501/404 falls back to POST with
[GRAPH\_QUERY\_FALLBACK\_HEADER](../variables/GRAPH_QUERY_FALLBACK_HEADER.md) (loud — not a silent downgrade). NEVER rejects.

## Parameters

### url

`string`

### options?

[`SendGraphQueryOptions`](../interfaces/SendGraphQueryOptions.md)

## Returns

`Promise`\<[`GraphQueryResponse`](../type-aliases/GraphQueryResponse.md)\>

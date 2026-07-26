[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / handleGraphQuery

# Function: handleGraphQuery()

> **handleGraphQuery**(`request`, `store`): `Promise`\<[`GraphQueryResponse`](../type-aliases/GraphQueryResponse.md)\>

Defined in: core/dist/graph/graph-query.d.ts:79

Process one graph read against the host store. Pure of transport: load → verify →
conditional etag compare. NEVER throws — failures map to the response shape.

## Parameters

### request

[`GraphQueryRequest`](../interfaces/GraphQueryRequest.md)

### store

`Pick`\<[`GraphStore`](../interfaces/GraphStore.md), `"loadGraph"`\>

## Returns

`Promise`\<[`GraphQueryResponse`](../type-aliases/GraphQueryResponse.md)\>

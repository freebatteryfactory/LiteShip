[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / handleGraphQuery

# Function: handleGraphQuery()

> **handleGraphQuery**(`request`, `store`): `Promise`\<[`GraphQueryResponse`](../type-aliases/GraphQueryResponse.md)\>

Defined in: [core/src/graph-query.ts:114](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query.ts#L114)

Process one graph read against the host store. Pure of transport: load → verify →
conditional etag compare. NEVER throws — failures map to the response shape.

## Parameters

### request

[`GraphQueryRequest`](../interfaces/GraphQueryRequest.md)

### store

`Pick`\<[`GraphStore`](../interfaces/GraphStore.md), `"loadGraph"`\>

## Returns

`Promise`\<[`GraphQueryResponse`](../type-aliases/GraphQueryResponse.md)\>

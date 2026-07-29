[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / createGraphQueryRefreshBase

# Function: createGraphQueryRefreshBase()

> **createGraphQueryRefreshBase**(`url`, `options?`): () => `Promise`\<[`DocumentGraph`](../interfaces/DocumentGraph.md)\>

Defined in: core/dist/graph/graph-query.d.ts:101

Build a host-owned `refreshBase` for [createGraphMutationClient](createGraphMutationClient.md) over the read leg.

## Parameters

### url

`string`

### options?

`Pick`\<[`SendGraphQueryOptions`](../interfaces/SendGraphQueryOptions.md), `"fetchImpl"` \| `"maxRetries"`\> & `object`

## Returns

() => `Promise`\<[`DocumentGraph`](../interfaces/DocumentGraph.md)\>

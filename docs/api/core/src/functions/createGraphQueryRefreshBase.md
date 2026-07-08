[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / createGraphQueryRefreshBase

# Function: createGraphQueryRefreshBase()

> **createGraphQueryRefreshBase**(`url`, `options?`): () => `Promise`\<[`DocumentGraph`](../interfaces/DocumentGraph.md)\>

Defined in: [core/src/graph-query.ts:312](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query.ts#L312)

Build a host-owned `refreshBase` for [createGraphMutationClient](createGraphMutationClient.md) over the read leg.

## Parameters

### url

`string`

### options?

`Pick`\<[`SendGraphQueryOptions`](../interfaces/SendGraphQueryOptions.md), `"fetchImpl"` \| `"maxRetries"`\> & `object`

## Returns

() => `Promise`\<[`DocumentGraph`](../interfaces/DocumentGraph.md)\>

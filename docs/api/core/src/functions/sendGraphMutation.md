[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / sendGraphMutation

# Function: sendGraphMutation()

> **sendGraphMutation**(`url`, `patch`, `fetchImpl?`): `Promise`\<[`GraphMutationResponse`](../type-aliases/GraphMutationResponse.md)\>

Defined in: [core/src/graph-mutation.ts:102](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation.ts#L102)

Client-side sender: POST a proposed [GraphPatch](../variables/GraphPatch.md) to the host's mutation
endpoint and resolve the server's [GraphMutationResponse](../type-aliases/GraphMutationResponse.md). A thin `fetch`
wrapper — the host wires the endpoint with [handleGraphMutation](handleGraphMutation.md). `fetchImpl`
is injectable for tests / non-browser hosts; it defaults to the global `fetch`.

## Parameters

### url

`string`

### patch

[`GraphPatch`](../interfaces/GraphPatch.md)

### fetchImpl?

\{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

## Returns

`Promise`\<[`GraphMutationResponse`](../type-aliases/GraphMutationResponse.md)\>

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / graphQueryRoute

# Function: graphQueryRoute()

> **graphQueryRoute**(`store`): (`request`) => `Promise`\<`Response`\>

Defined in: [astro/src/graph-query-route.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/graph-query-route.ts#L49)

Build a QUERY (or POST+`X-Czap-Query` fallback) handler that returns the host's
current sealed graph:
  - **200** on hit — body is `{ status: 'ok', graph, etag }` (sha256 digest);
  - **304** on conditional match (`If-None-Match` === integrity digest);
  - **422** on refusal (bad etag validator, store graph failed verification);
  - **415** on a non-`application/json` body when a body is present;
  - **400** on an unparseable JSON body;
  - **405** on unsupported methods.

## Parameters

### store

`Pick`\<`GraphStore`, `"loadGraph"`\>

## Returns

(`request`) => `Promise`\<`Response`\>

[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/astro](../README.md) / graphQueryRoute

# Function: graphQueryRoute()

> **graphQueryRoute**(`store`): (`request`) => `Promise`\<`Response`\>

Defined in: astro/dist/graph-query-route.d.ts:27

Build a QUERY (or POST+`X-Liteship-Query` fallback) handler that returns the host's
current sealed graph:
  - **200** on hit — body is `{ status: 'ok', graph, etag }` (sha256 digest);
  - **304** on conditional match (any `If-None-Match` member, or `*`);
  - **422** on refusal (bad etag validator, store graph failed verification);
  - **415** on a non-`application/json` body when a body is present;
  - **400** on an unparseable JSON body;
  - **413** when the body exceeds the read-leg cap (the body is semantically empty);
  - **204 + Allow** on OPTIONS (CORS preflight must not see 405);
  - **405 + Allow** on unsupported methods.

## Parameters

### store

`Pick`\<[`GraphStore`](../../graph/interfaces/GraphStore.md), `"loadGraph"`\>

## Returns

(`request`) => `Promise`\<`Response`\>

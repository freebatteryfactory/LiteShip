[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / graphQueryRoute

# Function: graphQueryRoute()

> **graphQueryRoute**(`store`): (`request`) => `Promise`\<`Response`\>

Defined in: [astro/src/graph-query-route.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/graph-query-route.ts#L92)

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

`Pick`\<`GraphStore`, `"loadGraph"`\>

## Returns

(`request`) => `Promise`\<`Response`\>

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / GraphQueryResponse

# Type Alias: GraphQueryResponse

> **GraphQueryResponse** = \{ `etag`: `string`; `graph`: [`DocumentGraph`](../interfaces/DocumentGraph.md); `status`: `"ok"`; \} \| \{ `etag`: `string`; `status`: `"not_modified"`; \} \| \{ `errors`: readonly `string`[]; `status`: `"refused"`; \} \| \{ `message`: `string`; `status`: `"error"`; \}

Defined in: [core/src/graph/graph-query.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query.ts#L35)

Read-leg response — one shape for callers:
  - `ok` — the verified server graph + its etag;
  - `not_modified` — conditional hit (digest unchanged);
  - `refused` — malformed validator or store graph failed verification;
  - `error` — server-side load failure (retryable).

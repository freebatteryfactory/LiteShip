[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / GraphQueryResponse

# Type Alias: GraphQueryResponse

> **GraphQueryResponse** = \{ `etag`: `string`; `graph`: [`DocumentGraph`](../interfaces/DocumentGraph.md); `status`: `"ok"`; \} \| \{ `etag`: `string`; `status`: `"not_modified"`; \} \| \{ `errors`: readonly `string`[]; `status`: `"refused"`; \} \| \{ `message`: `string`; `status`: `"error"`; \}

Defined in: core/dist/graph/graph-query.d.ts:30

Read-leg response — one shape for callers:
  - `ok` — the verified server graph + its etag;
  - `not_modified` — conditional hit (digest unchanged);
  - `refused` — malformed validator or store graph failed verification;
  - `error` — server-side load failure (retryable).

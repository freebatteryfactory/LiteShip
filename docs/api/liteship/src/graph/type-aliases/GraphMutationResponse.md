[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / GraphMutationResponse

# Type Alias: GraphMutationResponse

> **GraphMutationResponse** = \{ `graph`: [`DocumentGraph`](../interfaces/DocumentGraph.md); `status`: `"applied"`; \} \| \{ `errors`: readonly `string`[]; `staleBase?`: `true`; `status`: `"refused"`; \} \| \{ `message`: `string`; `status`: `"error"`; \}

Defined in: core/dist/graph/graph-mutation.d.ts:51

The server's response. Three outcomes, one shape to consume:
  - `applied` — the new sealed graph (the client swaps its view to it);
  - `refused` — the patch did not validate (base mismatch, dangling edge, version skew,
    malformed envelope, or a lost-update CAS miss); the graph is byte-identical.
    `staleBase` is present (and `true`) exactly when the refusal is base-staleness /
    lost-update: reload the base and re-propose. It is absent for invalid proposals,
    where retrying the same patch cannot succeed;
  - `error` — a SERVER-side failure (store I/O, an unexpected throw), distinct from a
    refusal: the proposal may be fine, so a retry can succeed.

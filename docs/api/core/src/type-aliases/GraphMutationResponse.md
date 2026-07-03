[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / GraphMutationResponse

# Type Alias: GraphMutationResponse

> **GraphMutationResponse** = \{ `graph`: [`DocumentGraph`](../interfaces/DocumentGraph.md); `status`: `"applied"`; \} \| \{ `errors`: readonly `string`[]; `status`: `"refused"`; \} \| \{ `message`: `string`; `status`: `"error"`; \}

Defined in: [core/src/graph-mutation.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation.ts#L53)

The server's response. Three outcomes, one shape to consume:
  - `applied` — the new sealed graph (the client swaps its view to it);
  - `refused` — the patch did not validate (base mismatch, dangling edge, version skew,
    malformed envelope, or a lost-update CAS miss); the graph is byte-identical. The
    client's proposal was wrong — reload and re-propose, don't blindly retry;
  - `error` — a SERVER-side failure (store I/O, an unexpected throw), distinct from a
    refusal: the proposal may be fine, so a retry can succeed.

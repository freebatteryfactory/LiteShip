[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / GraphMutationResponse

# Type Alias: GraphMutationResponse

> **GraphMutationResponse** = \{ `graph`: [`DocumentGraph`](../interfaces/DocumentGraph.md); `status`: `"applied"`; \} \| \{ `errors`: readonly `string`[]; `status`: `"refused"`; \}

Defined in: [core/src/graph-mutation.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation.ts#L50)

The server's response. `applied` carries the new sealed graph (the client swaps
its view to this content-addressed truth); `refused` carries the structured
reasons the patch did not validate (base mismatch, dangling edge, version skew,
malformed envelope) — the graph is byte-identical to before.

[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / AppliedGraphVerification

# Type Alias: AppliedGraphVerification

> **AppliedGraphVerification** = \{ `graph`: [`DocumentGraph`](../interfaces/DocumentGraph.md); `ok`: `true`; \} \| \{ `message`: `string`; `ok`: `false`; \}

Defined in: core/dist/graph/graph-mutation.d.ts:66

Outcome of [verifyAppliedGraph](../functions/verifyAppliedGraph.md): the re-sealed canonical graph on success, or the
reason the wire value is not a graph the server's own pipeline would emit.

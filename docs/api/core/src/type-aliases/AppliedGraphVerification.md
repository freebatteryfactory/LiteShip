[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / AppliedGraphVerification

# Type Alias: AppliedGraphVerification

> **AppliedGraphVerification** = \{ `graph`: [`DocumentGraph`](../interfaces/DocumentGraph.md); `ok`: `true`; \} \| \{ `message`: `string`; `ok`: `false`; \}

Defined in: [core/src/graph/graph-mutation.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-mutation.ts#L65)

Outcome of [verifyAppliedGraph](../functions/verifyAppliedGraph.md): the re-sealed canonical graph on success, or the
reason the wire value is not a graph the server's own pipeline would emit.

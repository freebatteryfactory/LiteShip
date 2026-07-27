[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / GraphMutationOps

# Type Alias: GraphMutationOps

> **GraphMutationOps** = readonly [`PatchOp`](PatchOp.md)[] \| ((`base`) => readonly [`PatchOp`](PatchOp.md)[])

Defined in: core/dist/graph/graph-mutation-client.d.ts:45

The ops a submit proposes: a fixed op array, or a builder invoked with the CURRENT base —
the builder form re-derives ops after a stale-base refresh, so retried proposals never
carry nodes computed against a graph the server has already moved past.

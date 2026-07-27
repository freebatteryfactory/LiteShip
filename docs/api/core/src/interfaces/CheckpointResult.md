[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CheckpointResult

# Interface: CheckpointResult

Defined in: [core/src/graph/dag.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/dag.ts#L52)

Result of [checkpoint](#checkpoint): the spliced (compacted) DAG, the genesis-shaped
checkpoint attestation envelope (returned OUT-OF-BAND, never an ingested node),
and the hashes that were dropped (watermark + its transitive ancestors).

## Properties

### checkpoint

> `readonly` **checkpoint**: [`ReceiptEnvelope`](ReceiptEnvelope.md)

Defined in: [core/src/graph/dag.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/dag.ts#L54)

***

### dag

> `readonly` **dag**: [`ReceiptDAG`](ReceiptDAG.md)

Defined in: [core/src/graph/dag.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/dag.ts#L53)

***

### dropped

> `readonly` **dropped**: readonly `string`[]

Defined in: [core/src/graph/dag.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/dag.ts#L55)

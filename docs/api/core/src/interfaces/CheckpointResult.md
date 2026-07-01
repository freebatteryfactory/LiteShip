[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CheckpointResult

# Interface: CheckpointResult

Defined in: [core/src/dag.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/dag.ts#L53)

Result of [checkpoint](#checkpoint): the spliced (compacted) DAG, the genesis-shaped
checkpoint attestation envelope (returned OUT-OF-BAND, never an ingested node),
and the hashes that were dropped (watermark + its transitive ancestors).

## Properties

### checkpoint

> `readonly` **checkpoint**: [`ReceiptEnvelope`](ReceiptEnvelope.md)

Defined in: [core/src/dag.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/dag.ts#L55)

***

### dag

> `readonly` **dag**: [`ReceiptDAG`](ReceiptDAG.md)

Defined in: [core/src/dag.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/dag.ts#L54)

***

### dropped

> `readonly` **dropped**: readonly `string`[]

Defined in: [core/src/dag.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/dag.ts#L56)

[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / CheckpointResult

# Interface: CheckpointResult

Defined in: core/dist/graph/dag.d.ts:42

Result of [checkpoint](#checkpoint): the spliced (compacted) DAG, the genesis-shaped
checkpoint attestation envelope (returned OUT-OF-BAND, never an ingested node),
and the hashes that were dropped (watermark + its transitive ancestors).

## Properties

### checkpoint

> `readonly` **checkpoint**: [`ReceiptEnvelope`](../../evidence/interfaces/ReceiptEnvelope.md)

Defined in: core/dist/graph/dag.d.ts:44

***

### dag

> `readonly` **dag**: [`ReceiptDAG`](ReceiptDAG.md)

Defined in: core/dist/graph/dag.d.ts:43

***

### dropped

> `readonly` **dropped**: readonly `string`[]

Defined in: core/dist/graph/dag.d.ts:45

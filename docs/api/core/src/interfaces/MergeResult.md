[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / MergeResult

# Interface: MergeResult

Defined in: [core/src/graph/dag.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/dag.ts#L33)

Result of a DAG merge: the updated graph, the hashes that were newly added, and whether a fork was observed.

## Properties

### added

> `readonly` **added**: readonly `string`[]

Defined in: [core/src/graph/dag.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/dag.ts#L35)

***

### dag

> `readonly` **dag**: [`ReceiptDAG`](ReceiptDAG.md)

Defined in: [core/src/graph/dag.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/dag.ts#L34)

***

### forked

> `readonly` **forked**: `boolean`

Defined in: [core/src/graph/dag.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/dag.ts#L36)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / MergeResult

# Interface: MergeResult

Defined in: [core/src/dag.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/dag.ts#L32)

Result of a DAG merge: the updated graph, the hashes that were newly added, and whether a fork was observed.

## Properties

### added

> `readonly` **added**: readonly `string`[]

Defined in: [core/src/dag.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/dag.ts#L34)

***

### dag

> `readonly` **dag**: [`ReceiptDAG`](ReceiptDAG.md)

Defined in: [core/src/dag.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/dag.ts#L33)

***

### forked

> `readonly` **forked**: `boolean`

Defined in: [core/src/dag.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/dag.ts#L35)

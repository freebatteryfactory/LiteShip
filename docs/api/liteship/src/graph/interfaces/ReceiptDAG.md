[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / ReceiptDAG

# Interface: ReceiptDAG

Defined in: core/dist/graph/dag.d.ts:19

Immutable snapshot of the receipt DAG: the set of known nodes, the current
head(s), and the genesis anchor if any.

## Properties

### genesis

> `readonly` **genesis**: `string` \| `null`

Defined in: core/dist/graph/dag.d.ts:22

***

### heads

> `readonly` **heads**: readonly `string`[]

Defined in: core/dist/graph/dag.d.ts:21

***

### nodes

> `readonly` **nodes**: `ReadonlyMap`\<`string`, [`DAGNode`](DAGNode.md)\>

Defined in: core/dist/graph/dag.d.ts:20

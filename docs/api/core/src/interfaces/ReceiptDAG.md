[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ReceiptDAG

# Interface: ReceiptDAG

Defined in: [core/src/dag.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/dag.ts#L27)

Immutable snapshot of the receipt DAG: the set of known nodes, the current
head(s), and the genesis anchor if any.

## Properties

### genesis

> `readonly` **genesis**: `string` \| `null`

Defined in: [core/src/dag.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/dag.ts#L30)

***

### heads

> `readonly` **heads**: readonly `string`[]

Defined in: [core/src/dag.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/dag.ts#L29)

***

### nodes

> `readonly` **nodes**: `ReadonlyMap`\<`string`, [`DAGNode`](DAGNode.md)\>

Defined in: [core/src/dag.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/dag.ts#L28)

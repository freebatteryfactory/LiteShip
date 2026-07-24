[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DAGNode

# Interface: DAGNode

Defined in: [core/src/graph/dag.ts:16](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/dag.ts#L16)

Single vertex in a [ReceiptDAG](ReceiptDAG.md): an envelope plus its parent and child hashes.

## Properties

### children

> `readonly` **children**: readonly `string`[]

Defined in: [core/src/graph/dag.ts:19](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/dag.ts#L19)

***

### envelope

> `readonly` **envelope**: [`ReceiptEnvelope`](ReceiptEnvelope.md)

Defined in: [core/src/graph/dag.ts:17](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/dag.ts#L17)

***

### parents

> `readonly` **parents**: readonly `string`[]

Defined in: [core/src/graph/dag.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/dag.ts#L18)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DAGNode

# Interface: DAGNode

Defined in: [core/src/dag.ts:17](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/dag.ts#L17)

Single vertex in a [ReceiptDAG](ReceiptDAG.md): an envelope plus its parent and child hashes.

## Properties

### children

> `readonly` **children**: readonly `string`[]

Defined in: [core/src/dag.ts:20](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/dag.ts#L20)

***

### envelope

> `readonly` **envelope**: [`ReceiptEnvelope`](ReceiptEnvelope.md)

Defined in: [core/src/dag.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/dag.ts#L18)

***

### parents

> `readonly` **parents**: readonly `string`[]

Defined in: [core/src/dag.ts:19](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/dag.ts#L19)

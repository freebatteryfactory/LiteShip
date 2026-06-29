[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / GraphPatch

# Interface: GraphPatch

Defined in: [core/src/graph-patch.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-patch.ts#L66)

A typed, content-addressable graph mutation (C6). `base` is the graph id the
delta applies to; `resultId` (when present) is the `apply` result's id — the
seam [receipt](../variables/GraphPatch.md#receipt) and [forkOf](../variables/GraphPatch.md#forkof) bind to.

## Properties

### \_tag

> `readonly` **\_tag**: `"GraphPatch"`

Defined in: [core/src/graph-patch.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-patch.ts#L67)

***

### \_version

> `readonly` **\_version**: `1`

Defined in: [core/src/graph-patch.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-patch.ts#L68)

***

### base

> `readonly` **base**: `ContentAddress`

Defined in: [core/src/graph-patch.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-patch.ts#L70)

The id of the [DocumentGraph](DocumentGraph.md) this patch applies to.

***

### ops

> `readonly` **ops**: readonly [`PatchOp`](../type-aliases/PatchOp.md)[]

Defined in: [core/src/graph-patch.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-patch.ts#L71)

***

### resultId?

> `readonly` `optional` **resultId?**: `ContentAddress`

Defined in: [core/src/graph-patch.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-patch.ts#L73)

The id of the graph `apply(base, this)` produces (set by `propose`/`apply`).

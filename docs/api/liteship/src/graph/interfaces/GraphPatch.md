[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / GraphPatch

# Interface: GraphPatch

Defined in: core/dist/graph/graph-patch.d.ts:52

A typed, content-addressable graph mutation (C6). `base` is the graph id the
delta applies to; `resultId` (when present) is the `apply` result's id — the
seam [receipt](../variables/GraphPatch.md#receipt) and [forkOf](../variables/GraphPatch.md#forkof) bind to.

## Properties

### \_tag

> `readonly` **\_tag**: `"GraphPatch"`

Defined in: core/dist/graph/graph-patch.d.ts:53

***

### \_version

> `readonly` **\_version**: `1`

Defined in: core/dist/graph/graph-patch.d.ts:54

***

### base

> `readonly` **base**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/graph/graph-patch.d.ts:56

The id of the [DocumentGraph](DocumentGraph.md) this patch applies to.

***

### ops

> `readonly` **ops**: readonly [`PatchOp`](../type-aliases/PatchOp.md)[]

Defined in: core/dist/graph/graph-patch.d.ts:57

***

### resultId?

> `readonly` `optional` **resultId?**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/graph/graph-patch.d.ts:59

The id of the graph `apply(base, this)` produces (set by `propose`/`apply`).

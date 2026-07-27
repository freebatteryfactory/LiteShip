[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / createCell

# Variable: createCell

> `const` **createCell**: \<`T`\>(`initial`) => [`Cell`](../type-aliases/Cell.md)\<`T`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

Defined in: core/dist/reactive/cell.d.ts:64

Create a mutable reactive [Cell](../type-aliases/Cell.md) backed by [CellKernel](CellKernel.md), owned by a
fresh [Lifetime](../type-aliases/Lifetime.md). `read` for a snapshot, `set`/`update` to push,
`subscribe` for the replay-1 stream of values (current replayed on attach).
Effect-free — the transport swap that lets consumers coordinate ordinary state
with no `effect` import (#153).

The cell IS its own disposable ([AsyncOwnedResource](../interfaces/AsyncOwnedResource.md)): `await cell.dispose()`
(or `await using cell = createCell(0)`) closes the kernel exactly once.

## Type Parameters

### T

`T`

## Parameters

### initial

`T`

## Returns

[`Cell`](../type-aliases/Cell.md)\<`T`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

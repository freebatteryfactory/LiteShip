[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / createCell

# Function: createCell()

> **createCell**\<`T`\>(`initial`): `CellShape`\<`T`\>

Defined in: [core/src/reactive/cell.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/cell.ts#L62)

Create a mutable reactive [Cell](../type-aliases/Cell.md) backed by [CellKernel](../variables/CellKernel.md), owned by a
fresh [Lifetime](../variables/Lifetime.md). `read` for a snapshot, `set`/`update` to push,
`subscribe` for the replay-1 stream of values (current replayed on attach).
Effect-free — the transport swap that lets consumers coordinate ordinary state
with no `effect` import (#153).

## Type Parameters

### T

`T`

## Parameters

### initial

`T`

## Returns

`CellShape`\<`T`\>

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Cell

# Variable: Cell

> `const` **Cell**: `object`

Defined in: [core/src/reactive/cell.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/cell.ts#L78)

Cell — mutable reactive primitive backed by [CellKernel](CellKernel.md). `read` for a
snapshot, `set`/`update` to push, `subscribe` for the replay-1 stream of
values (current replayed on attach). Effect-free — the transport swap that lets
consumers coordinate ordinary state with no `effect` import (#153).

## Type Declaration

### make

> **make**: \<`T`\>(`initial`) => `CellShape`\<`T`\> = `_make`

Build a cell with an initial value, owned by a fresh [Lifetime](Lifetime.md).

#### Type Parameters

##### T

`T`

#### Parameters

##### initial

`T`

#### Returns

`CellShape`\<`T`\>

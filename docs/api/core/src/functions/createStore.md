[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / createStore

# Function: createStore()

> **createStore**\<`S`, `Msg`\>(`initial`, `reducer`): `StoreShape`\<`S`, `Msg`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

Defined in: [core/src/reactive/store.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/store.ts#L61)

Create a [Store](../type-aliases/Store.md) — a TEA-style state container over
[CellKernel.replay1](../variables/CellKernel.md#replay1). Build with an initial state and a pure
`reducer(state, msg) => state`, then dispatch messages; the store publishes
each resulting state through `subscribe`, and `store.dispose()` tears it down.

## Type Parameters

### S

`S`

### Msg

`Msg`

## Parameters

### initial

`S`

### reducer

(`state`, `msg`) => `S`

## Returns

`StoreShape`\<`S`, `Msg`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

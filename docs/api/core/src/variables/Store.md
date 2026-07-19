[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Store

# Variable: Store

> `const` **Store**: `object`

Defined in: [core/src/reactive/store.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/store.ts#L74)

Store — TEA-style state container over [CellKernel.replay1](CellKernel.md#replay1). Build with an
initial state and a pure `reducer(state, msg) => state`, then dispatch messages;
the store publishes each resulting state through `subscribe`, and
`lifetime.dispose()` tears it down.

## Type Declaration

### make

> **make**: \<`S`, `Msg`\>(`initial`, `reducer`) => `StoreShape`\<`S`, `Msg`\> = `_make`

Synchronous reducer store.

#### Type Parameters

##### S

`S`

##### Msg

`Msg`

#### Parameters

##### initial

`S`

##### reducer

(`state`, `msg`) => `S`

#### Returns

`StoreShape`\<`S`, `Msg`\>

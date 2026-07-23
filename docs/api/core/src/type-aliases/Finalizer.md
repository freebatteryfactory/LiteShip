[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Finalizer

# Type Alias: Finalizer

> **Finalizer** = () => `void` \| `Promise`\<`void`\>

Defined in: [core/src/reactive/lifetime.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L47)

A teardown function. The sync arm (`void`) runs synchronously inside
`dispose()`; the async arm (`Promise<void>`) is awaited by the promise
`dispose()` returns.

## Returns

`void` \| `Promise`\<`void`\>

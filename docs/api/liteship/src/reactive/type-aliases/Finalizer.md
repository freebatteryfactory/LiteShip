[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / Finalizer

# Type Alias: Finalizer

> **Finalizer** = () => `void` \| `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:39

A teardown function. The sync arm (`void`) runs synchronously inside
`dispose()`; the async arm (`Promise<void>`) is awaited by the promise
`dispose()` returns.

## Returns

`void` \| `Promise`\<`void`\>

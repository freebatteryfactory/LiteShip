[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / attachLifetime

# Function: attachLifetime()

> **attachLifetime**\<`T`\>(`target`, `lifetime`): `T` & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

Defined in: core/dist/reactive/lifetime.d.ts:125

Wire a [Lifetime](../type-aliases/Lifetime.md)'s single lifecycle directly onto `target`, collapsing
the former `{ value, lifetime }` pair-return into ONE owned resource: the
value IS the disposable. Adds `dispose()` and `[Symbol.asyncDispose]()` (both
delegate to `lifetime.dispose()`) and keeps the handle reachable as
`target.lifetime` for advanced/debug composition. Idempotent / exactly-once
disposal is inherited from the Lifetime.

The promise is the completion/error channel, not evidence that synchronous
teardown was deferred: sync finalizers run during the `dispose()` call.

## Type Parameters

### T

`T` *extends* `object`

## Parameters

### target

`T`

### lifetime

[`Lifetime`](../type-aliases/Lifetime.md)

## Returns

`T` & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

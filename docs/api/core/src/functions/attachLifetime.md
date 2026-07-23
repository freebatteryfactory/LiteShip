[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / attachLifetime

# Function: attachLifetime()

> **attachLifetime**\<`T`\>(`target`, `lifetime`): `T` & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

Defined in: [core/src/reactive/lifetime.ts:304](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L304)

Wire a [Lifetime](../variables/Lifetime.md)'s single lifecycle directly onto `target`, collapsing
the former `{ value, lifetime }` pair-return into ONE owned resource: the
value IS the disposable. Adds `dispose()` and `[Symbol.asyncDispose]()` (both
delegate to `lifetime.dispose()`) and keeps the handle reachable as
`target.lifetime` for advanced/debug composition. Idempotent / exactly-once
disposal is inherited from the Lifetime.

Async is the default because `Lifetime.dispose` is async; only expose a
synchronous [OwnedResource](../interfaces/OwnedResource.md) for a resource whose teardown is genuinely
synchronous.

## Type Parameters

### T

`T` *extends* `object`

## Parameters

### target

`T`

### lifetime

[`LifetimeShape`](../interfaces/LifetimeShape.md)

## Returns

`T` & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

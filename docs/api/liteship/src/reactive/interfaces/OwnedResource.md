[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / OwnedResource

# Interface: OwnedResource

Defined in: core/dist/reactive/lifetime.d.ts:108

A resource that owns its teardown SYNCHRONOUSLY. `dispose()` runs the owning
[Lifetime](../type-aliases/Lifetime.md)'s finalizers (all synchronous) to completion and returns
`void`; the `[Symbol.dispose]` well-known method makes it usable with a
`using` declaration. `lifetime` stays reachable for advanced/debug
composition — registering extra finalizers, threading the handle into a child
scope — but the value IS the disposable; there is no pair to destructure.

Prefer [AsyncOwnedResource](AsyncOwnedResource.md): [LifetimeShape.dispose](LifetimeShape.md#dispose) is async, so
this synchronous form is only correct for a resource whose teardown is
genuinely synchronous (every finalizer settles inside the `dispose()` call).

## Properties

### lifetime

> `readonly` **lifetime**: [`LifetimeShape`](LifetimeShape.md)

Defined in: core/dist/reactive/lifetime.d.ts:110

The owning disposal handle — for advanced/debug composition only.

## Methods

### \[dispose\]()

> **\[dispose\]**(): `void`

Defined in: core/dist/reactive/lifetime.d.ts:114

Well-known disposer so the resource works with a `using` declaration.

#### Returns

`void`

***

### dispose()

> **dispose**(): `void`

Defined in: core/dist/reactive/lifetime.d.ts:112

Tear down exactly once (synchronously). Idempotent — inherited from [Lifetime](../type-aliases/Lifetime.md).

#### Returns

`void`

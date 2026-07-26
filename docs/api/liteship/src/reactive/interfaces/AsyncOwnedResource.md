[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / AsyncOwnedResource

# Interface: AsyncOwnedResource

Defined in: core/dist/reactive/lifetime.d.ts:125

A resource that owns its teardown ASYNCHRONOUSLY — the default, because
[LifetimeShape.dispose](LifetimeShape.md#dispose) returns a promise that settles once every async
finalizer settles. `dispose()` delegates to the owning Lifetime; the
`[Symbol.asyncDispose]` well-known method makes it usable with an
`await using` declaration. `lifetime` stays reachable for advanced/debug
composition, but the value IS the disposable — there is no pair to
destructure and separately own.

## Properties

### lifetime

> `readonly` **lifetime**: [`LifetimeShape`](LifetimeShape.md)

Defined in: core/dist/reactive/lifetime.d.ts:127

The owning disposal handle — for advanced/debug composition only.

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:131

Well-known disposer so the resource works with an `await using` declaration.

#### Returns

`Promise`\<`void`\>

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:129

Tear down exactly once; the returned promise settles when async finalizers settle. Idempotent.

#### Returns

`Promise`\<`void`\>

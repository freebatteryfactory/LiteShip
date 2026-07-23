[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / AsyncOwnedResource

# Interface: AsyncOwnedResource

Defined in: [core/src/reactive/lifetime.ts:283](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L283)

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

Defined in: [core/src/reactive/lifetime.ts:285](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L285)

The owning disposal handle — for advanced/debug composition only.

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: [core/src/reactive/lifetime.ts:289](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L289)

Well-known disposer so the resource works with an `await using` declaration.

#### Returns

`Promise`\<`void`\>

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [core/src/reactive/lifetime.ts:287](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L287)

Tear down exactly once; the returned promise settles when async finalizers settle. Idempotent.

#### Returns

`Promise`\<`void`\>

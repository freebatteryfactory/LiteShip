[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / LifetimeShape

# Interface: LifetimeShape

Defined in: [core/src/reactive/lifetime.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L48)

Live Lifetime handle — the owner of an ordered finalizer stack.

## Properties

### \_tag

> `readonly` **\_tag**: `"Lifetime"`

Defined in: [core/src/reactive/lifetime.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L49)

***

### add

> `readonly` **add**: (`finalizer`) => () => `void`

Defined in: [core/src/reactive/lifetime.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L59)

Register `finalizer` to run on dispose (LIFO). Returns a handle that
unregisters it if called before dispose. If the Lifetime is already
disposed, `finalizer` runs immediately and the handle is a no-op.

#### Parameters

##### finalizer

[`Finalizer`](../type-aliases/Finalizer.md)

#### Returns

() => `void`

***

### dispose

> `readonly` **dispose**: () => `Promise`\<`void`\>

Defined in: [core/src/reactive/lifetime.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L67)

Run every finalizer exactly once in LIFO order and abort [signal](#signal).
Sync finalizers execute synchronously in this call; the returned promise
settles once every async finalizer settles. Idempotent — subsequent calls
return the same promise. Rejects with a [LifetimeDisposeError](../type-aliases/LifetimeDisposeError.md) if any
finalizer threw or rejected; resolves otherwise.

#### Returns

`Promise`\<`void`\>

***

### disposed

> `readonly` **disposed**: `boolean`

Defined in: [core/src/reactive/lifetime.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L51)

True once `dispose()` has been initiated (flips synchronously).

***

### signal

> `readonly` **signal**: [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)

Defined in: [core/src/reactive/lifetime.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L53)

An `AbortSignal` that aborts synchronously when `dispose()` begins.

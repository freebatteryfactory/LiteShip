[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / LifetimeShape

# Interface: LifetimeShape

Defined in: core/dist/reactive/lifetime.d.ts:41

Live Lifetime handle — the owner of an ordered finalizer stack.

## Properties

### \_tag

> `readonly` **\_tag**: `"Lifetime"`

Defined in: core/dist/reactive/lifetime.d.ts:42

***

### add

> `readonly` **add**: (`finalizer`) => () => `void`

Defined in: core/dist/reactive/lifetime.d.ts:52

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

Defined in: core/dist/reactive/lifetime.d.ts:60

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

Defined in: core/dist/reactive/lifetime.d.ts:44

True once `dispose()` has been initiated (flips synchronously).

***

### signal

> `readonly` **signal**: [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)

Defined in: core/dist/reactive/lifetime.d.ts:46

An `AbortSignal` that aborts synchronously when `dispose()` begins.

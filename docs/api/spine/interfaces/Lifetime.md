[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Lifetime

# Interface: Lifetime

Defined in: [\_spine/core.d.ts:146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L146)

Lifetime — the disposal primitive that replaces `Scope`/`ManagedRuntime` at the
shed seams. Owns a LIFO finalizer stack disposed exactly once; `signal` projects
cancellation, and `dispose()` settles once every async finalizer settles.

## Properties

### \_tag

> `readonly` **\_tag**: `"Lifetime"`

Defined in: [\_spine/core.d.ts:147](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L147)

***

### add

> `readonly` **add**: (`finalizer`) => () => `void`

Defined in: [\_spine/core.d.ts:153](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L153)

Register a finalizer (LIFO); returns an unregister handle. Runs now if already disposed.

#### Parameters

##### finalizer

() => `void` \| `Promise`\<`void`\>

#### Returns

() => `void`

***

### dispose

> `readonly` **dispose**: () => `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:155](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L155)

Run every finalizer once in LIFO order; the returned promise settles once async finalizers settle.

#### Returns

`Promise`\<`void`\>

***

### disposed

> `readonly` **disposed**: `boolean`

Defined in: [\_spine/core.d.ts:149](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L149)

True once `dispose()` has been initiated (flips synchronously).

***

### signal

> `readonly` **signal**: [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)

Defined in: [\_spine/core.d.ts:151](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L151)

An `AbortSignal` that aborts synchronously when `dispose()` begins.

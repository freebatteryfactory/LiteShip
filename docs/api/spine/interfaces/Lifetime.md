[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / Lifetime

# Interface: Lifetime

Defined in: [\_spine/core.d.ts:153](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L153)

Lifetime — the disposal primitive that replaces `Scope`/`ManagedRuntime` at the
shed seams. Owns a LIFO finalizer stack disposed exactly once; `signal` projects
cancellation, and `dispose()` settles once every async finalizer settles.

## Properties

### \_tag

> `readonly` **\_tag**: `"Lifetime"`

Defined in: [\_spine/core.d.ts:154](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L154)

***

### add

> `readonly` **add**: (`finalizer`) => () => `void`

Defined in: [\_spine/core.d.ts:160](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L160)

Register a finalizer (LIFO); returns an unregister handle. Runs now if already disposed.

#### Parameters

##### finalizer

() => `void` \| `Promise`\<`void`\>

#### Returns

() => `void`

***

### dispose

> `readonly` **dispose**: () => `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:162](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L162)

Run every finalizer once in LIFO order; the returned promise settles once async finalizers settle.

#### Returns

`Promise`\<`void`\>

***

### disposed

> `readonly` **disposed**: `boolean`

Defined in: [\_spine/core.d.ts:156](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L156)

True once `dispose()` has been initiated (flips synchronously).

***

### signal

> `readonly` **signal**: [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)

Defined in: [\_spine/core.d.ts:158](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L158)

An `AbortSignal` that aborts synchronously when `dispose()` begins.

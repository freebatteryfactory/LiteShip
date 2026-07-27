[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Lifetime

# Variable: Lifetime

> **Lifetime**: `object`

Defined in: [core/src/reactive/lifetime.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L50)

Lifetime — construct a disposal handle that owns a LIFO finalizer stack.
Register teardown with `add`, tear down once with `dispose`, and project
cancellation through `signal`.

## Type Declaration

### make

> **make**: () => [`Lifetime`](../interfaces/Lifetime.md)

Build a fresh, undisposed Lifetime.

#### Returns

[`Lifetime`](../interfaces/Lifetime.md)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Lifetime

# Variable: Lifetime

> `const` **Lifetime**: `object`

Defined in: [core/src/reactive/lifetime.ts:226](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L226)

Lifetime — construct a disposal handle that owns a LIFO finalizer stack.
Register teardown with `add`, tear down once with `dispose`, and project
cancellation through `signal`.

## Type Declaration

### make

> **make**: () => [`LifetimeShape`](../interfaces/LifetimeShape.md)

Build a fresh, undisposed Lifetime.

#### Returns

[`LifetimeShape`](../interfaces/LifetimeShape.md)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Lifetime

# Variable: Lifetime

> `const` **Lifetime**: `object`

Defined in: [core/src/lifetime.ts:224](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/lifetime.ts#L224)

Lifetime — construct a disposal handle that owns a LIFO finalizer stack.
Register teardown with `add`, tear down once with `dispose`, and project
cancellation through `signal`.

## Type Declaration

### make

> **make**: () => [`LifetimeShape`](../interfaces/LifetimeShape.md)

Build a fresh, undisposed Lifetime.

#### Returns

[`LifetimeShape`](../interfaces/LifetimeShape.md)

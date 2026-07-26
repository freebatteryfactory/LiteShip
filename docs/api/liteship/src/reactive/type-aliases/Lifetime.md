[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / Lifetime

# Type Alias: Lifetime

> **Lifetime** = `object`

Defined in: core/dist/reactive/lifetime.d.ts:79

Lifetime — construct a disposal handle that owns a LIFO finalizer stack.
Register teardown with `add`, tear down once with `dispose`, and project
cancellation through `signal`.

## Properties

### make

> `readonly` **make**: () => [`LifetimeShape`](../interfaces/LifetimeShape.md)

Defined in: core/dist/reactive/lifetime.d.ts:81

Build a fresh, undisposed Lifetime.

#### Returns

[`LifetimeShape`](../interfaces/LifetimeShape.md)

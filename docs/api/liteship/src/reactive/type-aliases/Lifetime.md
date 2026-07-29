[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/reactive](../README.md) / Lifetime

# Type Alias: Lifetime

> **Lifetime** = `object`

Defined in: core/dist/reactive/lifetime.d.ts:41

Lifetime — construct a disposal handle that owns a LIFO finalizer stack.
Register teardown with `add`, tear down once with `dispose`, and project
cancellation through `signal`.

## Properties

### make

> `readonly` **make**: () => `Lifetime`

Defined in: core/dist/reactive/lifetime.d.ts:81

Build a fresh, undisposed Lifetime.

#### Returns

`Lifetime`

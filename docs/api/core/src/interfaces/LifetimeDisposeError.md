[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / LifetimeDisposeError

# Interface: LifetimeDisposeError

Defined in: [core/src/reactive/lifetime.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L75)

The aggregate raised when one or more finalizers fail during `dispose()`.
`causes` holds every failure in LIFO invocation order; the first is chained
through the platform `Error.cause`.

## Extends

- `TaggedError`\<`"LifetimeDisposeError"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"LifetimeDisposeError"`

Defined in: error/dist/contract.d.ts:28

The discriminant. Unique per variant; what `matchTag`/`hasTag` key on.

#### Inherited from

`TaggedError._tag`

***

### causes

> `readonly` **causes**: readonly `unknown`[]

Defined in: [core/src/reactive/lifetime.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L77)

The finalizer failures, in LIFO invocation order.

***

### message

> `readonly` **message**: `string`

Defined in: error/dist/contract.d.ts:30

Human-readable summary. Doubles as the transport `Error.message`.

#### Inherited from

`TaggedError.message`

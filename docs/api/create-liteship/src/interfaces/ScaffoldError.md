[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [create-liteship/src](../README.md) / ScaffoldError

# Interface: ScaffoldError

Defined in: [create-liteship/src/scaffold.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/create-liteship/src/scaffold.ts#L46)

A typed scaffold refusal carried through LiteShip's shared error algebra.

## Extends

- [`ValidationError`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts)

## Properties

### \_tag

> `readonly` **\_tag**: `"ValidationError"`

Defined in: error/dist/contract.d.ts:28

The discriminant. Unique per variant; what `matchTag`/`hasTag` key on.

#### Inherited from

`ValidationError._tag`

***

### detail

> `readonly` **detail**: `string`

Defined in: error/dist/variants.d.ts:33

What was wrong, in human terms.

#### Inherited from

`ValidationError.detail`

***

### message

> `readonly` **message**: `string`

Defined in: error/dist/contract.d.ts:30

Human-readable summary. Doubles as the transport `Error.message`.

#### Inherited from

[`LifetimeDisposeError`](../../../core/src/interfaces/LifetimeDisposeError.md).[`message`](../../../core/src/interfaces/LifetimeDisposeError.md#message)

***

### module

> `readonly` **module**: `string`

Defined in: error/dist/variants.d.ts:31

The unit that rejected the input, e.g. `'defineBoundary'`.

#### Inherited from

`ValidationError.module`

***

### path

> `readonly` **path**: `string`

Defined in: [create-liteship/src/scaffold.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/create-liteship/src/scaffold.ts#L48)

***

### reason

> `readonly` **reason**: [`ScaffoldFailureReason`](../type-aliases/ScaffoldFailureReason.md)

Defined in: [create-liteship/src/scaffold.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/create-liteship/src/scaffold.ts#L47)

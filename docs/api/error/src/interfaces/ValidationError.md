[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [error/src](../README.md) / ValidationError

# Interface: ValidationError

Defined in: [error/src/variants.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L31)

A precondition, argument, or factory-input check failed — the value was
structurally fine but semantically rejected (out of range, empty, mutually
exclusive options, call-order violation).

Migration target for: `LiteshipValidationError`, `InvalidParamsError`, and the
argument/config validation throws across `cli`, `core`, `cloudflare`.

## Extends

- [`TaggedError`](TaggedError.md)\<`"ValidationError"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"ValidationError"`

Defined in: [error/src/contract.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L33)

The discriminant. Unique per variant; what `matchTag`/`hasTag` key on.

#### Inherited from

[`TaggedError`](TaggedError.md).[`_tag`](TaggedError.md#_tag)

***

### detail

> `readonly` **detail**: `string`

Defined in: [error/src/variants.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L35)

What was wrong, in human terms.

***

### message

> `readonly` **message**: `string`

Defined in: [error/src/contract.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L35)

Human-readable summary. Doubles as the transport `Error.message`.

#### Inherited from

[`TaggedError`](TaggedError.md).[`message`](TaggedError.md#message)

***

### module

> `readonly` **module**: `string`

Defined in: [error/src/variants.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L33)

The unit that rejected the input, e.g. `'defineBoundary'`.

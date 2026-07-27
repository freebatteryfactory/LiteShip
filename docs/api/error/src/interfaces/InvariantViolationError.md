[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / InvariantViolationError

# Interface: InvariantViolationError

Defined in: [error/src/variants.ts:144](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L144)

An internal invariant was violated — a state the program's own logic should
make impossible (counter overflow, ring-buffer state machine breach,
assembly-contract violation, DAG cycle). Distinct from [ValidationError](../variables/ValidationError.md):
the bad value did NOT come from a caller, it came from us.

Migration target for: the state-machine/contract throws across `worker`,
`core` (`assembly`, `hlc`, `plan`), `scene`.

## Extends

- [`TaggedError`](TaggedError.md)\<`"InvariantViolationError"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"InvariantViolationError"`

Defined in: [error/src/contract.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L33)

The discriminant. Unique per variant; what `matchTag`/`hasTag` key on.

#### Inherited from

[`TaggedError`](TaggedError.md).[`_tag`](TaggedError.md#_tag)

***

### code?

> `readonly` `optional` **code?**: `"error/match-tag/unhandled"`

Defined in: [error/src/variants.ts:150](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L150)

Stable diagnostic identity when the invariant is part of a public failure contract.

***

### detail

> `readonly` **detail**: `string`

Defined in: [error/src/variants.ts:148](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L148)

What was observed, in human terms.

***

### invariant

> `readonly` **invariant**: `string`

Defined in: [error/src/variants.ts:146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L146)

The invariant that broke, e.g. `'spsc-ring.capacity'`.

***

### message

> `readonly` **message**: `string`

Defined in: [error/src/contract.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L35)

Human-readable summary. Doubles as the transport `Error.message`.

#### Inherited from

[`TaggedError`](TaggedError.md).[`message`](TaggedError.md#message)

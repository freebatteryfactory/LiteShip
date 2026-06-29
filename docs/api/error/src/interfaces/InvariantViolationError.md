[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / InvariantViolationError

# Interface: InvariantViolationError

Defined in: [error/src/variants.ts:143](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L143)

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

Defined in: [error/src/contract.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L29)

The discriminant. Unique per variant; what `matchTag`/`hasTag` key on.

#### Inherited from

[`TaggedError`](TaggedError.md).[`_tag`](TaggedError.md#_tag)

***

### detail

> `readonly` **detail**: `string`

Defined in: [error/src/variants.ts:147](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L147)

What was observed, in human terms.

***

### invariant

> `readonly` **invariant**: `string`

Defined in: [error/src/variants.ts:145](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L145)

The invariant that broke, e.g. `'spsc-ring.capacity'`.

***

### message

> `readonly` **message**: `string`

Defined in: [error/src/contract.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L31)

Human-readable summary. Doubles as the transport `Error.message`.

#### Inherited from

[`TaggedError`](TaggedError.md).[`message`](TaggedError.md#message)

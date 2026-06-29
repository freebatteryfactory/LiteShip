[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Reason

# Interface: Reason

Defined in: [core/src/capsule.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L55)

One link in a [Decision](Decision.md)'s reason chain — a typed justification for the
verdict. `code` is a stable, machine-readable discriminant (e.g.
`'site-not-admitted'`); `message` is the human-readable explanation. A `deny`
carries at least one reason naming WHY the subject was rejected; an `allow`
may carry an informational reason naming what was admitted.

Only meaningful for `policyGate` arms (the verdict of [CapsuleContract.decide](CapsuleContract.md#decide)).

## Properties

### code

> `readonly` **code**: `string`

Defined in: [core/src/capsule.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L57)

Stable, machine-readable reason discriminant (e.g. `'no-rung-admits'`).

***

### message

> `readonly` **message**: `string`

Defined in: [core/src/capsule.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L59)

Human-readable explanation of this reason.

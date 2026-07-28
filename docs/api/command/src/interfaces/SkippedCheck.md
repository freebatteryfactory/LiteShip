[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / SkippedCheck

# Interface: SkippedCheck

Defined in: [command/src/checks/plan.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L81)

A registry check dropped from a plan, with the exact applicability reason.

## Properties

### id

> `readonly` **id**: `string`

Defined in: [command/src/checks/plan.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L83)

The skipped check's identity, `check/<slug>`.

***

### reason

> `readonly` **reason**: `string`

Defined in: [command/src/checks/plan.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L85)

Why it was skipped (for example, a context or platform mismatch).

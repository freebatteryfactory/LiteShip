[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / SkippedCheck

# Interface: SkippedCheck

Defined in: [command/src/checks/plan.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L52)

A registry check dropped from a plan, with the exact applicability reason.

## Properties

### id

> `readonly` **id**: `string`

Defined in: [command/src/checks/plan.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L54)

The skipped check's identity, `check/<slug>`.

***

### reason

> `readonly` **reason**: `string`

Defined in: [command/src/checks/plan.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L56)

Why it was skipped (for example, a context or platform mismatch).

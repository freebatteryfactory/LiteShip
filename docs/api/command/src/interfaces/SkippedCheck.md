[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / SkippedCheck

# Interface: SkippedCheck

Defined in: [command/src/checks/plan.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L64)

A registry check dropped from a plan, with the exact applicability reason.

## Properties

### id

> `readonly` **id**: `string`

Defined in: [command/src/checks/plan.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L66)

The skipped check's identity, `check/<slug>`.

***

### reason

> `readonly` **reason**: `string`

Defined in: [command/src/checks/plan.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L68)

Why it was skipped (for example, a context or platform mismatch).

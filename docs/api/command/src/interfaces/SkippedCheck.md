[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / SkippedCheck

# Interface: SkippedCheck

Defined in: [command/src/checks/plan.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L61)

A registry check dropped from a plan, with the exact applicability reason.

## Properties

### id

> `readonly` **id**: `string`

Defined in: [command/src/checks/plan.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L63)

The skipped check's identity, `check/<slug>`.

***

### reason

> `readonly` **reason**: `string`

Defined in: [command/src/checks/plan.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L65)

Why it was skipped (for example, a context or platform mismatch).

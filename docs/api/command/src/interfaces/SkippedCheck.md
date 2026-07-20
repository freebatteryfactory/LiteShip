[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / SkippedCheck

# Interface: SkippedCheck

Defined in: [command/src/checks/plan.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L50)

A registry check dropped from a plan, with the reason (today: unsupported platform).

## Properties

### id

> `readonly` **id**: `string`

Defined in: [command/src/checks/plan.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L52)

The skipped check's identity, `check/<slug>`.

***

### reason

> `readonly` **reason**: `string`

Defined in: [command/src/checks/plan.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L54)

Why it was skipped (e.g. "not supported on win32").

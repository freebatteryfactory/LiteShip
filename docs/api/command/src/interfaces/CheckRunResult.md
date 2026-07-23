[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckRunResult

# Interface: CheckRunResult

Defined in: [command/src/checks/plan.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L92)

One executed check's result — the per-check row of a [CheckReport](CheckReport.md).

## Properties

### cacheHit

> `readonly` **cacheHit**: `boolean`

Defined in: [command/src/checks/plan.ts:100](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L100)

True iff a content-addressed cache hit served this verdict without re-running.

***

### durationMs

> `readonly` **durationMs**: `number`

Defined in: [command/src/checks/plan.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L98)

The measured wall-clock (ms) the run took (0 for a cache hit / skip).

***

### findings

> `readonly` **findings**: readonly `string`[]

Defined in: [command/src/checks/plan.ts:102](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L102)

The human-readable findings this check surfaced (empty on a clean pass).

***

### id

> `readonly` **id**: `string`

Defined in: [command/src/checks/plan.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L94)

The check identity, `check/<slug>`.

***

### verdict

> `readonly` **verdict**: [`CheckVerdict`](../type-aliases/CheckVerdict.md)

Defined in: [command/src/checks/plan.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L96)

The verdict this run produced.

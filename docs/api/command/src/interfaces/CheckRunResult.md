[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckRunResult

# Interface: CheckRunResult

Defined in: [command/src/checks/plan.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L83)

One executed check's result — the per-check row of a [CheckReport](CheckReport.md).

## Properties

### cacheHit

> `readonly` **cacheHit**: `boolean`

Defined in: [command/src/checks/plan.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L91)

True iff a content-addressed cache hit served this verdict without re-running.

***

### durationMs

> `readonly` **durationMs**: `number`

Defined in: [command/src/checks/plan.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L89)

The measured wall-clock (ms) the run took (0 for a cache hit / skip).

***

### findings

> `readonly` **findings**: readonly `string`[]

Defined in: [command/src/checks/plan.ts:93](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L93)

The human-readable findings this check surfaced (empty on a clean pass).

***

### id

> `readonly` **id**: `string`

Defined in: [command/src/checks/plan.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L85)

The check identity, `check/<slug>`.

***

### verdict

> `readonly` **verdict**: [`CheckVerdict`](../type-aliases/CheckVerdict.md)

Defined in: [command/src/checks/plan.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L87)

The verdict this run produced.

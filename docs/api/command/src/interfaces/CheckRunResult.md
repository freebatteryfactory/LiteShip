[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [command/src](../README.md) / CheckRunResult

# Interface: CheckRunResult

Defined in: [command/src/checks/plan.ts:112](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L112)

One executed check's result — the per-check row of a [CheckReport](CheckReport.md).

## Properties

### cacheHit

> `readonly` **cacheHit**: `boolean`

Defined in: [command/src/checks/plan.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L120)

True iff a content-addressed cache hit served this verdict without re-running.

***

### curePacketId?

> `readonly` `optional` **curePacketId?**: `string`

Defined in: [command/src/checks/plan.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L124)

Content-digested cure packet for this failure, when one was emitted.

***

### durationMs

> `readonly` **durationMs**: `number`

Defined in: [command/src/checks/plan.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L118)

The measured wall-clock (ms) the run took (0 for a cache hit / skip).

***

### findings

> `readonly` **findings**: readonly `string`[]

Defined in: [command/src/checks/plan.ts:122](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L122)

The human-readable findings this check surfaced (empty on a clean pass).

***

### id

> `readonly` **id**: `string`

Defined in: [command/src/checks/plan.ts:114](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L114)

The check identity, `check/<slug>`.

***

### verdict

> `readonly` **verdict**: [`CheckVerdict`](../type-aliases/CheckVerdict.md)

Defined in: [command/src/checks/plan.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L116)

The verdict this run produced.

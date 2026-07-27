[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckRunResult

# Interface: CheckRunResult

Defined in: [command/src/checks/plan.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L95)

One executed check's result — the per-check row of a [CheckReport](CheckReport.md).

## Properties

### cacheHit

> `readonly` **cacheHit**: `boolean`

Defined in: [command/src/checks/plan.ts:103](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L103)

True iff a content-addressed cache hit served this verdict without re-running.

***

### curePacketId?

> `readonly` `optional` **curePacketId?**: `string`

Defined in: [command/src/checks/plan.ts:107](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L107)

Content-digested cure packet for this failure, when one was emitted.

***

### durationMs

> `readonly` **durationMs**: `number`

Defined in: [command/src/checks/plan.ts:101](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L101)

The measured wall-clock (ms) the run took (0 for a cache hit / skip).

***

### findings

> `readonly` **findings**: readonly `string`[]

Defined in: [command/src/checks/plan.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L105)

The human-readable findings this check surfaced (empty on a clean pass).

***

### id

> `readonly` **id**: `string`

Defined in: [command/src/checks/plan.ts:97](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L97)

The check identity, `check/<slug>`.

***

### verdict

> `readonly` **verdict**: [`CheckVerdict`](../type-aliases/CheckVerdict.md)

Defined in: [command/src/checks/plan.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L99)

The verdict this run produced.

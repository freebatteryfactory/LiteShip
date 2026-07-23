[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / PlannedCheck

# Interface: PlannedCheck

Defined in: [command/src/checks/plan.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L33)

One check as scheduled into a plan — the registry entry projected to what a run needs.

## Properties

### authority

> `readonly` **authority**: [`CheckAuthority`](../type-aliases/CheckAuthority.md)

Defined in: [command/src/checks/plan.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L49)

Whether a finding (or non-zero exit) blocks the aggregate verdict.

***

### cache

> `readonly` **cache**: [`CheckCache`](../type-aliases/CheckCache.md)

Defined in: [command/src/checks/plan.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L51)

The verdict cache discipline (see [CheckCache](../type-aliases/CheckCache.md)).

***

### cacheable

> `readonly` **cacheable**: `boolean`

Defined in: [command/src/checks/plan.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L53)

True iff `cache === 'content-addressed'` — a warm run may skip this check when no input changed.

***

### claim

> `readonly` **claim**: `string`

Defined in: [command/src/checks/plan.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L39)

The single sentence this check proves.

***

### command

> `readonly` **command**: `string`

Defined in: [command/src/checks/plan.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L43)

The full shell line the host spawns.

***

### context

> `readonly` **context**: [`CheckContext`](../type-aliases/CheckContext.md)

Defined in: [command/src/checks/plan.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L41)

The context in which this check's claim is being scheduled.

***

### execution?

> `readonly` `optional` **execution?**: [`CliCheckExecution`](CliCheckExecution.md)

Defined in: [command/src/checks/plan.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L45)

Structured CLI execution, when this check is owned by the current LiteShip application.

***

### id

> `readonly` **id**: `string`

Defined in: [command/src/checks/plan.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L35)

The check identity, `check/<slug>`.

***

### inputs

> `readonly` **inputs**: readonly `string`[]

Defined in: [command/src/checks/plan.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L57)

Globs whose change invalidates this check's content-addressed verdict.

***

### owner

> `readonly` **owner**: `string`

Defined in: [command/src/checks/plan.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L47)

The package or script path that owns the assertion.

***

### timeoutMs

> `readonly` **timeoutMs**: `number`

Defined in: [command/src/checks/plan.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L55)

The wall-clock ceiling (ms) after which the host aborts the check.

***

### title

> `readonly` **title**: `string`

Defined in: [command/src/checks/plan.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L37)

Human title for the plan line.

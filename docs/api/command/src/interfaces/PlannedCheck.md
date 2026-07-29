[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [command/src](../README.md) / PlannedCheck

# Interface: PlannedCheck

Defined in: [command/src/checks/plan.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L49)

One check as scheduled into a plan — the registry entry projected to what a run needs.

## Properties

### authority

> `readonly` **authority**: [`CheckAuthority`](../type-aliases/CheckAuthority.md)

Defined in: [command/src/checks/plan.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L67)

Whether a finding (or non-zero exit) blocks the aggregate verdict.

***

### cache

> `readonly` **cache**: [`CheckCache`](../type-aliases/CheckCache.md)

Defined in: [command/src/checks/plan.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L69)

The verdict cache discipline (see [CheckCache](../type-aliases/CheckCache.md)).

***

### cacheable

> `readonly` **cacheable**: `boolean`

Defined in: [command/src/checks/plan.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L71)

True iff `cache === 'content-addressed'` — a warm run may skip this check when no input changed.

***

### claim

> `readonly` **claim**: `string`

Defined in: [command/src/checks/plan.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L55)

The single sentence this check proves.

***

### command

> `readonly` **command**: `string`

Defined in: [command/src/checks/plan.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L59)

The full shell line the host spawns.

***

### context

> `readonly` **context**: [`CheckContext`](../type-aliases/CheckContext.md)

Defined in: [command/src/checks/plan.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L57)

The context in which this check's claim is being scheduled.

***

### execution

> `readonly` **execution**: [`CheckExecution`](../type-aliases/CheckExecution.md)

Defined in: [command/src/checks/plan.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L61)

Structured CLI execution, when this check is owned by the current LiteShip application.

***

### id

> `readonly` **id**: `string`

Defined in: [command/src/checks/plan.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L51)

The check identity, `check/<slug>`.

***

### inputs

> `readonly` **inputs**: readonly `string`[]

Defined in: [command/src/checks/plan.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L75)

Globs whose change invalidates this check's content-addressed verdict.

***

### owner

> `readonly` **owner**: `string`

Defined in: [command/src/checks/plan.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L63)

The package or script path that owns the assertion.

***

### prerequisites

> `readonly` **prerequisites**: readonly `string`[]

Defined in: [command/src/checks/plan.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L77)

Check identities that must execute successfully before this row.

***

### remediation

> `readonly` **remediation**: `string`

Defined in: [command/src/checks/plan.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L65)

Precise first remediation step projected into failure evidence.

***

### timeoutMs

> `readonly` **timeoutMs**: `number`

Defined in: [command/src/checks/plan.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L73)

The wall-clock ceiling (ms) after which the host aborts the check.

***

### title

> `readonly` **title**: `string`

Defined in: [command/src/checks/plan.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L53)

Human title for the plan line.

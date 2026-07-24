[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / PlannedCheck

# Interface: PlannedCheck

Defined in: [command/src/checks/plan.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L34)

One check as scheduled into a plan — the registry entry projected to what a run needs.

## Properties

### authority

> `readonly` **authority**: [`CheckAuthority`](../type-aliases/CheckAuthority.md)

Defined in: [command/src/checks/plan.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L52)

Whether a finding (or non-zero exit) blocks the aggregate verdict.

***

### cache

> `readonly` **cache**: [`CheckCache`](../type-aliases/CheckCache.md)

Defined in: [command/src/checks/plan.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L54)

The verdict cache discipline (see [CheckCache](../type-aliases/CheckCache.md)).

***

### cacheable

> `readonly` **cacheable**: `boolean`

Defined in: [command/src/checks/plan.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L56)

True iff `cache === 'content-addressed'` — a warm run may skip this check when no input changed.

***

### claim

> `readonly` **claim**: `string`

Defined in: [command/src/checks/plan.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L40)

The single sentence this check proves.

***

### command

> `readonly` **command**: `string`

Defined in: [command/src/checks/plan.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L44)

The full shell line the host spawns.

***

### context

> `readonly` **context**: [`CheckContext`](../type-aliases/CheckContext.md)

Defined in: [command/src/checks/plan.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L42)

The context in which this check's claim is being scheduled.

***

### execution?

> `readonly` `optional` **execution?**: [`CliCheckExecution`](CliCheckExecution.md)

Defined in: [command/src/checks/plan.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L46)

Structured CLI execution, when this check is owned by the current LiteShip application.

***

### id

> `readonly` **id**: `string`

Defined in: [command/src/checks/plan.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L36)

The check identity, `check/<slug>`.

***

### inputs

> `readonly` **inputs**: readonly `string`[]

Defined in: [command/src/checks/plan.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L60)

Globs whose change invalidates this check's content-addressed verdict.

***

### owner

> `readonly` **owner**: `string`

Defined in: [command/src/checks/plan.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L48)

The package or script path that owns the assertion.

***

### remediation

> `readonly` **remediation**: `string`

Defined in: [command/src/checks/plan.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L50)

Precise first remediation step projected into failure evidence.

***

### timeoutMs

> `readonly` **timeoutMs**: `number`

Defined in: [command/src/checks/plan.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L58)

The wall-clock ceiling (ms) after which the host aborts the check.

***

### title

> `readonly` **title**: `string`

Defined in: [command/src/checks/plan.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L38)

Human title for the plan line.

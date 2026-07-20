[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / PlannedCheck

# Interface: PlannedCheck

Defined in: [command/src/checks/plan.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L26)

One check as scheduled into a plan — the registry entry projected to what a run needs.

## Properties

### authority

> `readonly` **authority**: [`CheckAuthority`](../type-aliases/CheckAuthority.md)

Defined in: [command/src/checks/plan.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L38)

Whether a finding (or non-zero exit) blocks the aggregate verdict.

***

### cache

> `readonly` **cache**: [`CheckCache`](../type-aliases/CheckCache.md)

Defined in: [command/src/checks/plan.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L40)

The verdict cache discipline (see [CheckCache](../type-aliases/CheckCache.md)).

***

### cacheable

> `readonly` **cacheable**: `boolean`

Defined in: [command/src/checks/plan.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L42)

True iff `cache === 'content-addressed'` — a warm run may skip this check when no input changed.

***

### claim

> `readonly` **claim**: `string`

Defined in: [command/src/checks/plan.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L32)

The single sentence this check proves.

***

### command

> `readonly` **command**: `string`

Defined in: [command/src/checks/plan.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L34)

The full shell line the host spawns.

***

### id

> `readonly` **id**: `string`

Defined in: [command/src/checks/plan.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L28)

The check identity, `check/<slug>`.

***

### inputs

> `readonly` **inputs**: readonly `string`[]

Defined in: [command/src/checks/plan.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L46)

Globs whose change invalidates this check's content-addressed verdict.

***

### owner

> `readonly` **owner**: `string`

Defined in: [command/src/checks/plan.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L36)

The package or script path that owns the assertion.

***

### timeoutMs

> `readonly` **timeoutMs**: `number`

Defined in: [command/src/checks/plan.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L44)

The wall-clock ceiling (ms) after which the host aborts the check.

***

### title

> `readonly` **title**: `string`

Defined in: [command/src/checks/plan.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L30)

Human title for the plan line.

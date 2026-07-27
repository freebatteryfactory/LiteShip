[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckPlan

# Interface: CheckPlan

Defined in: [command/src/checks/plan.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L72)

The ordered, cache-annotated projection of the registry for one `(profile, platform)`.

## Properties

### checks

> `readonly` **checks**: readonly [`PlannedCheck`](PlannedCheck.md)[]

Defined in: [command/src/checks/plan.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L80)

The checks to run, in declared plan order.

***

### context

> `readonly` **context**: [`CheckContext`](../type-aliases/CheckContext.md)

Defined in: [command/src/checks/plan.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L78)

The repository/application fact domain this plan is authoritative over.

***

### estimatedMs

> `readonly` **estimatedMs**: `number`

Defined in: [command/src/checks/plan.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L86)

The UPPER-BOUND estimated wall-clock (ms) — the sum of the planned checks'
`timeoutMs` ceilings. It is a ceiling, not a measured mean: no timing corpus
exists yet, so the plan reports the worst case a host must budget for.

***

### platform

> `readonly` **platform**: [`CheckPlatform`](../type-aliases/CheckPlatform.md)

Defined in: [command/src/checks/plan.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L76)

The platform this plan targets.

***

### profile

> `readonly` **profile**: [`CheckProfile`](../type-aliases/CheckProfile.md)

Defined in: [command/src/checks/plan.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L74)

The profile this plan projects.

***

### skipped

> `readonly` **skipped**: readonly [`SkippedCheck`](SkippedCheck.md)[]

Defined in: [command/src/checks/plan.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L88)

The registry checks in this profile that were skipped, with reasons.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckPlan

# Interface: CheckPlan

Defined in: [command/src/checks/plan.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L69)

The ordered, cache-annotated projection of the registry for one `(profile, platform)`.

## Properties

### checks

> `readonly` **checks**: readonly [`PlannedCheck`](PlannedCheck.md)[]

Defined in: [command/src/checks/plan.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L77)

The checks to run, in declared plan order.

***

### context

> `readonly` **context**: [`CheckContext`](../type-aliases/CheckContext.md)

Defined in: [command/src/checks/plan.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L75)

The repository/application fact domain this plan is authoritative over.

***

### estimatedMs

> `readonly` **estimatedMs**: `number`

Defined in: [command/src/checks/plan.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L83)

The UPPER-BOUND estimated wall-clock (ms) — the sum of the planned checks'
`timeoutMs` ceilings. It is a ceiling, not a measured mean: no timing corpus
exists yet, so the plan reports the worst case a host must budget for.

***

### platform

> `readonly` **platform**: [`CheckPlatform`](../type-aliases/CheckPlatform.md)

Defined in: [command/src/checks/plan.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L73)

The platform this plan targets.

***

### profile

> `readonly` **profile**: [`CheckProfile`](../type-aliases/CheckProfile.md)

Defined in: [command/src/checks/plan.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L71)

The profile this plan projects.

***

### skipped

> `readonly` **skipped**: readonly [`SkippedCheck`](SkippedCheck.md)[]

Defined in: [command/src/checks/plan.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L85)

The registry checks in this profile that were skipped, with reasons.

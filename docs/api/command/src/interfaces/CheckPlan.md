[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckPlan

# Interface: CheckPlan

Defined in: [command/src/checks/plan.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L58)

The ordered, cache-annotated projection of the registry for one `(profile, platform)`.

## Properties

### checks

> `readonly` **checks**: readonly [`PlannedCheck`](PlannedCheck.md)[]

Defined in: [command/src/checks/plan.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L64)

The checks to run, in declared plan order.

***

### estimatedMs

> `readonly` **estimatedMs**: `number`

Defined in: [command/src/checks/plan.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L70)

The UPPER-BOUND estimated wall-clock (ms) — the sum of the planned checks'
`timeoutMs` ceilings. It is a ceiling, not a measured mean: no timing corpus
exists yet, so the plan reports the worst case a host must budget for.

***

### platform

> `readonly` **platform**: [`CheckPlatform`](../type-aliases/CheckPlatform.md)

Defined in: [command/src/checks/plan.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L62)

The platform this plan targets.

***

### profile

> `readonly` **profile**: [`CheckProfile`](../type-aliases/CheckProfile.md)

Defined in: [command/src/checks/plan.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L60)

The profile this plan projects.

***

### skipped

> `readonly` **skipped**: readonly [`SkippedCheck`](SkippedCheck.md)[]

Defined in: [command/src/checks/plan.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L72)

The registry checks in this profile that were skipped, with reasons.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / planChecks

# Function: planChecks()

> **planChecks**(`profile`, `platform`, `context?`): [`CheckPlan`](../interfaces/CheckPlan.md)

Defined in: [command/src/checks/plan.ts:142](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L142)

Project [CHECK\_REGISTRY](../variables/CHECK_REGISTRY.md) into the ordered, cache-annotated plan for
`profile` on `platform`. PURE + TOTAL: filter by profile membership, preserve
registry order, keep the platform-supported checks in `checks` and the rest in
`skipped`. Runs nothing.

## Parameters

### profile

[`CheckProfile`](../type-aliases/CheckProfile.md)

### platform

[`CheckPlatform`](../type-aliases/CheckPlatform.md)

### context?

[`CheckContext`](../type-aliases/CheckContext.md) = `'repository'`

## Returns

[`CheckPlan`](../interfaces/CheckPlan.md)

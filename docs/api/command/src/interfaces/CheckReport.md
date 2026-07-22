[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckReport

# Interface: CheckReport

Defined in: [command/src/checks/plan.ts:103](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L103)

The report an executed sweep emits — the `--json` output contract. Planning
produces the plan; the execution host (the CLI spawn layer / the existing
`runGauntlet` context) runs the plan and fills `results`. `blocked` is true iff
any BLOCKING check failed; `ok` additionally requires at least one check to
have executed, so an all-skipped plan is explicitly unverified rather than green.

## Properties

### blocked

> `readonly` **blocked**: `boolean`

Defined in: [command/src/checks/plan.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L113)

True iff ≥1 blocking check failed.

***

### context

> `readonly` **context**: [`CheckContext`](../type-aliases/CheckContext.md)

Defined in: [command/src/checks/plan.ts:109](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L109)

The repository/application fact domain this report actually evaluated.

***

### ok

> `readonly` **ok**: `boolean`

Defined in: [command/src/checks/plan.ts:111](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L111)

True iff at least one check executed and no blocking check failed.

***

### platform

> `readonly` **platform**: [`CheckPlatform`](../type-aliases/CheckPlatform.md)

Defined in: [command/src/checks/plan.ts:107](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L107)

The platform the sweep ran on.

***

### profile

> `readonly` **profile**: [`CheckProfile`](../type-aliases/CheckProfile.md)

Defined in: [command/src/checks/plan.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L105)

The profile the sweep ran.

***

### results

> `readonly` **results**: readonly [`CheckRunResult`](CheckRunResult.md)[]

Defined in: [command/src/checks/plan.ts:115](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L115)

The per-check results, in plan order.

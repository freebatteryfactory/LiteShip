[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckReport

# Interface: CheckReport

Defined in: [command/src/checks/plan.ts:112](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L112)

The report an executed sweep emits — the `--json` output contract. Planning
produces the plan; the execution host (the CLI spawn layer / the existing
`runGauntlet` context) runs the plan and fills `results`. `blocked` is true iff
any BLOCKING check failed; `ok` additionally requires at least one check to
have executed, so an all-skipped plan is explicitly unverified rather than green.

## Properties

### blocked

> `readonly` **blocked**: `boolean`

Defined in: [command/src/checks/plan.ts:122](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L122)

True iff ≥1 blocking check failed.

***

### context

> `readonly` **context**: [`CheckContext`](../type-aliases/CheckContext.md)

Defined in: [command/src/checks/plan.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L118)

The repository/application fact domain this report actually evaluated.

***

### ok

> `readonly` **ok**: `boolean`

Defined in: [command/src/checks/plan.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L120)

True iff at least one check executed and no blocking check failed.

***

### platform

> `readonly` **platform**: [`CheckPlatform`](../type-aliases/CheckPlatform.md)

Defined in: [command/src/checks/plan.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L116)

The platform the sweep ran on.

***

### profile

> `readonly` **profile**: [`CheckProfile`](../type-aliases/CheckProfile.md)

Defined in: [command/src/checks/plan.ts:114](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L114)

The profile the sweep ran.

***

### results

> `readonly` **results**: readonly [`CheckRunResult`](CheckRunResult.md)[]

Defined in: [command/src/checks/plan.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L124)

The per-check results, in plan order.

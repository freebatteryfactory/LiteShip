[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckReport

# Interface: CheckReport

Defined in: [command/src/checks/plan.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L98)

The report an executed sweep emits — the `--json` output contract. Planning
produces the plan; the execution host (the CLI spawn layer / the existing
`runGauntlet` context) runs the plan and fills `results`. `blocked` is true iff
any BLOCKING check failed; `ok` is its negation.

## Properties

### blocked

> `readonly` **blocked**: `boolean`

Defined in: [command/src/checks/plan.ts:106](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L106)

True iff ≥1 blocking check failed.

***

### ok

> `readonly` **ok**: `boolean`

Defined in: [command/src/checks/plan.ts:104](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L104)

True iff no blocking check failed.

***

### platform

> `readonly` **platform**: [`CheckPlatform`](../type-aliases/CheckPlatform.md)

Defined in: [command/src/checks/plan.ts:102](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L102)

The platform the sweep ran on.

***

### profile

> `readonly` **profile**: [`CheckProfile`](../type-aliases/CheckProfile.md)

Defined in: [command/src/checks/plan.ts:100](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L100)

The profile the sweep ran.

***

### results

> `readonly` **results**: readonly [`CheckRunResult`](CheckRunResult.md)[]

Defined in: [command/src/checks/plan.ts:108](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L108)

The per-check results, in plan order.

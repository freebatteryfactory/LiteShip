[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckReport

# Interface: CheckReport

Defined in: [command/src/checks/plan.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L117)

The report an executed sweep emits — the `--json` output contract. Planning
produces the plan; the execution host (the CLI spawn layer / the existing
`runGauntlet` context) runs the plan and fills `results`. `blocked` is true iff
any BLOCKING check failed; `ok` additionally requires at least one check to
have executed, so an all-skipped plan is explicitly unverified rather than green.

## Properties

### blocked

> `readonly` **blocked**: `boolean`

Defined in: [command/src/checks/plan.ts:127](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L127)

True iff ≥1 blocking check failed.

***

### context

> `readonly` **context**: [`CheckContext`](../type-aliases/CheckContext.md)

Defined in: [command/src/checks/plan.ts:123](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L123)

The repository/application fact domain this report actually evaluated.

***

### curePackets

> `readonly` **curePackets**: readonly [`CurePacket`](CurePacket.md)[]

Defined in: [command/src/checks/plan.ts:131](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L131)

Deterministic repair evidence for every failed authority in this report.

***

### ok

> `readonly` **ok**: `boolean`

Defined in: [command/src/checks/plan.ts:125](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L125)

True iff at least one check executed and no blocking check failed.

***

### platform

> `readonly` **platform**: [`CheckPlatform`](../type-aliases/CheckPlatform.md)

Defined in: [command/src/checks/plan.ts:121](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L121)

The platform the sweep ran on.

***

### profile

> `readonly` **profile**: [`CheckProfile`](../type-aliases/CheckProfile.md)

Defined in: [command/src/checks/plan.ts:119](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L119)

The profile the sweep ran.

***

### results

> `readonly` **results**: readonly [`CheckRunResult`](CheckRunResult.md)[]

Defined in: [command/src/checks/plan.ts:129](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/plan.ts#L129)

The per-check results, in plan order.

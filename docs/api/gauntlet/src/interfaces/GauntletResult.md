[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GauntletResult

# Interface: GauntletResult

Defined in: [gauntlet/src/engine.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L43)

The result of a gauntlet run.

## Properties

### blocked

> `readonly` **blocked**: `boolean`

Defined in: [gauntlet/src/engine.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L49)

True iff a blocking gate failed, qualification integrity failed, or a waiver expired/was forbidden.

***

### findings

> `readonly` **findings**: readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/engine.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L45)

All KEPT findings across all gates, with authority already applied to severity.

***

### outcomes

> `readonly` **outcomes**: readonly [`GateOutcome`](GateOutcome.md)[]

Defined in: [gauntlet/src/engine.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L47)

Per-gate outcomes (proofs = the qualification receipts).

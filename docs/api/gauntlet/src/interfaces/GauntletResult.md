[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GauntletResult

# Interface: GauntletResult

Defined in: [gauntlet/src/engine.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L41)

The result of a gauntlet run.

## Properties

### blocked

> `readonly` **blocked**: `boolean`

Defined in: [gauntlet/src/engine.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L47)

True iff any self-proven (blocking) gate emitted an `error` finding, or a waiver expired/was forbidden.

***

### findings

> `readonly` **findings**: readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/engine.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L43)

All KEPT findings across all gates, with authority already applied to severity.

***

### outcomes

> `readonly` **outcomes**: readonly [`GateOutcome`](GateOutcome.md)[]

Defined in: [gauntlet/src/engine.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L45)

Per-gate outcomes (proofs = the qualification receipts).

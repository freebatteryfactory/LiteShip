[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GauntletResult

# Interface: GauntletResult

Defined in: [gauntlet/src/engine.ts:40](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L40)

The result of a gauntlet run.

## Properties

### blocked

> `readonly` **blocked**: `boolean`

Defined in: [gauntlet/src/engine.ts:46](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L46)

True iff any self-proven (blocking) gate emitted an `error` finding, or a waiver expired/was forbidden.

***

### findings

> `readonly` **findings**: readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/engine.ts:42](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L42)

All KEPT findings across all gates, with authority already applied to severity.

***

### outcomes

> `readonly` **outcomes**: readonly [`GateOutcome`](GateOutcome.md)[]

Defined in: [gauntlet/src/engine.ts:44](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L44)

Per-gate outcomes (proofs = the qualification receipts).

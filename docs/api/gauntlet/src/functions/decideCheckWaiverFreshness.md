[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / decideCheckWaiverFreshness

# Function: decideCheckWaiverFreshness()

> **decideCheckWaiverFreshness**(`facts`): readonly [`Finding`](../interfaces/Finding.md)[]

Defined in: [gauntlet/src/gates/check-waiver-freshness.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/check-waiver-freshness.ts#L63)

THE DECISION — data in, findings out, NO context. One finding per EXPIRED waiver,
across both the gauntlet registry and the traceability ledger. Fresh waivers emit nothing.

## Parameters

### facts

[`FactBundle`](../interfaces/FactBundle.md)

## Returns

readonly [`Finding`](../interfaces/Finding.md)[]

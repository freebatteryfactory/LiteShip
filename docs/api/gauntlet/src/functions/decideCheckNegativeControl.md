[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / decideCheckNegativeControl

# Function: decideCheckNegativeControl()

> **decideCheckNegativeControl**(`facts`): readonly [`Finding`](../interfaces/Finding.md)[]

Defined in: [gauntlet/src/gates/check-negative-control.ts:106](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/check-negative-control.ts#L106)

THE DECISION — data in, findings out, NO context. Over the BLOCKING checks it
enforces the total, disjoint negative-control partition: one finding per way a
blocking check breaks it (dangling / unclassified / conflict). Advisory checks
emit nothing.

## Parameters

### facts

[`FactBundle`](../interfaces/FactBundle.md)

## Returns

readonly [`Finding`](../interfaces/Finding.md)[]

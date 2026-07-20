[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / decideCheckNegativeControl

# Function: decideCheckNegativeControl()

> **decideCheckNegativeControl**(`facts`): readonly [`Finding`](../interfaces/Finding.md)[]

Defined in: [gauntlet/src/gates/check-negative-control.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/check-negative-control.ts#L57)

THE DECISION — data in, findings out, NO context. One finding per blocking check
whose DECLARED negativeControl path does not exist. A blocking check with no declared
control, and any advisory check, emit nothing.

## Parameters

### facts

[`FactBundle`](../interfaces/FactBundle.md)

## Returns

readonly [`Finding`](../interfaces/Finding.md)[]

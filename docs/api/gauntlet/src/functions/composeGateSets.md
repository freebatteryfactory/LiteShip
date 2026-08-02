[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / composeGateSets

# Function: composeGateSets()

> **composeGateSets**(...`sets`): readonly [`Gate`](../interfaces/Gate.md)[]

Defined in: [gauntlet/src/runner.ts:148](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L148)

Compose gate sets by identity, rejecting conflicting duplicate ids. The
returned order is the first-seen order, so a projection is deterministic and
additions cannot silently shadow an existing authority.

## Parameters

### sets

...readonly readonly [`Gate`](../interfaces/Gate.md)[][]

## Returns

readonly [`Gate`](../interfaces/Gate.md)[]

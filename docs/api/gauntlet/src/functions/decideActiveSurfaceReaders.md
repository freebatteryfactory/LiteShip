[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / decideActiveSurfaceReaders

# Function: decideActiveSurfaceReaders()

> **decideActiveSurfaceReaders**(`facts`): readonly [`Finding`](../interfaces/Finding.md)[]

Defined in: [gauntlet/src/gates/active-modeled-surface-reader.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/active-modeled-surface-reader.ts#L54)

THE DECISION — data in, findings out, NO context. One finding per active surface
with ≥1 unread required field; inactive or fully-read surfaces emit nothing.

## Parameters

### facts

[`FactBundle`](../interfaces/FactBundle.md)

## Returns

readonly [`Finding`](../interfaces/Finding.md)[]

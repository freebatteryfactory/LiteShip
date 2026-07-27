[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / decideCheckRegistryComplete

# Function: decideCheckRegistryComplete()

> **decideCheckRegistryComplete**(`facts`): readonly [`Finding`](../interfaces/Finding.md)[]

Defined in: [gauntlet/src/gates/check-registry-complete.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/check-registry-complete.ts#L55)

THE DECISION — data in, findings out, NO context. Reads only the partition slice:
 - UNCOVERED — a root script that is neither registered nor exempt.
 - OVERLAP   — a root script that is BOTH registered and exempt (not disjoint).
 - UNRESOLVED — a registered check whose command references a non-existent script.

## Parameters

### facts

[`FactBundle`](../interfaces/FactBundle.md)

## Returns

readonly [`Finding`](../interfaces/Finding.md)[]

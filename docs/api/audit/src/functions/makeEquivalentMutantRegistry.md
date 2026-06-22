[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / makeEquivalentMutantRegistry

# Function: makeEquivalentMutantRegistry()

> **makeEquivalentMutantRegistry**(`entries`): [`EquivalentMutantRegistry`](../interfaces/EquivalentMutantRegistry.md)

Defined in: [audit/src/mutation-equivalents.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-equivalents.ts#L77)

Build an [EquivalentMutantRegistry](../interfaces/EquivalentMutantRegistry.md) from a committed entry list. The lookup
is by `mutantId` (the content address — the anti-drift key). De-duplication is by
id: two entries with the same id are an authoring error (a tagged throw), never a
silent last-wins. Pure + deterministic.

## Parameters

### entries

readonly [`EquivalentMutantEntry`](../interfaces/EquivalentMutantEntry.md)[]

## Returns

[`EquivalentMutantRegistry`](../interfaces/EquivalentMutantRegistry.md)

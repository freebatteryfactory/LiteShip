[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / parseEquivalentMutants

# Function: parseEquivalentMutants()

> **parseEquivalentMutants**(`raw`): readonly [`EquivalentMutantEntry`](../interfaces/EquivalentMutantEntry.md)[]

Defined in: [audit/src/mutation-equivalents.ts:103](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-equivalents.ts#L103)

Parse a committed equivalent-mutant registry document (the shape of
`benchmarks/mutation-equivalents.json`) into a validated entry list. The document is
`{ "entries": EquivalentMutantEntry[] }`. Every field is validated (a corrupt
registry artifact must be visible, never silently treated as "no equivalents"); a
malformed entry is a tagged [ParseError](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/variants.ts), never a coercion.

## Parameters

### raw

`unknown`

## Returns

readonly [`EquivalentMutantEntry`](../interfaces/EquivalentMutantEntry.md)[]

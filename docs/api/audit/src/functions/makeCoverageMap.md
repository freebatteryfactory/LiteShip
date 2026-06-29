[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / makeCoverageMap

# Function: makeCoverageMap()

> **makeCoverageMap**(`relation`): [`CoverageMap`](../interfaces/CoverageMap.md)

Defined in: [audit/src/mutation-verdict.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L80)

Build a deterministic [CoverageMap](../interfaces/CoverageMap.md) from a flat `(file, line, testId)`
relation. The relation is de-duplicated and the per-site test lists are SORTED, so
the resulting covering set — and therefore its digest — is byte-stable regardless
of the relation's input order. The host supplies the relation from its coverage
tool; this composer makes it deterministic.

## Parameters

### relation

readonly `object`[]

## Returns

[`CoverageMap`](../interfaces/CoverageMap.md)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / benchmarkSubjectFactFor

# Function: benchmarkSubjectFactFor()

> **benchmarkSubjectFactFor**(`facts`, `distribution`): [`BenchmarkSubjectFact`](../interfaces/BenchmarkSubjectFact.md) \| `undefined`

Defined in: [gauntlet/src/gates/bench-subjects.ts:192](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/bench-subjects.ts#L192)

Resolve the exact host-produced fact for one declared distribution.

## Parameters

### facts

[`BenchmarkSubjectFacts`](../interfaces/BenchmarkSubjectFacts.md) \| `undefined`

### distribution

`Pick`\<[`QualifiedBenchDistribution`](../interfaces/QualifiedBenchDistribution.md), `"name"` \| `"file"`\>

## Returns

[`BenchmarkSubjectFact`](../interfaces/BenchmarkSubjectFact.md) \| `undefined`

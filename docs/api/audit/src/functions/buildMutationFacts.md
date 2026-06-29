[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / buildMutationFacts

# Function: buildMutationFacts()

> **buildMutationFacts**(`files`, `options`): [`MutationFacts`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/mutation-facts.ts)

Defined in: [audit/src/mutation-facts-build.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-facts-build.ts#L80)

Build the [MutationFacts](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/mutation-facts.ts) for a set of target files — generate the
deterministic mutants per file, evaluate each against the injected runner, and
fold the verdicts into the flat outcomes. Deterministic: the outcomes are sorted
by (file, line, column, operator) so the facts are byte-stable across runs over
unchanged source + identical runner verdicts. The lean gate folds these.

## Parameters

### files

readonly [`MutationTargetFile`](../interfaces/MutationTargetFile.md)[]

### options

[`MutationBuildOptions`](../interfaces/MutationBuildOptions.md)

## Returns

[`MutationFacts`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/mutation-facts.ts)

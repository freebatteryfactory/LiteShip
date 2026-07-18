[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / buildTransitionFacts

# Function: buildTransitionFacts()

> **buildTransitionFacts**(`runs`, `options`): [`TransitionFacts`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/transition-facts.ts)

Defined in: [audit/src/transition-facts-build.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/transition-facts-build.ts#L117)

Build the [TransitionFacts](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/transition-facts.ts) for one conformance family's run — content-address
each op history, decide each case's bisimulation verdict, fold the operation coverage,
and assemble the flat, sorted facts. Deterministic: the cases are sorted by (seed,
traceDigest) so the facts are byte-stable across runs over identical inputs + oracle
outcomes. The lean gate folds these.

## Parameters

### runs

readonly [`TransitionRun`](../interfaces/TransitionRun.md)[]

### options

[`TransitionBuildOptions`](../interfaces/TransitionBuildOptions.md)

## Returns

[`TransitionFacts`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/transition-facts.ts)

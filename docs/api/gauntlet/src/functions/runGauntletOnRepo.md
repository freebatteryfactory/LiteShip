[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / runGauntletOnRepo

# Function: runGauntletOnRepo()

> **runGauntletOnRepo**(`gates`, `opts`, `runOpts?`): [`GauntletResult`](../interfaces/GauntletResult.md)

Defined in: [gauntlet/src/runner.ts:328](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L328)

Run `gates` over the real repo at `opts.repoRoot`, scoped to `opts.globs`.
Equivalent to `runGates(gates, nodeContext(opts.repoRoot, opts.globs), runOpts)`
— the `runOpts` (assurance map, waivers, injected clock) flow straight through,
so a real-repo run gets the SAME level-scoping + waiver mechanism the in-memory
path uses. Without `runOpts.assuranceMap` every gate sees all globbed files
(back-compat); with it each gate is aimed at its level (no red-drowning).

## Parameters

### gates

readonly [`Gate`](../interfaces/Gate.md)[]

### opts

[`RunGauntletOnRepoOptions`](../interfaces/RunGauntletOnRepoOptions.md)

### runOpts?

[`RunGatesOptions`](../interfaces/RunGatesOptions.md) = `{}`

## Returns

[`GauntletResult`](../interfaces/GauntletResult.md)

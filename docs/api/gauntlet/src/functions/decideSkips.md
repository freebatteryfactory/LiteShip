[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / decideSkips

# Function: decideSkips()

> **decideSkips**(`facts`, `decide?`): readonly [`Finding`](../interfaces/Finding.md)[]

Defined in: [gauntlet/src/gates/no-skipped-test-fact.ts:80](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gates/no-skipped-test-fact.ts#L80)

THE DECISION — data in, findings out, NO context. Maps the declared [SkipSiteFacts](../interfaces/SkipSiteFacts.md)
pack through the per-site [kernel](decideSkipSite.md) (injectable, so the mutation fixture
can swap in a plausible-but-wrong kernel) and emits a finding for every blocked site. An
absent pack (`context.skipSites` not injected) folds to an empty verdict.

## Parameters

### facts

[`FactBundle`](../interfaces/FactBundle.md)

### decide?

(`site`) => [`SkipVerdict`](../type-aliases/SkipVerdict.md)

## Returns

readonly [`Finding`](../interfaces/Finding.md)[]

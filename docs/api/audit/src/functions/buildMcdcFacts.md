[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / buildMcdcFacts

# Function: buildMcdcFacts()

> **buildMcdcFacts**(`files`, `options`): [`McdcFacts`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/mcdc-facts.ts)

Defined in: [audit/src/mcdc-facts-build.ts:112](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mcdc-facts-build.ts#L112)

Build the [McdcFacts](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/mcdc-facts.ts) for a set of target files — generate the deterministic
condition-mutants per file, evaluate each FORCE-TRUE / FORCE-FALSE pin against the
injected runner (the SAME verdict path the mutation builder uses), and FOLD the two
pins per atomic condition into one [McdcConditionOutcome](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/mcdc-facts.ts). Deterministic: the
outcomes are sorted by (file, line, column) so the facts are byte-stable across runs
over unchanged source + identical runner verdicts. The lean gate folds these.

## Parameters

### files

readonly [`McdcTargetFile`](../interfaces/McdcTargetFile.md)[]

### options

[`McdcBuildOptions`](../interfaces/McdcBuildOptions.md)

## Returns

[`McdcFacts`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/mcdc-facts.ts)

## Throws

InvariantViolationError if a condition is missing one of its two pins (the
        engine always mints both per condition; a missing pin would be an engine bug,
        surfaced loud rather than folded into a partial outcome).

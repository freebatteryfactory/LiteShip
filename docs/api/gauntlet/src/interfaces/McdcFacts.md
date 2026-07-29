[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / McdcFacts

# Interface: McdcFacts

Defined in: [gauntlet/src/facts/mcdc-facts.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mcdc-facts.ts#L44)

The host-supplied MC/DC evidence over one run. The condition-mutation engine is HEAVY
(a vitest run per pin, two pins per condition), so production runs it OPT-IN, scoped to
effective-L4 and catalog-enrolled semantic targets + cached + shardable; when the host did not run it this whole
capability is simply ABSENT from the GateContext and the gate is not in the set (no
cost, no noise). When present it carries every per-condition outcome (both pins'
verdicts folded) — the substrate the gate folds into MC/DC-gap Findings.

## Properties

### conditions

> `readonly` **conditions**: readonly [`McdcConditionOutcome`](McdcConditionOutcome.md)[]

Defined in: [gauntlet/src/facts/mcdc-facts.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mcdc-facts.ts#L46)

Every L4 decision's atomic conditions, each with both pins' folded verdict.

***

### targetCensus

> `readonly` **targetCensus**: readonly `McdcTargetCensus`[]

Defined in: [gauntlet/src/facts/mcdc-facts.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mcdc-facts.ts#L48)

Every admitted target, including files with zero applicable boolean conditions.

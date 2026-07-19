[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / McdcFacts

# Interface: McdcFacts

Defined in: [gauntlet/src/facts/mcdc-facts.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mcdc-facts.ts#L43)

The host-supplied MC/DC evidence over one run. The condition-mutation engine is HEAVY
(a vitest run per pin, two pins per condition), so production runs it OPT-IN, scoped to
the propagated-L4 seams + cached + shardable; when the host did not run it this whole
capability is simply ABSENT from the GateContext and the gate is not in the set (no
cost, no noise). When present it carries every per-condition outcome (both pins'
verdicts folded) — the substrate the gate folds into MC/DC-gap Findings.

## Properties

### conditions

> `readonly` **conditions**: readonly [`McdcConditionOutcome`](McdcConditionOutcome.md)[]

Defined in: [gauntlet/src/facts/mcdc-facts.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mcdc-facts.ts#L45)

Every L4 decision's atomic conditions, each with both pins' folded verdict.

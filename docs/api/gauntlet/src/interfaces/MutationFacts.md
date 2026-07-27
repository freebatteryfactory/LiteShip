[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / MutationFacts

# Interface: MutationFacts

Defined in: [gauntlet/src/facts/mutation-facts.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L36)

The host-supplied mutation evidence over one run. The mutation engine is HEAVY
(a vitest run per mutant), so production runs it OPT-IN, scoped to the
effective-L4 and catalog-enrolled semantic targets + cached + shardable; when the host did not run mutation this
whole capability is simply ABSENT from the GateContext and the gate is not in the
set (no cost, no noise). When present it carries every per-mutant outcome plus the
committed score BASELINE the ratchet compares against.

## Properties

### operatorApplicability

> `readonly` **operatorApplicability**: readonly `MutationOperatorApplicability`[]

Defined in: [gauntlet/src/facts/mutation-facts.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L42)

Every operator's applicability count for every admitted target, including zero.

***

### outcomes

> `readonly` **outcomes**: readonly [`MutantOutcome`](MutantOutcome.md)[]

Defined in: [gauntlet/src/facts/mutation-facts.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L38)

Every evaluated mutant's outcome — the substrate the gate folds.

***

### scoreBaseline

> `readonly` **scoreBaseline**: `Readonly`\<`Record`\<`string`, `number`\>\>

Defined in: [gauntlet/src/facts/mutation-facts.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L51)

The committed per-file mutation-score baseline (the ratchet artifact, e.g.
`benchmarks/mutation-score.json`). A file whose freshly-computed score DROPS
below its committed baseline is a regression finding (the score may only ever
rise). A file absent from the baseline has no ratchet floor (its first
measurement establishes the baseline — reported as informational, never a
regression). Keyed by the same [MutantOutcome.file](MutantOutcome.md#file) ids.

***

### targetCensus

> `readonly` **targetCensus**: readonly [`MutationTargetCensus`](MutationTargetCensus.md)[]

Defined in: [gauntlet/src/facts/mutation-facts.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L40)

Every admitted target and why it entered the run, including zero-applicability files.

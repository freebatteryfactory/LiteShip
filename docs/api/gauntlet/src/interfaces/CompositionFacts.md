[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / CompositionFacts

# Interface: CompositionFacts

Defined in: [gauntlet/src/facts/composition-facts.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/composition-facts.ts#L57)

The composition evidence the host supplies — the interaction edges between
individually-tested units, each already classified covered/uncovered. The host
derives the edges from the IR call/import graph and the individually-tested set
from the test corpus; the gate folds the UNCOVERED ones into findings. An
empty/absent `edges` is reported by the gate as an advisory "not-evidenced"
finding (honest under-coverage, never a silent green) — see
[compositionCoverageGate](../variables/compositionCoverageGate.md).

## Properties

### acceptedUncovered?

> `readonly` `optional` **acceptedUncovered?**: readonly `string`[]

Defined in: [gauntlet/src/facts/composition-facts.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/composition-facts.ts#L71)

The committed uncovered-edge BASELINE (the ratchet artifact,
`benchmarks/composition-uncovered-baseline.json`) — accepted legacy debt
enumerated by EXACT edge identity (`from -> to via symbol`; the first full
sweep on cured main named 535 of them, issue #164). The fold discipline is
the test-constitution ratchet: an uncovered edge IN the baseline reports as
`advisory` (recorded, reviewable debt); an uncovered edge NOT in it blocks
at full severity (no NEW untested interaction ever lands silently); a
baseline entry that is no longer uncovered reports as a `warning` naming
the stale entry (the baseline only ever SHRINKS). Absent = empty.

***

### edges?

> `readonly` `optional` **edges?**: readonly [`InteractionEdge`](InteractionEdge.md)[]

Defined in: [gauntlet/src/facts/composition-facts.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/composition-facts.ts#L59)

Every interaction edge between two individually-tested units the host classified.

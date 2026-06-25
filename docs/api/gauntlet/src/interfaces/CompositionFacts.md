[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / CompositionFacts

# Interface: CompositionFacts

Defined in: [gauntlet/src/composition-facts.ts:57](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/composition-facts.ts#L57)

The composition evidence the host supplies — the interaction edges between
individually-tested units, each already classified covered/uncovered. The host
derives the edges from the IR call/import graph and the individually-tested set
from the test corpus; the gate folds the UNCOVERED ones into findings. An
empty/absent `edges` is reported by the gate as an advisory "not-evidenced"
finding (honest under-coverage, never a silent green) — see
[compositionCoverageGate](../variables/compositionCoverageGate.md).

## Properties

### edges?

> `readonly` `optional` **edges?**: readonly [`InteractionEdge`](InteractionEdge.md)[]

Defined in: [gauntlet/src/composition-facts.ts:59](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/composition-facts.ts#L59)

Every interaction edge between two individually-tested units the host classified.

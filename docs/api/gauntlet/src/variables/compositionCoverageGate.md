[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / compositionCoverageGate

# Variable: compositionCoverageGate

> `const` **compositionCoverageGate**: [`Gate`](../interfaces/Gate.md)

Defined in: [gauntlet/src/gates/composition-coverage.ts:252](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gates/composition-coverage.ts#L252)

The composition-coverage gate — each UNCOVERED interaction edge between two
individually-tested units becomes a self-explaining Finding at the edge's
propagated level. REPORT-not-DECIDE. It reads the IR (level propagation) + folds the
host-injected CompositionFacts (advisory when absent), so it runs only on the opt-in
host `--composition` path. Earns blocking authority via the existing ratchet.

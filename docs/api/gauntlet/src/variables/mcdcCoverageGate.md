[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / mcdcCoverageGate

# Variable: mcdcCoverageGate

> `const` **mcdcCoverageGate**: [`Gate`](../interfaces/Gate.md)

Defined in: [gauntlet/src/gates/mcdc-coverage.ts:277](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gates/mcdc-coverage.ts#L277)

The MC/DC-coverage gate — each uncovered atomic condition (its independent effect not
observed by the suite — a surviving force-true/force-false pin) becomes a
self-explaining Finding at the file's PROPAGATED assurance level, the MC/DC floor by
level deciding blocking (L4 demands FULL MC/DC — DO-178B Level A). Folds host-injected
McdcFacts. REPORT-not-DECIDE. It [requireMcdc](../functions/requireMcdc.md) + reads the IR, so it runs only on
the opt-in host path. Earns blocking authority via the existing ratchet.

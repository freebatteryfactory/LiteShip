[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / transitionConformanceGate

# Variable: transitionConformanceGate

> `const` **transitionConformanceGate**: [`Gate`](../interfaces/Gate.md)

Defined in: [gauntlet/src/gates/transition-conformance.ts:280](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/transition-conformance.ts#L280)

The transition-conformance gate — each `divergent` bisimulation case becomes a
self-explaining, REPLAYABLE Finding at the family's assurance level (severity by
level deciding blocking); each `unevidenced` case is a coverage gap floored by the
committed ratchet. REPORT-not-DECIDE. It [requireTransition](../functions/requireTransition.md), so it runs only when a
host injects the facts — the repo-local `transition:gate` phase
(`scripts/transition-conformance-gate.ts`), NOT the shipped `czap check` CLI. Earns
blocking authority via the shipped ratchet.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / mutationDivergenceGate

# Variable: mutationDivergenceGate

> `const` **mutationDivergenceGate**: [`Gate`](../interfaces/Gate.md)

Defined in: [gauntlet/src/gates/mutation-divergence.ts:340](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/mutation-divergence.ts#L340)

The mutation-divergence gate — each surviving / no-coverage mutant becomes a
self-explaining Finding at the file's propagated assurance level, the kill-floor
deciding blocking; a per-file score drop vs the committed baseline is a regression
finding. REPORT-not-DECIDE. It [requireMutation](../functions/requireMutation.md) + reads the IR, so it runs
only on the opt-in host path. Earns blocking authority via the existing ratchet.

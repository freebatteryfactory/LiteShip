[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / noDefaultExportDivergenceGate

# Variable: noDefaultExportDivergenceGate

> `const` **noDefaultExportDivergenceGate**: [`Gate`](../interfaces/Gate.md)

Defined in: [gauntlet/src/gates/no-default-export-divergence.ts:43](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gates/no-default-export-divergence.ts#L43)

The oracle-divergence gate for `is-default-export` — the meta-gauntlet
self-proof, expressed through the shared factory. Its red/green/mutation
fixtures are the factory's in-memory [RepoIR](../interfaces/RepoIR.md)s where the two oracles agree
or disagree, and they ARE the proof the gate catches an injected divergence.
Earns blocking authority via the existing ratchet — no engine change.

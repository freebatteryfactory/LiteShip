[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / symbolOrphanDivergenceGate

# Variable: symbolOrphanDivergenceGate

> `const` **symbolOrphanDivergenceGate**: [`Gate`](../interfaces/Gate.md)

Defined in: [gauntlet/src/gates/symbol-orphan-divergence.ts:332](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/symbol-orphan-divergence.ts#L332)

The symbol-orphan-divergence gate — the meta-gauntlet self-proof. Its
red/green/mutation fixtures are in-memory [RepoIR](../interfaces/RepoIR.md)s where the
symbol-evidenced oracle and the file-proxy `refs` graph agree or disagree, and
they ARE the proof the gate catches an injected divergence. Earns blocking
authority via the existing ratchet — no engine change.

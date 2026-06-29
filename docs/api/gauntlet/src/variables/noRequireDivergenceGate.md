[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / noRequireDivergenceGate

# Variable: noRequireDivergenceGate

> `const` **noRequireDivergenceGate**: [`Gate`](../interfaces/Gate.md)

Defined in: [gauntlet/src/gates/no-require-divergence.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/no-require-divergence.ts#L37)

The oracle-divergence gate for the `require-call` property — triangulates the
AST oracle (a real CommonJS-loader call expression) against the NO_REQUIRE
invariant-regex. Self-proves through the shared factory fixtures; earns blocking
authority via the existing ratchet.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / noVarDivergenceGate

# Variable: noVarDivergenceGate

> `const` **noVarDivergenceGate**: [`Gate`](../interfaces/Gate.md)

Defined in: [gauntlet/src/gates/no-var-divergence.ts:36](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gates/no-var-divergence.ts#L36)

The oracle-divergence gate for the `var-declaration` property — triangulates the
AST oracle (a real legacy variable statement) against the NO_VAR
invariant-regex. Self-proves through the shared factory fixtures; earns blocking
authority via the existing ratchet.

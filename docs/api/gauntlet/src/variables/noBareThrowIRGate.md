[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / noBareThrowIRGate

# Variable: noBareThrowIRGate

> `const` **noBareThrowIRGate**: [`Gate`](../interfaces/Gate.md)

Defined in: [gauntlet/src/gates/no-bare-throw-ir.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/no-bare-throw-ir.ts#L84)

The IR-fold no-bare-throw gate — fixtures are in-memory [RepoIR](../interfaces/RepoIR.md)s (not
text maps), proving the gate folds the AST oracle's facts. Self-proves via the
same ratchet as every gate.

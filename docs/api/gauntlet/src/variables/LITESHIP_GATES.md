[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / LITESHIP\_GATES

# Variable: LITESHIP\_GATES

> `const` **LITESHIP\_GATES**: readonly [`Gate`](../interfaces/Gate.md)[]

Defined in: [gauntlet/src/runner.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L70)

LiteShip's built-in gate set — the gates the repo runs against itself. The three
always-blocking gates ([noSkippedTestGate](noSkippedTestGate.md) / [noPlaceholderGate](noPlaceholderGate.md) /
[noEarlyReturnTestGate](noEarlyReturnTestGate.md)) are listed alongside the four hygiene gates: their
rule ids are exactly the ones [ALWAYS\_BLOCKING\_RULES](ALWAYS_BLOCKING_RULES.md) reserves, so the
forbidden floor now guards rules a REAL gate emits (no inert surface). A downstream
project composes its own gates onto this set.

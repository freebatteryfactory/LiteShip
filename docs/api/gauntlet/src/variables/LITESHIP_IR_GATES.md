[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / LITESHIP\_IR\_GATES

# Variable: LITESHIP\_IR\_GATES

> `const` **LITESHIP\_IR\_GATES**: readonly [`Gate`](../interfaces/Gate.md)[]

Defined in: [gauntlet/src/runner.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L99)

The HOST gate set — what the CLI runs WHEN it has built + injected the repo-IR
(Slice B, B1, step 3). It is [LITESHIP\_GATES](LITESHIP_GATES.md) with the regex
[noBareThrowGate](noBareThrowGate.md) RE-EXPRESSED as the IR-fold [noBareThrowIRGate](noBareThrowIRGate.md)
(same ruleId — the faithful substrate swap, NOT a second gate double-counting
the same rule; the parity test proves the fold reproduces the regex gate's real
findings and is strictly more precise), PLUS the [noDefaultExportDivergenceGate](noDefaultExportDivergenceGate.md)
— the live triangulated cross-check over the two `is-default-export` oracles —
PLUS the B3.2 sibling cross-checks [noVarDivergenceGate](noVarDivergenceGate.md) (the
`var-declaration` property) and [noRequireDivergenceGate](noRequireDivergenceGate.md) (the
`require-call` property). All three are instances of the same parametric
`makeOracleDivergenceGate` factory — the proof the triangulated-oracle layer is
a reusable LAYER, not a one-off.

These IR-fold gates [requireIR](../functions/requireIR.md), so they CANNOT run on the lean
MCP/command path (no IR) — they appear ONLY here, the IR-present composition. The
lean [LITESHIP\_GATES](LITESHIP_GATES.md) default is unchanged: `liteship check` / MCP still runs
the seven regex gates IR-free.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / runGates

# Function: runGates()

> **runGates**(`gates`, `context`, `opts?`): [`GauntletResult`](../interfaces/GauntletResult.md)

Defined in: [gauntlet/src/engine.ts:388](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L388)

Run a set of gates over `context`. Each gate is first verified against its own
fixtures; unproven gates run but are demoted to advisory. When `opts.assuranceMap`
is given, each gate sees ONLY files at-or-above its level (rigor scoping — no
more red-drowning); without it every gate sees all files (back-compat). When
`opts.waivers` are given, they are applied to each gate's findings against the
injected `opts.now` (defaults to the epoch — NEVER `Date.now()`): matched
findings are suppressed, and expired/stale/forbidden waivers surface as their
own findings (expired + forbidden BLOCK).

Returns the merged KEPT findings, the proofs, and whether a blocking gate (or a
blocking waiver finding) failed the run.

## Parameters

### gates

readonly [`Gate`](../interfaces/Gate.md)[]

### context

[`GateContext`](../interfaces/GateContext.md)

### opts?

[`RunGatesOptions`](../interfaces/RunGatesOptions.md) = `{}`

## Returns

[`GauntletResult`](../interfaces/GauntletResult.md)

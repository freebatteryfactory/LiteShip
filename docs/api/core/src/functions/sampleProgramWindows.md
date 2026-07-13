[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / sampleProgramWindows

# Function: sampleProgramWindows()

> **sampleProgramWindows**(`windows`, `t`): readonly [`ProgramSample`](../interfaces/ProgramSample.md)[]

Defined in: [core/src/transition-program.ts:631](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L631)

The per-window runtime sub-sampler — the READER of `RuntimeWritePlan.windows`
(Law 16). At global `t`, each window is sampled at its LOCAL eased progress,
interpolated `from`→`to`, last-window-wins. Delegates to the shared
`walkWindows` kernel so a multi-step chain and the CSS `@keyframes` are one
code path. Prefer `sampleProgram`, which also handles a flat single-tween plan.

## Parameters

### windows

readonly [`RuntimeWriteWindow`](../interfaces/RuntimeWriteWindow.md)[]

### t

`number`

## Returns

readonly [`ProgramSample`](../interfaces/ProgramSample.md)[]

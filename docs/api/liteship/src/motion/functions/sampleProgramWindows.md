[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/motion](../README.md) / sampleProgramWindows

# Function: sampleProgramWindows()

> **sampleProgramWindows**(`windows`, `t`): readonly [`ProgramSample`](../interfaces/ProgramSample.md)[]

Defined in: core/dist/motion/transition-program.d.ts:142

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

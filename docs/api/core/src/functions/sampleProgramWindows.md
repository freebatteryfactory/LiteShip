[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / sampleProgramWindows

# Function: sampleProgramWindows()

> **sampleProgramWindows**(`windows`, `t`): readonly `object`[]

Defined in: [core/src/transition-program.ts:483](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L483)

The per-window runtime sub-sampler — the READER of `RuntimeWritePlan.windows`
(Law 16). At global `t`, each window is sampled at its LOCAL eased progress
(`clamp01((t - windowStart) / (windowEnd - windowStart))`), interpolated `from`→`to`;
later windows overwrite earlier ones per `cssVar`, so a `seq` seam is a defined
settled state and a completed program (`t=1`) is the terminal pose. Shared by the
`client:motion` floor (`writeContinuousMap`) and its differential tests.

## Parameters

### windows

readonly [`RuntimeWriteWindow`](../interfaces/RuntimeWriteWindow.md)[]

### t

`number`

## Returns

readonly `object`[]

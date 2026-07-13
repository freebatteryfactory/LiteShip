[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / sampleProgramUniforms

# Function: sampleProgramUniforms()

> **sampleProgramUniforms**(`plan`, `t`): [`ProgramUniforms`](../interfaces/ProgramUniforms.md)

Defined in: core/dist/transition-program.d.ts:177

Project a `sampleProgram` sample into the `czap:uniform-update` payload — the ONE
uniform-building path shared by the `client:motion` floor (`writeContinuousMap`, which
adds the DOM writes) and the `@czap/worker` off-thread sampler (which posts it across the
worker boundary). Keeping the formatting here (not forked per host) is Law 4: the leaf a
browser writes and the leaf a worker posts are byte-identical because they format ONE
kernel sample.

## Parameters

### plan

`RuntimeWritePlan`

### t

`number`

## Returns

[`ProgramUniforms`](../interfaces/ProgramUniforms.md)

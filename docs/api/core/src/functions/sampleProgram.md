[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / sampleProgram

# Function: sampleProgram()

> **sampleProgram**(`plan`, `t`): readonly [`ProgramSample`](../interfaces/ProgramSample.md)[]

Defined in: [core/src/transition-program.ts:678](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L678)

`sampleProgram` — THE shared motion kernel every non-CSS target samples (#130, Law 4).

Given a lowered [RuntimeWritePlan](../interfaces/RuntimeWritePlan.md) and a normalized time `t ∈ [0,1]`, returns the
typed leaf value of every animated `cssVar`. It unifies BOTH lowering shapes behind one
reader:
  - a composed [TransitionProgram](../type-aliases/TransitionProgram.md) (`plan.windows` present) → the per-window
    sub-samplers ([sampleProgramWindows](sampleProgramWindows.md));
  - a single-step plan (`interpretTransition`, no windows) → one implicit window `[0,1]`
    carrying `plan.easing` over `plan.properties`.

The browser runtime floor (`writeContinuousMap`), the scene / stage / remotion frame
samplers, and the worker off-thread sampler ALL call this one function; the declarative
CSS `@keyframes` are generated from the SAME `walkWindows` kernel (see
`buildKeyframes`). The differential oracle (`motion-parity.test.ts`) is the
reader that pins every target to this reference.

## Parameters

### plan

[`RuntimeWritePlan`](../interfaces/RuntimeWritePlan.md)

### t

`number`

## Returns

readonly [`ProgramSample`](../interfaces/ProgramSample.md)[]

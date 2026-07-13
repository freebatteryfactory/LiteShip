[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / interpretProgram

# Function: interpretProgram()

> **interpretProgram**(`graph`, `program`, `env?`): [`LoweredMotionPlan`](../interfaces/LoweredMotionPlan.md)

Defined in: [core/src/transition-program.ts:441](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L441)

Interpret a [TransitionProgram](../type-aliases/TransitionProgram.md) into a [LoweredMotionPlan](../interfaces/LoweredMotionPlan.md) whose
`css.keyframes` are REAL multi-offset stops and whose `runtime.windows` are
per-transition sub-samplers (each carrying its own easing). This is the program
analogue of [interpretTransition](interpretTransition.md) — the single-step reader stays the leaf;
`interpretProgram` walks the composition tree over it.

`env` resolves `choice` branches; the selected `branchId`s ride the diagnostics
as an auditable receipt. Under reduced-motion the composite `runtime.toState` +
the `t=1` window sample settle to the terminal step's `toPose`.

## Parameters

### graph

[`DocumentGraph`](../interfaces/DocumentGraph.md)

### program

[`TransitionProgram`](../type-aliases/TransitionProgram.md)

### env?

[`ProgramEnv`](../interfaces/ProgramEnv.md) = `...`

## Returns

[`LoweredMotionPlan`](../interfaces/LoweredMotionPlan.md)

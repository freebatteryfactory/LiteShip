[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / lowerTransitionProgram

# Function: lowerTransitionProgram()

> **lowerTransitionProgram**(`graph`, `program`, `env?`): [`LoweredProgramTimeline`](../interfaces/LoweredProgramTimeline.md)

Defined in: [core/src/transition-program.ts:310](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L310)

Lower a [TransitionProgram](../type-aliases/TransitionProgram.md) to a deterministic `[0,1]` timeline of
per-transition windows.

The window MATH is the algebra, pinned as law: `seq` total is `Σ` child
durations (+ delays) with disjoint contiguous windows; `par` total is the `max`
child duration with children sharing `[0,1]`, each scaled to its own duration (a
shorter child ends before `1` and holds); `choice` lays out ONLY the branch
selected by [BranchCondition](../type-aliases/BranchCondition.md) over `env`, recording its `branchId`.
Ordering runs through `Plan.topoSort` for deterministic offsets.

## Parameters

### graph

[`DocumentGraph`](../interfaces/DocumentGraph.md)

### program

[`TransitionProgram`](../type-aliases/TransitionProgram.md)

### env?

[`ProgramEnv`](../interfaces/ProgramEnv.md) = `...`

## Returns

[`LoweredProgramTimeline`](../interfaces/LoweredProgramTimeline.md)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / lowerTransitionProgram

# Function: lowerTransitionProgram()

> **lowerTransitionProgram**(`graph`, `program`, `env?`): [`TransitionTimeline`](../interfaces/TransitionTimeline.md)

Defined in: [core/src/motion/transition-program.ts:312](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/transition-program.ts#L312)

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

[`TransitionTimeline`](../interfaces/TransitionTimeline.md)

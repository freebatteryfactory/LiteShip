[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/motion](../README.md) / interpretTransition

# Function: interpretTransition()

> **interpretTransition**(`graph`, `transitionId`): [`LoweredMotionPlan`](../interfaces/LoweredMotionPlan.md)

Defined in: core/dist/motion/interpret-transition.d.ts:151

Interpret a `TransitionNode` into CSS + runtime motion plans.

Reads `fromPose`, `toPose`, `routing`, and `durationMs`; resolves the boundary
transitively via pose → entity → component; diffs bindings into typed tweens.

## Parameters

### graph

[`DocumentGraph`](../../graph/interfaces/DocumentGraph.md)

### transitionId

[`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

## Returns

[`LoweredMotionPlan`](../interfaces/LoweredMotionPlan.md)

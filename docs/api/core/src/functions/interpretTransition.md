[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / interpretTransition

# Function: interpretTransition()

> **interpretTransition**(`graph`, `transitionId`): [`LoweredMotionPlan`](../interfaces/LoweredMotionPlan.md)

Defined in: [core/src/motion/interpret-transition.ts:261](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L261)

Interpret a [TransitionNode](../interfaces/TransitionNode.md) into CSS + runtime motion plans.

Reads `fromPose`, `toPose`, `routing`, and `durationMs`; resolves the boundary
transitively via pose → entity → component; diffs bindings into typed tweens.

## Parameters

### graph

[`DocumentGraph`](../interfaces/DocumentGraph.md)

### transitionId

`ContentAddress`

## Returns

[`LoweredMotionPlan`](../interfaces/LoweredMotionPlan.md)

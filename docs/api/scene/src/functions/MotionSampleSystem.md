[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / MotionSampleSystem

# Function: MotionSampleSystem()

> **MotionSampleSystem**(`plan`, `frameIndex`, `totalFrames`): `SystemShape`

Defined in: [scene/src/systems/motion.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/systems/motion.ts#L52)

Build a `MotionSampleSystem` keyed to a frame index. It queries entities carrying a
`MotionProgram` marker component and, per tick, samples [sampleSceneMotion](sampleSceneMotion.md) at
the frame's normalized `t`, writing each leaf as a `motion:<cssVar>` component (via the
same `world.setComponent` seam `TransitionSystem` uses for `_blend`). It NEVER reads or
writes `_blend` — the two systems coexist on the same world.

## Parameters

### plan

`RuntimeWritePlan`

### frameIndex

`number`

### totalFrames

`number`

## Returns

`SystemShape`

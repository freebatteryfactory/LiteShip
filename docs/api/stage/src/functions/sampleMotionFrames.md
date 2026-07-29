[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [stage/src](../README.md) / sampleMotionFrames

# Function: sampleMotionFrames()

> **sampleMotionFrames**(`plan`, `totalFrames`): readonly [`MotionFrameSample`](../interfaces/MotionFrameSample.md)[]

Defined in: [stage/src/motion-export.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/motion-export.ts#L60)

Sample the shared motion kernel at every frame index of a `totalFrames`-long export.
Each frame's normalized time is `frame / max(1, totalFrames-1)`, so the endpoints land
exactly on `t=0` and `t=1`. Pure — the differential oracle reads the typed `values` to
prove the stage/remotion video leg equals the `sampleProgram` reference within epsilon.
Refuses a frame count that is negative, fractional, non-finite, or outside the safe-integer domain.

## Parameters

### plan

[`RuntimeWritePlan`](../../../liteship/src/motion/interfaces/RuntimeWritePlan.md)

### totalFrames

`number`

## Returns

readonly [`MotionFrameSample`](../interfaces/MotionFrameSample.md)[]

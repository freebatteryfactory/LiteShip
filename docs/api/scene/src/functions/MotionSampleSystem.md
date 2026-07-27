[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / MotionSampleSystem

# Function: MotionSampleSystem()

> **MotionSampleSystem**(`frameIndex`): `System`

Defined in: [scene/src/systems/motion.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/systems/motion.ts#L45)

Build the typed motion system for a fixed frame or a live frame source.
Runtime registration supplies a function so the same system instance reads
the current frame each tick; focused tests may pass a number directly.

## Parameters

### frameIndex

`FrameSource`

## Returns

`System`

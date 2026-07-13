[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [remotion/src](../README.md) / sampleMotionFrame

# Function: sampleMotionFrame()

> **sampleMotionFrame**(`plan`, `frame`, `durationInFrames`): `ReadonlyMap`\<`string`, `TypedValue`\>

Defined in: [remotion/src/motion.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/remotion/src/motion.ts#L31)

Sample the shared motion kernel at Remotion `frame` of a `durationInFrames`-long
composition, returning the typed `cssVar → TypedValue` leaves. The differential oracle
reads THIS to prove the remotion leg equals the `sampleProgram` reference within epsilon.

## Parameters

### plan

`RuntimeWritePlan`

### frame

`number`

### durationInFrames

`number`

## Returns

`ReadonlyMap`\<`string`, `TypedValue`\>

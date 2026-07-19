[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / sampleSceneMotion

# Function: sampleSceneMotion()

> **sampleSceneMotion**(`plan`, `t`): `ReadonlyMap`\<`string`, `TypedValue`\>

Defined in: [scene/src/systems/motion.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/systems/motion.ts#L41)

Sample the shared motion kernel at normalized time `t`, projected to the scene's
component representation: a `cssVar → TypedValue` map, exactly the leaves a
[MotionSampleSystem](MotionSampleSystem.md) writes. Pure — the differential oracle reads THIS to prove
the scene leg equals the `sampleProgram` reference within epsilon.

## Parameters

### plan

`RuntimeWritePlan`

### t

`number`

## Returns

`ReadonlyMap`\<`string`, `TypedValue`\>

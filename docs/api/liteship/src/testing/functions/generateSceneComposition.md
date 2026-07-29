[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/testing](../README.md) / generateSceneComposition

# Function: generateSceneComposition()

> **generateSceneComposition**(`cap`, `ctx?`): [`HarnessOutput`](../interfaces/HarnessOutput.md)

Defined in: core/dist/harness/scene-composition.d.ts:96

Generate the test + bench file contents for a `sceneComposition` capsule.

Drives the REAL ECS runtime when the driver resolved a `compileScene`-able
scene for this capsule ([HarnessContext.sceneDriver](../interfaces/HarnessContext.md#scenedriver)). The three pure
checks are emitted as real `it(...)` blocks in the unit lane; the budget
check is emitted as a real bench in the bench lane. Checks that cannot apply
to the scene (e.g. no audio track → no audio/video sync) are recorded as
typed `not-applicable` exemptions — never `it.skip`.

## Parameters

### cap

`CapsuleDef`\<`"sceneComposition"`, `unknown`, `unknown`, `unknown`\>

### ctx?

[`HarnessContext`](../interfaces/HarnessContext.md)

## Returns

[`HarnessOutput`](../interfaces/HarnessOutput.md)

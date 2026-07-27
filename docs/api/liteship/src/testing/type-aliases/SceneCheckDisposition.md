[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/testing](../README.md) / SceneCheckDisposition

# Type Alias: SceneCheckDisposition

> **SceneCheckDisposition** = \{ `lane`: [`HarnessLane`](HarnessLane.md); `status`: `"wired"`; \} \| \{ `lane`: [`HarnessLane`](HarnessLane.md); `reason`: `string`; `status`: `"not-applicable"`; \}

Defined in: core/dist/harness/scene-composition.d.ts:54

Resolution of one declared sceneComposition check against a concrete scene.
Either the check is WIRED real into its lane, or it is an explicit
`not-applicable` EXEMPTION carrying the reason it cannot apply to this scene.
There is no skip variant by construction — a skip is exactly the thing the
harness LAW forbids.

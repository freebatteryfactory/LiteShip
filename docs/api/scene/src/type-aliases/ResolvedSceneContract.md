[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / ResolvedSceneContract

# Type Alias: ResolvedSceneContract

> **ResolvedSceneContract** = [`SceneContract`](../interfaces/SceneContract.md)\<`number`\>

Defined in: [scene/src/contract.ts:153](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L153)

A scene contract whose timeline marks have all been resolved to
numeric frame indices — what `compileScene` hands to every declared
[SceneInvariant](../interfaces/SceneInvariant.md) (and what `componentsFromTrack` reads when
emitting `FrameRange` components).

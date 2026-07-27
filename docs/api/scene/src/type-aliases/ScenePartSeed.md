[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / ScenePartSeed

# Type Alias: ScenePartSeed

> **ScenePartSeed** = `{ readonly [K in SceneSeedPartName]: { part: K; value: PartValue<typeof SceneParts[K]> } }`\[[`SceneSeedPartName`](SceneSeedPartName.md)\]

Defined in: [scene/src/parts.ts:222](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/parts.ts#L222)

Pure compile-time component seed; admission belongs to SceneRuntime.

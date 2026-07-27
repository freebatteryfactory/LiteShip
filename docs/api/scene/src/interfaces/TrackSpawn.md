[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / TrackSpawn

# Interface: TrackSpawn

Defined in: [scene/src/compile.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/compile.ts#L60)

One compiled track — the components the runtime should spawn for it.
The `trackId` is preserved from the contract so downstream code can
cross-reference (e.g. transition `between` refs).

## Properties

### components

> `readonly` **components**: readonly [`ScenePartSeed`](../type-aliases/ScenePartSeed.md)[]

Defined in: [scene/src/compile.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/compile.ts#L64)

Component seed map passed to `world.spawn(...)` when [SceneRuntime](../namespaces/SceneRuntime/README.md) builds the ECS world.

***

### trackId

> `readonly` **trackId**: [`TrackId`](../type-aliases/TrackId.md)\<[`TrackKind`](../../../spine/type-aliases/TrackKind.md)\>

Defined in: [scene/src/compile.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/compile.ts#L62)

The phantom-kinded id of the source track.

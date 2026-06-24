[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / TrackSpawn

# Interface: TrackSpawn

Defined in: [scene/src/compile.ts:40](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/compile.ts#L40)

One compiled track — the components the runtime should spawn for it.
The `trackId` is preserved from the contract so downstream code can
cross-reference (e.g. transition `between` refs).

## Properties

### components

> `readonly` **components**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

Defined in: [scene/src/compile.ts:44](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/compile.ts#L44)

Component seed map passed to `world.spawn(...)` when [SceneRuntime](../namespaces/SceneRuntime/README.md) builds the ECS world.

***

### trackId

> `readonly` **trackId**: [`TrackId`](../type-aliases/TrackId.md)\<`TrackKind`\>

Defined in: [scene/src/compile.ts:42](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/compile.ts#L42)

The phantom-kinded id of the source track.

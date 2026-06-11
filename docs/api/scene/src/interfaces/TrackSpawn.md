[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / TrackSpawn

# Interface: TrackSpawn

Defined in: [scene/src/compile.ts:28](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/compile.ts#L28)

One compiled track — the components the runtime should spawn for it.
The `trackId` is preserved from the contract so downstream code can
cross-reference (e.g. transition `between` refs).

## Properties

### components

> `readonly` **components**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

Defined in: [scene/src/compile.ts:32](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/compile.ts#L32)

Component seed map passed to `world.spawn(...)` when [SceneRuntime](../namespaces/SceneRuntime/README.md) builds the ECS world.

***

### trackId

> `readonly` **trackId**: [`TrackId`](../type-aliases/TrackId.md)\<`TrackKind`\>

Defined in: [scene/src/compile.ts:30](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/compile.ts#L30)

The phantom-kinded id of the source track.

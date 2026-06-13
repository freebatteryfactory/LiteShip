[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SceneRuntimeHandle

# Interface: SceneRuntimeHandle

Defined in: [scene/src/runtime.ts:113](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L113)

Live runtime handle returned by [SceneRuntime.build](../variables/SceneRuntime.md#build).

## Properties

### currentFrame

> `readonly` **currentFrame**: () => `number`

Defined in: [scene/src/runtime.ts:123](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L123)

Current frame index derived from `currentTimeMs * fps / 1000`.

#### Returns

`number`

***

### currentTimeMs

> `readonly` **currentTimeMs**: () => `number`

Defined in: [scene/src/runtime.ts:121](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L121)

Current scene time in milliseconds (advanced by [tick](#tick)).

#### Returns

`number`

***

### entitySpawnCount

> `readonly` **entitySpawnCount**: `number`

Defined in: [scene/src/runtime.ts:119](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L119)

Number of entities spawned at build time (one per scene track).

***

### receipts

> `readonly` **receipts**: readonly [`MixReceipt`](MixReceipt.md)[]

Defined in: [scene/src/runtime.ts:125](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L125)

Mix receipts collected via the configured sink. Empty when a custom sink was supplied.

***

### release

> `readonly` **release**: () => `Promise`\<`void`\>

Defined in: [scene/src/runtime.ts:132](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L132)

Release the world's scope. Idempotent.

#### Returns

`Promise`\<`void`\>

***

### systemsRegistered

> `readonly` **systemsRegistered**: `number`

Defined in: [scene/src/runtime.ts:117](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L117)

Number of systems registered (always [CANONICAL\_SYSTEM\_COUNT](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts)).

***

### tick

> `readonly` **tick**: (`dtMs`) => `Promise`\<`void`\>

Defined in: [scene/src/runtime.ts:130](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L130)

Advance the simulation by `dtMs` milliseconds, then run every
registered system once over the world.

#### Parameters

##### dtMs

`number`

#### Returns

`Promise`\<`void`\>

***

### world

> `readonly` **world**: `WorldShape`

Defined in: [scene/src/runtime.ts:115](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L115)

The underlying ECS world — exposed for query-based assertions.

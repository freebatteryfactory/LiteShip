[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SceneRuntimeHandle

# Interface: SceneRuntimeHandle

Defined in: [scene/src/runtime.ts:124](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L124)

Live runtime handle returned by [SceneRuntime.build](../variables/SceneRuntime.md#build).

## Properties

### currentFrame

> `readonly` **currentFrame**: () => `number`

Defined in: [scene/src/runtime.ts:134](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L134)

Current frame index derived from `currentTimeMs * fps / 1000`.

#### Returns

`number`

***

### currentTimeMs

> `readonly` **currentTimeMs**: () => `number`

Defined in: [scene/src/runtime.ts:132](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L132)

Current scene time in milliseconds (advanced by [tick](#tick)).

#### Returns

`number`

***

### entitySpawnCount

> `readonly` **entitySpawnCount**: `number`

Defined in: [scene/src/runtime.ts:130](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L130)

Number of entities spawned at build time (one per scene track).

***

### receipts

> `readonly` **receipts**: readonly [`MixReceipt`](MixReceipt.md)[]

Defined in: [scene/src/runtime.ts:136](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L136)

Mix receipts collected via the configured sink. Empty when a custom sink was supplied.

***

### release

> `readonly` **release**: () => `Promise`\<`void`\>

Defined in: [scene/src/runtime.ts:151](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L151)

Release the world's scope. Idempotent.

#### Returns

`Promise`\<`void`\>

***

### svgAttrs

> `readonly` **svgAttrs**: () => [`SvgAttrsFrame`](../type-aliases/SvgAttrsFrame.md)

Defined in: [scene/src/runtime.ts:144](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L144)

The SVG-egress frame collected on the most recent [tick](#tick) — an
entity-keyed snapshot of the `_svgAttrs` SVGSystem composed. Empty
before the first tick. Always populated regardless of whether a
`svgSink` was supplied, so a consumer can pull the SVG cast post-tick
without wiring a callback.

#### Returns

[`SvgAttrsFrame`](../type-aliases/SvgAttrsFrame.md)

***

### systemsRegistered

> `readonly` **systemsRegistered**: `number`

Defined in: [scene/src/runtime.ts:128](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L128)

Number of systems registered (always [CANONICAL\_SYSTEM\_COUNT](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts)).

***

### tick

> `readonly` **tick**: (`dtMs`) => `Promise`\<`void`\>

Defined in: [scene/src/runtime.ts:149](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L149)

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

Defined in: [scene/src/runtime.ts:126](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L126)

The underlying ECS world — exposed for query-based assertions.

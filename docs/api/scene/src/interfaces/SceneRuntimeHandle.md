[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SceneRuntimeHandle

# Interface: SceneRuntimeHandle

Defined in: [scene/src/runtime.ts:125](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L125)

Live runtime handle returned by [SceneRuntime.build](../variables/SceneRuntime.md#build).

## Properties

### currentFrame

> `readonly` **currentFrame**: () => `number`

Defined in: [scene/src/runtime.ts:135](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L135)

Current frame index derived from `currentTimeMs * fps / 1000`.

#### Returns

`number`

***

### currentTimeMs

> `readonly` **currentTimeMs**: () => `number`

Defined in: [scene/src/runtime.ts:133](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L133)

Current scene time in milliseconds (advanced by [tick](#tick)).

#### Returns

`number`

***

### entitySpawnCount

> `readonly` **entitySpawnCount**: `number`

Defined in: [scene/src/runtime.ts:131](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L131)

Number of entities spawned at build time (one per scene track).

***

### receipts

> `readonly` **receipts**: readonly [`MixReceipt`](MixReceipt.md)[]

Defined in: [scene/src/runtime.ts:137](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L137)

Mix receipts collected via the configured sink. Empty when a custom sink was supplied.

***

### release

> `readonly` **release**: () => `Promise`\<`void`\>

Defined in: [scene/src/runtime.ts:152](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L152)

Release the world's scope. Idempotent.

#### Returns

`Promise`\<`void`\>

***

### svgAttrs

> `readonly` **svgAttrs**: () => [`SvgAttrsFrame`](../type-aliases/SvgAttrsFrame.md)

Defined in: [scene/src/runtime.ts:145](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L145)

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

Defined in: [scene/src/runtime.ts:129](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L129)

Number of systems registered (always [CANONICAL\_SYSTEM\_COUNT](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts)).

***

### tick

> `readonly` **tick**: (`dtMs`) => `Promise`\<`void`\>

Defined in: [scene/src/runtime.ts:150](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L150)

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

Defined in: [scene/src/runtime.ts:127](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L127)

The underlying ECS world — exposed for query-based assertions.

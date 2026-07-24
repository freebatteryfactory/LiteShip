[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SceneRuntimeHandle

# Interface: SceneRuntimeHandle

Defined in: [scene/src/runtime.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L124)

Live runtime handle returned by [SceneRuntime.build](../variables/SceneRuntime.md#build).

## Properties

### currentFrame

> `readonly` **currentFrame**: () => `number`

Defined in: [scene/src/runtime.ts:141](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L141)

Current frame index derived from `currentTimeMs * fps / 1000`.

#### Returns

`number`

***

### currentTimeMs

> `readonly` **currentTimeMs**: () => `number`

Defined in: [scene/src/runtime.ts:139](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L139)

Current scene time in milliseconds (advanced by [tick](#tick)).

#### Returns

`number`

***

### entitySpawnCount

> `readonly` **entitySpawnCount**: `number`

Defined in: [scene/src/runtime.ts:137](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L137)

Number of entities spawned at build time (one per scene track).

***

### query

> `readonly` **query**: (...`componentNames`) => `Promise`\<readonly `EntityShape`[]\>

Defined in: [scene/src/runtime.ts:133](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L133)

Query entities carrying ALL named components, resolved through a Promise.
Wraps the now-synchronous [WorldNS.query](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts) so the astro scene
bridge can `await` the result without importing Effect (gate 24's
Promise-facade decision) — the same entity shape `world.query` returns.

#### Parameters

##### componentNames

...`string`[]

#### Returns

`Promise`\<readonly `EntityShape`[]\>

***

### receipts

> `readonly` **receipts**: readonly [`MixReceipt`](MixReceipt.md)[]

Defined in: [scene/src/runtime.ts:143](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L143)

Mix receipts collected via the configured sink. Empty when a custom sink was supplied.

***

### release

> `readonly` **release**: () => `Promise`\<`void`\>

Defined in: [scene/src/runtime.ts:158](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L158)

Dispose the world's Lifetime. Idempotent.

#### Returns

`Promise`\<`void`\>

***

### svgAttrs

> `readonly` **svgAttrs**: () => [`SvgAttrsFrame`](../type-aliases/SvgAttrsFrame.md)

Defined in: [scene/src/runtime.ts:151](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L151)

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

Defined in: [scene/src/runtime.ts:135](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L135)

Number of systems registered (always [CANONICAL\_SYSTEM\_COUNT](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts)).

***

### tick

> `readonly` **tick**: (`dtMs`) => `Promise`\<`void`\>

Defined in: [scene/src/runtime.ts:156](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L156)

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

Defined in: [scene/src/runtime.ts:126](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L126)

The underlying ECS world — exposed for query-based assertions.

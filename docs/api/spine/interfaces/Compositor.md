[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Compositor

# Interface: Compositor

Defined in: [\_spine/core.d.ts:451](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L451)

Live compositor that evaluates and blends registered states.

## Properties

### changes

> `readonly` **changes**: `Pick`\<[`Replay`](../namespaces/CellKernel/interfaces/Replay.md)\<[`CompositeState`](CompositeState.md)\>, `"subscribe"` \| `"read"` \| `"closed"` \| `"size"`\>

Defined in: [\_spine/core.d.ts:461](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L461)

Replay-1 subscription surface of the compositor's extracted [CellKernel](../namespaces/CellKernel/README.md):
`subscribe` replays the current live state on attach and returns a disposer;
`read` returns the current state. `publish`/`close` are intentionally excluded —
the compositor is the sole writer and its [Lifetime](Lifetime.md) closes the kernel.

## Methods

### add()

> **add**\<`B`\>(`name`, `quantizer`): `void`

Defined in: [\_spine/core.d.ts:452](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L452)

#### Type Parameters

##### B

`B` *extends* [`Boundary`](Boundary.md)\<`string`, readonly \[`string`, `string`\]\>

#### Parameters

##### name

`string`

##### quantizer

[`Quantizer`](Quantizer.md)\<`B`\>

#### Returns

`void`

***

### compute()

> **compute**(): [`CompositeState`](CompositeState.md)

Defined in: [\_spine/core.d.ts:454](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L454)

#### Returns

[`CompositeState`](CompositeState.md)

***

### remove()

> **remove**(`name`): `void`

Defined in: [\_spine/core.d.ts:453](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L453)

#### Parameters

##### name

`string`

#### Returns

`void`

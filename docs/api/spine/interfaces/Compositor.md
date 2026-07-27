[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Compositor

# Interface: Compositor

Defined in: [\_spine/core.d.ts:474](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L474)

Live compositor that evaluates and blends registered states.

## Properties

### changes

> `readonly` **changes**: `Pick`\<[`Replay`](../namespaces/CellKernel/interfaces/Replay.md)\<[`CompositeState`](CompositeState.md)\>, `"subscribe"` \| `"read"` \| `"closed"` \| `"size"`\>

Defined in: [\_spine/core.d.ts:487](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L487)

Replay-1 subscription surface of the compositor's extracted [CellKernel](../namespaces/CellKernel/README.md):
`subscribe` replays the current live state on attach and returns a disposer;
`read` returns the current state. `publish`/`close` are intentionally excluded —
the compositor is the sole writer and its [Lifetime](Lifetime.md) closes the kernel.

***

### runtime

> `readonly` **runtime**: [`RuntimeCoordinator`](RuntimeCoordinator.md)

Defined in: [\_spine/core.d.ts:488](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L488)

## Methods

### add()

> **add**\<`B`\>(`name`, `quantizer`): `void`

Defined in: [\_spine/core.d.ts:475](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L475)

#### Type Parameters

##### B

`B` *extends* [`Boundary`](Boundary.md)\<`string`, readonly \[`string`, `string`\]\>

#### Parameters

##### name

`string`

##### quantizer

[`CompositorQuantizer`](../type-aliases/CompositorQuantizer.md)\<`B`\>

#### Returns

`void`

***

### compute()

> **compute**(): [`CompositeState`](CompositeState.md)

Defined in: [\_spine/core.d.ts:477](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L477)

#### Returns

[`CompositeState`](CompositeState.md)

***

### evaluateSpeculative()

> **evaluateSpeculative**(`name`, `value`, `velocity?`): `void`

Defined in: [\_spine/core.d.ts:479](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L479)

#### Parameters

##### name

`string`

##### value

`number`

##### velocity?

`number`

#### Returns

`void`

***

### remove()

> **remove**(`name`): `void`

Defined in: [\_spine/core.d.ts:476](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L476)

#### Parameters

##### name

`string`

#### Returns

`void`

***

### scheduleBatch()

> **scheduleBatch**(): `void`

Defined in: [\_spine/core.d.ts:480](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L480)

#### Returns

`void`

***

### setBlendWeights()

> **setBlendWeights**(`name`, `weights`): `void`

Defined in: [\_spine/core.d.ts:478](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L478)

#### Parameters

##### name

`string`

##### weights

`Record`\<`string`, `number`\>

#### Returns

`void`

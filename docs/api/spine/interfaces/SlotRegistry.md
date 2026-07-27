[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / SlotRegistry

# Interface: SlotRegistry

Defined in: [\_spine/web.d.ts:176](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L176)

Live registry that owns DOM slots and observes their lifecycle.

## Methods

### entries()

> **entries**(): `ReadonlyMap`\<[`SlotPath`](../type-aliases/SlotPath.md), [`SlotEntry`](SlotEntry.md)\>

Defined in: [\_spine/web.d.ts:181](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L181)

#### Returns

`ReadonlyMap`\<[`SlotPath`](../type-aliases/SlotPath.md), [`SlotEntry`](SlotEntry.md)\>

***

### findByPrefix()

> **findByPrefix**(`prefix`): readonly [`SlotEntry`](SlotEntry.md)[]

Defined in: [\_spine/web.d.ts:182](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L182)

#### Parameters

##### prefix

[`SlotPath`](../type-aliases/SlotPath.md)

#### Returns

readonly [`SlotEntry`](SlotEntry.md)[]

***

### get()

> **get**(`path`): [`SlotEntry`](SlotEntry.md) \| `undefined`

Defined in: [\_spine/web.d.ts:177](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L177)

#### Parameters

##### path

[`SlotPath`](../type-aliases/SlotPath.md)

#### Returns

[`SlotEntry`](SlotEntry.md) \| `undefined`

***

### has()

> **has**(`path`): `boolean`

Defined in: [\_spine/web.d.ts:180](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L180)

#### Parameters

##### path

[`SlotPath`](../type-aliases/SlotPath.md)

#### Returns

`boolean`

***

### register()

> **register**(`entry`): `void`

Defined in: [\_spine/web.d.ts:178](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L178)

#### Parameters

##### entry

[`SlotEntryInput`](SlotEntryInput.md)

#### Returns

`void`

***

### unregister()

> **unregister**(`path`): `void`

Defined in: [\_spine/web.d.ts:179](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L179)

#### Parameters

##### path

[`SlotPath`](../type-aliases/SlotPath.md)

#### Returns

`void`

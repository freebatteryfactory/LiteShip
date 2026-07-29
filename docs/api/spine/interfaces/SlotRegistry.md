[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / SlotRegistry

# Interface: SlotRegistry

Defined in: [\_spine/web.d.ts:188](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L188)

Live registry that owns DOM slots and observes their lifecycle.

## Methods

### entries()

> **entries**(): `ReadonlyMap`\<[`SlotPath`](../type-aliases/SlotPath.md), [`SlotEntry`](SlotEntry.md)\>

Defined in: [\_spine/web.d.ts:193](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L193)

#### Returns

`ReadonlyMap`\<[`SlotPath`](../type-aliases/SlotPath.md), [`SlotEntry`](SlotEntry.md)\>

***

### findByPrefix()

> **findByPrefix**(`prefix`): readonly [`SlotEntry`](SlotEntry.md)[]

Defined in: [\_spine/web.d.ts:194](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L194)

#### Parameters

##### prefix

[`SlotPath`](../type-aliases/SlotPath.md)

#### Returns

readonly [`SlotEntry`](SlotEntry.md)[]

***

### get()

> **get**(`path`): [`SlotEntry`](SlotEntry.md) \| `undefined`

Defined in: [\_spine/web.d.ts:189](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L189)

#### Parameters

##### path

[`SlotPath`](../type-aliases/SlotPath.md)

#### Returns

[`SlotEntry`](SlotEntry.md) \| `undefined`

***

### has()

> **has**(`path`): `boolean`

Defined in: [\_spine/web.d.ts:192](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L192)

#### Parameters

##### path

[`SlotPath`](../type-aliases/SlotPath.md)

#### Returns

`boolean`

***

### register()

> **register**(`entry`): `void`

Defined in: [\_spine/web.d.ts:190](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L190)

#### Parameters

##### entry

[`SlotEntryInput`](SlotEntryInput.md)

#### Returns

`void`

***

### unregister()

> **unregister**(`path`): `void`

Defined in: [\_spine/web.d.ts:191](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L191)

#### Parameters

##### path

[`SlotPath`](../type-aliases/SlotPath.md)

#### Returns

`void`

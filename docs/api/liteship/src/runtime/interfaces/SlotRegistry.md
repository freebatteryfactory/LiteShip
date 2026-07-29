[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / SlotRegistry

# Interface: SlotRegistry

Defined in: web/dist/slot/registry.d.ts:11

Slot registry interface -- manages mapping between slot paths and DOM elements.

## Methods

### entries()

> **entries**(): `ReadonlyMap`\<[`SlotPath`](../type-aliases/SlotPath.md), [`SlotEntry`](SlotEntry.md)\>

Defined in: web/dist/slot/registry.d.ts:16

#### Returns

`ReadonlyMap`\<[`SlotPath`](../type-aliases/SlotPath.md), [`SlotEntry`](SlotEntry.md)\>

***

### findByPrefix()

> **findByPrefix**(`prefix`): readonly [`SlotEntry`](SlotEntry.md)[]

Defined in: web/dist/slot/registry.d.ts:17

#### Parameters

##### prefix

[`SlotPath`](../type-aliases/SlotPath.md)

#### Returns

readonly [`SlotEntry`](SlotEntry.md)[]

***

### get()

> **get**(`path`): [`SlotEntry`](SlotEntry.md) \| `undefined`

Defined in: web/dist/slot/registry.d.ts:12

#### Parameters

##### path

[`SlotPath`](../type-aliases/SlotPath.md)

#### Returns

[`SlotEntry`](SlotEntry.md) \| `undefined`

***

### has()

> **has**(`path`): `boolean`

Defined in: web/dist/slot/registry.d.ts:15

#### Parameters

##### path

[`SlotPath`](../type-aliases/SlotPath.md)

#### Returns

`boolean`

***

### register()

> **register**(`entry`): `void`

Defined in: web/dist/slot/registry.d.ts:13

#### Parameters

##### entry

[`SlotEntryInput`](SlotEntryInput.md)

#### Returns

`void`

***

### unregister()

> **unregister**(`path`): `void`

Defined in: web/dist/slot/registry.d.ts:14

#### Parameters

##### path

[`SlotPath`](../type-aliases/SlotPath.md)

#### Returns

`void`

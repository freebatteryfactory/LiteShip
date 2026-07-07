[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / SlotRegistryShape

# Interface: SlotRegistryShape

Defined in: [web/src/slot/registry.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/slot/registry.ts#L35)

Slot registry interface -- manages mapping between slot paths and DOM elements.

## Methods

### entries()

> **entries**(): `ReadonlyMap`\<[`SlotPath`](../type-aliases/SlotPath.md), [`SlotEntry`](SlotEntry.md)\>

Defined in: [web/src/slot/registry.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/slot/registry.ts#L40)

#### Returns

`ReadonlyMap`\<[`SlotPath`](../type-aliases/SlotPath.md), [`SlotEntry`](SlotEntry.md)\>

***

### findByPrefix()

> **findByPrefix**(`prefix`): readonly [`SlotEntry`](SlotEntry.md)[]

Defined in: [web/src/slot/registry.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/slot/registry.ts#L41)

#### Parameters

##### prefix

[`SlotPath`](../type-aliases/SlotPath.md)

#### Returns

readonly [`SlotEntry`](SlotEntry.md)[]

***

### get()

> **get**(`path`): [`SlotEntry`](SlotEntry.md) \| `undefined`

Defined in: [web/src/slot/registry.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/slot/registry.ts#L36)

#### Parameters

##### path

[`SlotPath`](../type-aliases/SlotPath.md)

#### Returns

[`SlotEntry`](SlotEntry.md) \| `undefined`

***

### has()

> **has**(`path`): `boolean`

Defined in: [web/src/slot/registry.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/slot/registry.ts#L39)

#### Parameters

##### path

[`SlotPath`](../type-aliases/SlotPath.md)

#### Returns

`boolean`

***

### register()

> **register**(`entry`): `void`

Defined in: [web/src/slot/registry.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/slot/registry.ts#L37)

#### Parameters

##### entry

[`SlotEntryInput`](SlotEntryInput.md)

#### Returns

`void`

***

### unregister()

> **unregister**(`path`): `void`

Defined in: [web/src/slot/registry.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/slot/registry.ts#L38)

#### Parameters

##### path

[`SlotPath`](../type-aliases/SlotPath.md)

#### Returns

`void`

[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / RuntimeCoordinator

# Interface: RuntimeCoordinator

Defined in: [\_spine/core.d.ts:1074](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1074)

Live coordinator surface shared by the core runtime and worker host.

## Properties

### phases

> `readonly` **phases**: readonly [`RuntimePhase`](../type-aliases/RuntimePhase.md)[]

Defined in: [\_spine/core.d.ts:1076](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1076)

***

### plan

> `readonly` **plan**: [`PlanIR`](PlanIR.md)

Defined in: [\_spine/core.d.ts:1075](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1075)

***

### stores

> `readonly` **stores**: `object`

Defined in: [\_spine/core.d.ts:1077](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1077)

#### dirtyEpoch

> `readonly` **dirtyEpoch**: [`DenseStore`](DenseStore.md)

#### stateIndex

> `readonly` **stateIndex**: [`DenseStore`](DenseStore.md)

## Methods

### applyState()

> **applyState**(`name`, `state`): `number`

Defined in: [\_spine/core.d.ts:1086](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1086)

#### Parameters

##### name

`string`

##### state

`string`

#### Returns

`number`

***

### getDirtyEpoch()

> **getDirtyEpoch**(`name`): `number`

Defined in: [\_spine/core.d.ts:1089](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1089)

#### Parameters

##### name

`string`

#### Returns

`number`

***

### getStateIndex()

> **getStateIndex**(`name`): `number`

Defined in: [\_spine/core.d.ts:1087](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1087)

#### Parameters

##### name

`string`

#### Returns

`number`

***

### hasQuantizer()

> **hasQuantizer**(`name`): `boolean`

Defined in: [\_spine/core.d.ts:1084](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1084)

#### Parameters

##### name

`string`

#### Returns

`boolean`

***

### markDirty()

> **markDirty**(`name`): `void`

Defined in: [\_spine/core.d.ts:1088](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1088)

#### Parameters

##### name

`string`

#### Returns

`void`

***

### registeredNames()

> **registeredNames**(): readonly `string`[]

Defined in: [\_spine/core.d.ts:1090](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1090)

#### Returns

readonly `string`[]

***

### registerQuantizer()

> **registerQuantizer**(`name`, `states`): [`EntityId`](../type-aliases/EntityId.md)

Defined in: [\_spine/core.d.ts:1082](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1082)

#### Parameters

##### name

`string`

##### states

readonly `string`[]

#### Returns

[`EntityId`](../type-aliases/EntityId.md)

***

### removeQuantizer()

> **removeQuantizer**(`name`): `void`

Defined in: [\_spine/core.d.ts:1083](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1083)

#### Parameters

##### name

`string`

#### Returns

`void`

***

### reset()

> **reset**(`registrations?`): `void`

Defined in: [\_spine/core.d.ts:1081](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1081)

#### Parameters

##### registrations?

readonly `object`[]

#### Returns

`void`

***

### setState()

> **setState**(`name`, `state`): `void`

Defined in: [\_spine/core.d.ts:1085](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1085)

#### Parameters

##### name

`string`

##### state

`string`

#### Returns

`void`

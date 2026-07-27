[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / RuntimeCoordinator

# Interface: RuntimeCoordinator

Defined in: [\_spine/core.d.ts:858](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L858)

Live coordinator surface shared by the core runtime and worker host.

## Properties

### phases

> `readonly` **phases**: readonly [`RuntimePhase`](../type-aliases/RuntimePhase.md)[]

Defined in: [\_spine/core.d.ts:860](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L860)

***

### plan

> `readonly` **plan**: [`PlanIR`](PlanIR.md)

Defined in: [\_spine/core.d.ts:859](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L859)

***

### stores

> `readonly` **stores**: `object`

Defined in: [\_spine/core.d.ts:861](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L861)

#### dirtyEpoch

> `readonly` **dirtyEpoch**: [`RuntimeCoordinatorDenseStore`](RuntimeCoordinatorDenseStore.md)

#### stateIndex

> `readonly` **stateIndex**: [`RuntimeCoordinatorDenseStore`](RuntimeCoordinatorDenseStore.md)

## Methods

### applyState()

> **applyState**(`name`, `state`): `number`

Defined in: [\_spine/core.d.ts:870](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L870)

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

Defined in: [\_spine/core.d.ts:873](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L873)

#### Parameters

##### name

`string`

#### Returns

`number`

***

### getStateIndex()

> **getStateIndex**(`name`): `number`

Defined in: [\_spine/core.d.ts:871](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L871)

#### Parameters

##### name

`string`

#### Returns

`number`

***

### hasQuantizer()

> **hasQuantizer**(`name`): `boolean`

Defined in: [\_spine/core.d.ts:868](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L868)

#### Parameters

##### name

`string`

#### Returns

`boolean`

***

### markDirty()

> **markDirty**(`name`): `void`

Defined in: [\_spine/core.d.ts:872](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L872)

#### Parameters

##### name

`string`

#### Returns

`void`

***

### registeredNames()

> **registeredNames**(): readonly `string`[]

Defined in: [\_spine/core.d.ts:874](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L874)

#### Returns

readonly `string`[]

***

### registerQuantizer()

> **registerQuantizer**(`name`, `states`): [`EntityId`](../type-aliases/EntityId.md)

Defined in: [\_spine/core.d.ts:866](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L866)

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

Defined in: [\_spine/core.d.ts:867](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L867)

#### Parameters

##### name

`string`

#### Returns

`void`

***

### reset()

> **reset**(`registrations?`): `void`

Defined in: [\_spine/core.d.ts:865](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L865)

#### Parameters

##### registrations?

readonly `object`[]

#### Returns

`void`

***

### setState()

> **setState**(`name`, `state`): `void`

Defined in: [\_spine/core.d.ts:869](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L869)

#### Parameters

##### name

`string`

##### state

`string`

#### Returns

`void`

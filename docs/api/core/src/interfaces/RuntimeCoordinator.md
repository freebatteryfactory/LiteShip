[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / RuntimeCoordinator

# Interface: RuntimeCoordinator

Defined in: [core/src/reactive/runtime-coordinator.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/runtime-coordinator.ts#L37)

Live coordinator surface: the immutable runtime `Plan`, ordered phase
list, dense stores for state index + dirty epoch, and registration/mutation
APIs used by the compositor on the hot path.

## Properties

### phases

> `readonly` **phases**: readonly [`RuntimePhase`](../type-aliases/RuntimePhase.md)[]

Defined in: [core/src/reactive/runtime-coordinator.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/runtime-coordinator.ts#L39)

***

### plan

> `readonly` **plan**: `PlanIR`

Defined in: [core/src/reactive/runtime-coordinator.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/runtime-coordinator.ts#L38)

***

### stores

> `readonly` **stores**: `object`

Defined in: [core/src/reactive/runtime-coordinator.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/runtime-coordinator.ts#L40)

#### dirtyEpoch

> `readonly` **dirtyEpoch**: `DenseStore`

#### stateIndex

> `readonly` **stateIndex**: `DenseStore`

## Methods

### applyState()

> **applyState**(`name`, `state`): `number`

Defined in: [core/src/reactive/runtime-coordinator.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/runtime-coordinator.ts#L54)

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

Defined in: [core/src/reactive/runtime-coordinator.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/runtime-coordinator.ts#L57)

#### Parameters

##### name

`string`

#### Returns

`number`

***

### getStateIndex()

> **getStateIndex**(`name`): `number`

Defined in: [core/src/reactive/runtime-coordinator.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/runtime-coordinator.ts#L55)

#### Parameters

##### name

`string`

#### Returns

`number`

***

### hasQuantizer()

> **hasQuantizer**(`name`): `boolean`

Defined in: [core/src/reactive/runtime-coordinator.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/runtime-coordinator.ts#L52)

#### Parameters

##### name

`string`

#### Returns

`boolean`

***

### markDirty()

> **markDirty**(`name`): `void`

Defined in: [core/src/reactive/runtime-coordinator.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/runtime-coordinator.ts#L56)

#### Parameters

##### name

`string`

#### Returns

`void`

***

### registeredNames()

> **registeredNames**(): readonly `string`[]

Defined in: [core/src/reactive/runtime-coordinator.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/runtime-coordinator.ts#L58)

#### Returns

readonly `string`[]

***

### registerQuantizer()

> **registerQuantizer**(`name`, `states`): `EntityId`

Defined in: [core/src/reactive/runtime-coordinator.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/runtime-coordinator.ts#L50)

#### Parameters

##### name

`string`

##### states

readonly `string`[]

#### Returns

`EntityId`

***

### removeQuantizer()

> **removeQuantizer**(`name`): `void`

Defined in: [core/src/reactive/runtime-coordinator.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/runtime-coordinator.ts#L51)

#### Parameters

##### name

`string`

#### Returns

`void`

***

### reset()

> **reset**(`registrations?`): `void`

Defined in: [core/src/reactive/runtime-coordinator.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/runtime-coordinator.ts#L44)

#### Parameters

##### registrations?

readonly `object`[]

#### Returns

`void`

***

### setState()

> **setState**(`name`, `state`): `void`

Defined in: [core/src/reactive/runtime-coordinator.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/runtime-coordinator.ts#L53)

#### Parameters

##### name

`string`

##### state

`string`

#### Returns

`void`

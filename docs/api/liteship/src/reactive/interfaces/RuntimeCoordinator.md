[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / RuntimeCoordinator

# Interface: RuntimeCoordinator

Defined in: core/dist/reactive/runtime-coordinator.d.ts:32

Live coordinator surface: the immutable runtime `Plan`, ordered phase
list, dense stores for state index + dirty epoch, and registration/mutation
APIs used by the compositor on the hot path.

## Properties

### phases

> `readonly` **phases**: readonly [`RuntimePhase`](../type-aliases/RuntimePhase.md)[]

Defined in: core/dist/reactive/runtime-coordinator.d.ts:34

***

### plan

> `readonly` **plan**: `PlanIR`

Defined in: core/dist/reactive/runtime-coordinator.d.ts:33

***

### stores

> `readonly` **stores**: `object`

Defined in: core/dist/reactive/runtime-coordinator.d.ts:35

#### dirtyEpoch

> `readonly` **dirtyEpoch**: `DenseStore`

#### stateIndex

> `readonly` **stateIndex**: `DenseStore`

## Methods

### applyState()

> **applyState**(`name`, `state`): `number`

Defined in: core/dist/reactive/runtime-coordinator.d.ts:47

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

Defined in: core/dist/reactive/runtime-coordinator.d.ts:50

#### Parameters

##### name

`string`

#### Returns

`number`

***

### getStateIndex()

> **getStateIndex**(`name`): `number`

Defined in: core/dist/reactive/runtime-coordinator.d.ts:48

#### Parameters

##### name

`string`

#### Returns

`number`

***

### hasQuantizer()

> **hasQuantizer**(`name`): `boolean`

Defined in: core/dist/reactive/runtime-coordinator.d.ts:45

#### Parameters

##### name

`string`

#### Returns

`boolean`

***

### markDirty()

> **markDirty**(`name`): `void`

Defined in: core/dist/reactive/runtime-coordinator.d.ts:49

#### Parameters

##### name

`string`

#### Returns

`void`

***

### registeredNames()

> **registeredNames**(): readonly `string`[]

Defined in: core/dist/reactive/runtime-coordinator.d.ts:51

#### Returns

readonly `string`[]

***

### registerQuantizer()

> **registerQuantizer**(`name`, `states`): `EntityId`

Defined in: core/dist/reactive/runtime-coordinator.d.ts:43

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

Defined in: core/dist/reactive/runtime-coordinator.d.ts:44

#### Parameters

##### name

`string`

#### Returns

`void`

***

### reset()

> **reset**(`registrations?`): `void`

Defined in: core/dist/reactive/runtime-coordinator.d.ts:39

#### Parameters

##### registrations?

readonly `object`[]

#### Returns

`void`

***

### setState()

> **setState**(`name`, `state`): `void`

Defined in: core/dist/reactive/runtime-coordinator.d.ts:46

#### Parameters

##### name

`string`

##### state

`string`

#### Returns

`void`

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / StateCellStoreShape

# Interface: StateCellStoreShape

Defined in: [core/src/reactive/state-cell.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L91)

Live store — coarse authority registry over a [RuntimeCoordinator](../variables/RuntimeCoordinator.md).

## Properties

### runtime

> `readonly` **runtime**: `RuntimeCoordinatorShape`

Defined in: [core/src/reactive/state-cell.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L92)

## Methods

### applyDiscrete()

> **applyDiscrete**(`name`, `state`, `authority?`): [`StateCell`](StateCell.md)

Defined in: [core/src/reactive/state-cell.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L95)

#### Parameters

##### name

`string`

##### state

`string`

##### authority?

[`StateAuthority`](../type-aliases/StateAuthority.md)

#### Returns

[`StateCell`](StateCell.md)

***

### hydrateDiscrete()

> **hydrateDiscrete**(`name`, `state`, `generation`, `authority?`): [`StateCell`](StateCell.md)

Defined in: [core/src/reactive/state-cell.ts:97](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L97)

#### Parameters

##### name

`string`

##### state

`string`

##### generation

`number`

##### authority?

[`StateAuthority`](../type-aliases/StateAuthority.md)

#### Returns

[`StateCell`](StateCell.md)

***

### markDirty()

> **markDirty**(`name`): `void`

Defined in: [core/src/reactive/state-cell.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L98)

#### Parameters

##### name

`string`

#### Returns

`void`

***

### projectionState()

> **projectionState**(`projection`, `options?`): [`ProjectionState`](ProjectionState.md)

Defined in: [core/src/reactive/state-cell.ts:100](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L100)

#### Parameters

##### projection

`string`

##### options?

[`ProjectionStateOptions`](ProjectionStateOptions.md)

#### Returns

[`ProjectionState`](ProjectionState.md)

***

### register()

> **register**(`name`, `states`, `options?`): `void`

Defined in: [core/src/reactive/state-cell.ts:93](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L93)

#### Parameters

##### name

`string`

##### states

readonly `string`[]

##### options?

[`StateCellRegisterOptions`](StateCellRegisterOptions.md)

#### Returns

`void`

***

### reset()

> **reset**(`registrations?`): `void`

Defined in: [core/src/reactive/state-cell.ts:101](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L101)

#### Parameters

##### registrations?

readonly `object`[]

#### Returns

`void`

***

### snapshot()

> **snapshot**(`name`): [`StateCell`](StateCell.md)\<`string`\> \| `undefined`

Defined in: [core/src/reactive/state-cell.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L99)

#### Parameters

##### name

`string`

#### Returns

[`StateCell`](StateCell.md)\<`string`\> \| `undefined`

***

### unregister()

> **unregister**(`name`): `void`

Defined in: [core/src/reactive/state-cell.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L94)

#### Parameters

##### name

`string`

#### Returns

`void`

***

### writeContinuous()

> **writeContinuous**(`name`, `value`): [`StateCell`](StateCell.md)

Defined in: [core/src/reactive/state-cell.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L96)

#### Parameters

##### name

`string`

##### value

`number`

#### Returns

[`StateCell`](StateCell.md)

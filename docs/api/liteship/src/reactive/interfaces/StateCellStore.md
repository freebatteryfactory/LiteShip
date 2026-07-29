[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/reactive](../README.md) / StateCellStore

# Interface: StateCellStore

Defined in: core/dist/reactive/state-cell.d.ts:69

Live store — coarse authority registry over a [RuntimeCoordinator](../variables/RuntimeCoordinator.md).

## Properties

### runtime

> `readonly` **runtime**: [`RuntimeCoordinator`](RuntimeCoordinator.md)

Defined in: core/dist/reactive/state-cell.d.ts:70

## Methods

### applyDiscrete()

> **applyDiscrete**(`name`, `state`, `authority?`): [`StateCell`](StateCell.md)

Defined in: core/dist/reactive/state-cell.d.ts:73

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

Defined in: core/dist/reactive/state-cell.d.ts:75

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

Defined in: core/dist/reactive/state-cell.d.ts:76

#### Parameters

##### name

`string`

#### Returns

`void`

***

### projectionState()

> **projectionState**(`projection`, `options?`): [`ProjectionState`](ProjectionState.md)

Defined in: core/dist/reactive/state-cell.d.ts:78

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

Defined in: core/dist/reactive/state-cell.d.ts:71

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

Defined in: core/dist/reactive/state-cell.d.ts:79

#### Parameters

##### registrations?

readonly `object`[]

#### Returns

`void`

***

### snapshot()

> **snapshot**(`name`): [`StateCell`](StateCell.md)\<`string`\> \| `undefined`

Defined in: core/dist/reactive/state-cell.d.ts:77

#### Parameters

##### name

`string`

#### Returns

[`StateCell`](StateCell.md)\<`string`\> \| `undefined`

***

### unregister()

> **unregister**(`name`): `void`

Defined in: core/dist/reactive/state-cell.d.ts:72

#### Parameters

##### name

`string`

#### Returns

`void`

***

### writeContinuous()

> **writeContinuous**(`name`, `value`): [`StateCell`](StateCell.md)

Defined in: core/dist/reactive/state-cell.d.ts:74

#### Parameters

##### name

`string`

##### value

`number`

#### Returns

[`StateCell`](StateCell.md)

[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / StateCell

# Interface: StateCell\<S\>

Defined in: core/dist/reactive/state-cell.d.ts:21

Immutable snapshot of one named state authority cell.

## Type Parameters

### S

`S` *extends* `string` = `string`

## Properties

### \_tag

> `readonly` **\_tag**: `"StateCell"`

Defined in: core/dist/reactive/state-cell.d.ts:22

***

### authority

> `readonly` **authority**: [`StateAuthority`](../type-aliases/StateAuthority.md)

Defined in: core/dist/reactive/state-cell.d.ts:25

***

### dirtyEpoch

> `readonly` **dirtyEpoch**: `number`

Defined in: core/dist/reactive/state-cell.d.ts:28

***

### generation

> `readonly` **generation**: `number`

Defined in: core/dist/reactive/state-cell.d.ts:30

Monotonic generation — increments on discrete state changes (gap-replay ordering).

***

### kind

> `readonly` **kind**: [`StateCellKind`](../type-aliases/StateCellKind.md)

Defined in: core/dist/reactive/state-cell.d.ts:24

***

### name

> `readonly` **name**: `string`

Defined in: core/dist/reactive/state-cell.d.ts:23

***

### replayable

> `readonly` **replayable**: `boolean`

Defined in: core/dist/reactive/state-cell.d.ts:32

Derived: only discrete cells may enter patch/receipt replay paths (#133).

***

### state

> `readonly` **state**: [`StateName`](../../schema/type-aliases/StateName.md)\<`S`\>

Defined in: core/dist/reactive/state-cell.d.ts:26

***

### stateIndex

> `readonly` **stateIndex**: `number`

Defined in: core/dist/reactive/state-cell.d.ts:27

***

### value?

> `readonly` `optional` **value?**: `number`

Defined in: core/dist/reactive/state-cell.d.ts:34

Continuous-only live scalar when [kind](#kind) is `'continuous'`.

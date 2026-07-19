[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / StateCell

# Interface: StateCell\<S\>

Defined in: [core/src/reactive/state-cell.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L28)

Immutable snapshot of one named state authority cell.

## Type Parameters

### S

`S` *extends* `string` = `string`

## Properties

### \_tag

> `readonly` **\_tag**: `"StateCell"`

Defined in: [core/src/reactive/state-cell.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L29)

***

### authority

> `readonly` **authority**: [`StateAuthority`](../type-aliases/StateAuthority.md)

Defined in: [core/src/reactive/state-cell.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L32)

***

### dirtyEpoch

> `readonly` **dirtyEpoch**: `number`

Defined in: [core/src/reactive/state-cell.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L35)

***

### generation

> `readonly` **generation**: `number`

Defined in: [core/src/reactive/state-cell.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L37)

Monotonic generation — increments on discrete state changes (gap-replay ordering).

***

### kind

> `readonly` **kind**: [`StateCellKind`](../type-aliases/StateCellKind.md)

Defined in: [core/src/reactive/state-cell.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L31)

***

### name

> `readonly` **name**: `string`

Defined in: [core/src/reactive/state-cell.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L30)

***

### replayable

> `readonly` **replayable**: `boolean`

Defined in: [core/src/reactive/state-cell.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L39)

Derived: only discrete cells may enter patch/receipt replay paths (#133).

***

### state

> `readonly` **state**: [`StateName`](../type-aliases/StateName.md)\<`S`\>

Defined in: [core/src/reactive/state-cell.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L33)

***

### stateIndex

> `readonly` **stateIndex**: `number`

Defined in: [core/src/reactive/state-cell.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L34)

***

### value?

> `readonly` `optional` **value?**: `number`

Defined in: [core/src/reactive/state-cell.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/state-cell.ts#L41)

Continuous-only live scalar when [kind](#kind) is `'continuous'`.

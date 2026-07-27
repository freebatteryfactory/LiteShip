[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / CellFanout

# Interface: CellFanout\<T\>

Defined in: core/dist/reactive/cell-kernel.d.ts:133

Live no-replay fan-out kernel: fire-and-forget publish, no current-value slot.

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"CellFanout"`

Defined in: core/dist/reactive/cell-kernel.d.ts:134

***

### closed

> `readonly` **closed**: `boolean`

Defined in: core/dist/reactive/cell-kernel.d.ts:142

True once [close](#close) has run.

***

### size

> `readonly` **size**: `number`

Defined in: core/dist/reactive/cell-kernel.d.ts:144

Current subscriber count.

## Methods

### close()

> **close**(): `void`

Defined in: core/dist/reactive/cell-kernel.d.ts:140

Complete every subscriber exactly once and mark the kernel closed. Idempotent.

#### Returns

`void`

***

### publish()

> **publish**(`value`): `void`

Defined in: core/dist/reactive/cell-kernel.d.ts:136

Fan `value` out to every current subscriber. Late subscribers miss it. Inert after close.

#### Parameters

##### value

`T`

#### Returns

`void`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../type-aliases/Disposer.md)

Defined in: core/dist/reactive/cell-kernel.d.ts:138

Register `subscriber` (no replay). Returns its [Disposer](../type-aliases/Disposer.md).

#### Parameters

##### subscriber

[`CellSubscriber`](../type-aliases/CellSubscriber.md)\<`T`\>

#### Returns

[`Disposer`](../type-aliases/Disposer.md)

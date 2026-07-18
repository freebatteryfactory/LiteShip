[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CellFanoutShape

# Interface: CellFanoutShape\<T\>

Defined in: [core/src/cell-kernel.ts:130](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L130)

Live no-replay fan-out kernel: fire-and-forget publish, no current-value slot.

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"CellFanout"`

Defined in: [core/src/cell-kernel.ts:131](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L131)

***

### closed

> `readonly` **closed**: `boolean`

Defined in: [core/src/cell-kernel.ts:139](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L139)

True once [close](#close) has run.

***

### size

> `readonly` **size**: `number`

Defined in: [core/src/cell-kernel.ts:141](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L141)

Current subscriber count.

## Methods

### close()

> **close**(): `void`

Defined in: [core/src/cell-kernel.ts:137](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L137)

Complete every subscriber exactly once and mark the kernel closed. Idempotent.

#### Returns

`void`

***

### publish()

> **publish**(`value`): `void`

Defined in: [core/src/cell-kernel.ts:133](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L133)

Fan `value` out to every current subscriber. Late subscribers miss it. Inert after close.

#### Parameters

##### value

`T`

#### Returns

`void`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../type-aliases/Disposer.md)

Defined in: [core/src/cell-kernel.ts:135](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L135)

Register `subscriber` (no replay). Returns its [Disposer](../type-aliases/Disposer.md).

#### Parameters

##### subscriber

[`CellSubscriber`](../type-aliases/CellSubscriber.md)\<`T`\>

#### Returns

[`Disposer`](../type-aliases/Disposer.md)

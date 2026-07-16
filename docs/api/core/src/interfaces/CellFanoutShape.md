[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CellFanoutShape

# Interface: CellFanoutShape\<T\>

Defined in: [core/src/cell-kernel.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L85)

Live no-replay fan-out kernel: fire-and-forget publish, no current-value slot.

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"CellFanout"`

Defined in: [core/src/cell-kernel.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L86)

***

### closed

> `readonly` **closed**: `boolean`

Defined in: [core/src/cell-kernel.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L94)

True once [close](#close) has run.

***

### size

> `readonly` **size**: `number`

Defined in: [core/src/cell-kernel.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L96)

Current subscriber count.

## Methods

### close()

> **close**(): `void`

Defined in: [core/src/cell-kernel.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L92)

Complete every subscriber exactly once and mark the kernel closed. Idempotent.

#### Returns

`void`

***

### publish()

> **publish**(`value`): `void`

Defined in: [core/src/cell-kernel.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L88)

Fan `value` out to every current subscriber. Late subscribers miss it. Inert after close.

#### Parameters

##### value

`T`

#### Returns

`void`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../type-aliases/Disposer.md)

Defined in: [core/src/cell-kernel.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L90)

Register `subscriber` (no replay). Returns its [Disposer](../type-aliases/Disposer.md).

#### Parameters

##### subscriber

[`CellSubscriber`](../type-aliases/CellSubscriber.md)\<`T`\>

#### Returns

[`Disposer`](../type-aliases/Disposer.md)

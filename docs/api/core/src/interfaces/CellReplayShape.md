[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CellReplayShape

# Interface: CellReplayShape\<T\>

Defined in: [core/src/cell-kernel.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L68)

Live replay-1 kernel: a current-value slot with synchronous replay-on-subscribe.

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"CellReplay"`

Defined in: [core/src/cell-kernel.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L69)

***

### closed

> `readonly` **closed**: `boolean`

Defined in: [core/src/cell-kernel.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L79)

True once [close](#close) has run.

***

### size

> `readonly` **size**: `number`

Defined in: [core/src/cell-kernel.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L81)

Current subscriber count.

## Methods

### close()

> **close**(): `void`

Defined in: [core/src/cell-kernel.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L77)

Complete every subscriber exactly once and mark the kernel closed. Idempotent.

#### Returns

`void`

***

### publish()

> **publish**(`value`): `void`

Defined in: [core/src/cell-kernel.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L73)

Set the current value and fan it out to every subscriber. Inert after close.

#### Parameters

##### value

`T`

#### Returns

`void`

***

### read()

> **read**(): `T`

Defined in: [core/src/cell-kernel.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L71)

The current value — the initial value until the first publish. Readable after close.

#### Returns

`T`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../type-aliases/Disposer.md)

Defined in: [core/src/cell-kernel.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L75)

Replay the current value to `subscriber`, then register it. Returns its [Disposer](../type-aliases/Disposer.md).

#### Parameters

##### subscriber

[`CellSubscriber`](../type-aliases/CellSubscriber.md)\<`T`\>

#### Returns

[`Disposer`](../type-aliases/Disposer.md)

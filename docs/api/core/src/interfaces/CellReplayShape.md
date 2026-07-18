[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CellReplayShape

# Interface: CellReplayShape\<T\>

Defined in: [core/src/cell-kernel.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L113)

Live replay-1 kernel: a current-value slot with synchronous replay-on-subscribe.

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"CellReplay"`

Defined in: [core/src/cell-kernel.ts:114](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L114)

***

### closed

> `readonly` **closed**: `boolean`

Defined in: [core/src/cell-kernel.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L124)

True once [close](#close) has run.

***

### size

> `readonly` **size**: `number`

Defined in: [core/src/cell-kernel.ts:126](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L126)

Current subscriber count.

## Methods

### close()

> **close**(): `void`

Defined in: [core/src/cell-kernel.ts:122](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L122)

Complete every subscriber exactly once and mark the kernel closed. Idempotent.

#### Returns

`void`

***

### publish()

> **publish**(`value`): `void`

Defined in: [core/src/cell-kernel.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L118)

Set the current value and fan it out to every subscriber. Inert after close.

#### Parameters

##### value

`T`

#### Returns

`void`

***

### read()

> **read**(): `T`

Defined in: [core/src/cell-kernel.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L116)

The current value — the initial value until the first publish. Readable after close.

#### Returns

`T`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../type-aliases/Disposer.md)

Defined in: [core/src/cell-kernel.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L120)

Replay the current value to `subscriber`, then register it. Returns its [Disposer](../type-aliases/Disposer.md).

#### Parameters

##### subscriber

[`CellSubscriber`](../type-aliases/CellSubscriber.md)\<`T`\>

#### Returns

[`Disposer`](../type-aliases/Disposer.md)

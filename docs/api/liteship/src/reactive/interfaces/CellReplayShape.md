[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / CellReplayShape

# Interface: CellReplayShape\<T\>

Defined in: core/dist/reactive/cell-kernel.d.ts:117

Live replay-1 kernel: a current-value slot with synchronous replay-on-subscribe.

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"CellReplay"`

Defined in: core/dist/reactive/cell-kernel.d.ts:118

***

### closed

> `readonly` **closed**: `boolean`

Defined in: core/dist/reactive/cell-kernel.d.ts:128

True once [close](#close) has run.

***

### size

> `readonly` **size**: `number`

Defined in: core/dist/reactive/cell-kernel.d.ts:130

Current subscriber count.

## Methods

### close()

> **close**(): `void`

Defined in: core/dist/reactive/cell-kernel.d.ts:126

Complete every subscriber exactly once and mark the kernel closed. Idempotent.

#### Returns

`void`

***

### publish()

> **publish**(`value`): `void`

Defined in: core/dist/reactive/cell-kernel.d.ts:122

Set the current value and fan it out to every subscriber. Inert after close.

#### Parameters

##### value

`T`

#### Returns

`void`

***

### read()

> **read**(): `T`

Defined in: core/dist/reactive/cell-kernel.d.ts:120

The current value — the initial value until the first publish. Readable after close.

#### Returns

`T`

***

### subscribe()

> **subscribe**(`subscriber`): [`Disposer`](../type-aliases/Disposer.md)

Defined in: core/dist/reactive/cell-kernel.d.ts:124

Replay the current value to `subscriber`, then register it. Returns its [Disposer](../type-aliases/Disposer.md).

#### Parameters

##### subscriber

[`CellSubscriber`](../type-aliases/CellSubscriber.md)\<`T`\>

#### Returns

[`Disposer`](../type-aliases/Disposer.md)

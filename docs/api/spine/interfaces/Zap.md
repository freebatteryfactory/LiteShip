[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Zap

# Interface: Zap\<T\>

Defined in: [\_spine/core.d.ts:708](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L708)

Push-based event channel over a no-replay [CellKernel](../namespaces/CellKernel/README.md) fan-out

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"Zap"`

Defined in: [\_spine/core.d.ts:709](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L709)

***

### stream

> `readonly` **stream**: `Pick`\<[`Fanout`](../namespaces/CellKernel/interfaces/Fanout.md)\<`T`\>, `"subscribe"` \| `"closed"` \| `"size"`\>

Defined in: [\_spine/core.d.ts:711](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L711)

The no-replay subscribe surface — `subscribe(sink)` returns a disposer.

## Methods

### emit()

> **emit**(`value`): `void`

Defined in: [\_spine/core.d.ts:713](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L713)

Fan `value` out to every current subscriber, synchronously. Inert after close.

#### Parameters

##### value

`T`

#### Returns

`void`

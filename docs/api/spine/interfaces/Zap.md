[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Zap

# Interface: Zap\<T\>

Defined in: [\_spine/core.d.ts:923](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L923)

Push-based event channel over a no-replay [CellKernel](../namespaces/CellKernel/README.md) fan-out

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"Zap"`

Defined in: [\_spine/core.d.ts:924](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L924)

***

### stream

> `readonly` **stream**: `Pick`\<[`Fanout`](../namespaces/CellKernel/interfaces/Fanout.md)\<`T`\>, `"subscribe"` \| `"closed"` \| `"size"`\>

Defined in: [\_spine/core.d.ts:926](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L926)

The no-replay subscribe surface — `subscribe(sink)` returns a disposer.

## Methods

### emit()

> **emit**(`value`): `void`

Defined in: [\_spine/core.d.ts:928](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L928)

Fan `value` out to every current subscriber, synchronously. Inert after close.

#### Parameters

##### value

`T`

#### Returns

`void`

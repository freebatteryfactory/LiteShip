[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / SPSCRing

# Interface: SPSCRing

Defined in: [\_spine/worker.d.ts:304](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L304)

Single-producer/single-consumer shared-memory ring buffer.

## Properties

### capacity

> `readonly` **capacity**: `number`

Defined in: [\_spine/worker.d.ts:308](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L308)

Number of slots in the ring buffer.

***

### count

> `readonly` **count**: `number`

Defined in: [\_spine/worker.d.ts:310](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L310)

Current number of occupied slots.

## Methods

### pop()

> **pop**(`out`): `boolean`

Defined in: [\_spine/worker.d.ts:306](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L306)

#### Parameters

##### out

`Float64Array`

#### Returns

`boolean`

***

### push()

> **push**(`data`): `boolean`

Defined in: [\_spine/worker.d.ts:305](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L305)

#### Parameters

##### data

`Float64Array`

#### Returns

`boolean`

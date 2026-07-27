[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / SPSCRing

# Interface: SPSCRing

Defined in: [\_spine/worker.d.ts:303](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L303)

Single-producer/single-consumer shared-memory ring buffer.

## Properties

### capacity

> `readonly` **capacity**: `number`

Defined in: [\_spine/worker.d.ts:307](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L307)

Number of slots in the ring buffer.

***

### count

> `readonly` **count**: `number`

Defined in: [\_spine/worker.d.ts:309](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L309)

Current number of occupied slots.

## Methods

### pop()

> **pop**(`out`): `boolean`

Defined in: [\_spine/worker.d.ts:305](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L305)

#### Parameters

##### out

`Float64Array`

#### Returns

`boolean`

***

### push()

> **push**(`data`): `boolean`

Defined in: [\_spine/worker.d.ts:304](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L304)

#### Parameters

##### data

`Float64Array`

#### Returns

`boolean`

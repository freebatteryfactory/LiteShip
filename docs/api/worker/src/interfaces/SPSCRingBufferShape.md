[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / SPSCRingBufferShape

# Interface: SPSCRingBufferShape

Defined in: [worker/src/spsc-ring.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/spsc-ring.ts#L74)

Producer- or consumer-side handle to a single-producer/single-consumer
ring buffer backed by `SharedArrayBuffer`. Created by
[SPSCRing.attachProducer](../variables/SPSCRing.md#attachproducer) or [SPSCRing.attachConsumer](../variables/SPSCRing.md#attachconsumer).

## Properties

### capacity

> `readonly` **capacity**: `number`

Defined in: [worker/src/spsc-ring.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/spsc-ring.ts#L88)

Number of slots in the ring buffer.

***

### count

> `readonly` **count**: `number`

Defined in: [worker/src/spsc-ring.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/spsc-ring.ts#L91)

Current number of occupied slots.

## Methods

### pop()

> **pop**(`out`): `boolean`

Defined in: [worker/src/spsc-ring.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/spsc-ring.ts#L85)

Pop a data slot from the ring buffer into the provided output array.
Returns `false` if the buffer is empty (non-blocking).

#### Parameters

##### out

`Float64Array`

#### Returns

`boolean`

***

### push()

> **push**(`data`): `boolean`

Defined in: [worker/src/spsc-ring.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/spsc-ring.ts#L79)

Push a data slot into the ring buffer.
Returns `false` if the buffer is full (non-blocking).

#### Parameters

##### data

`Float64Array`

#### Returns

`boolean`

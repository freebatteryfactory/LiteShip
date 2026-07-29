[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / SPSCRing

# Type Alias: SPSCRing

> **SPSCRing** = `object`

Defined in: [\_spine/worker.d.ts:304](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L304)

## Methods

### attachConsumer()

> **attachConsumer**(`sab`, `slotCount?`, `slotSize?`): `SPSCRing`

Defined in: [\_spine/worker.d.ts:332](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L332)

Ring geometry rides in the buffer header; explicit slotCount/slotSize are validated against it (a mismatch throws).

#### Parameters

##### sab

`SharedArrayBuffer`

##### slotCount?

`number`

##### slotSize?

`number`

#### Returns

`SPSCRing`

***

### attachProducer()

> **attachProducer**(`sab`, `slotCount?`, `slotSize?`): `SPSCRing`

Defined in: [\_spine/worker.d.ts:330](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L330)

Ring geometry rides in the buffer header; explicit slotCount/slotSize are validated against it (a mismatch throws).

#### Parameters

##### sab

`SharedArrayBuffer`

##### slotCount?

`number`

##### slotSize?

`number`

#### Returns

`SPSCRing`

***

### createPair()

> **createPair**(`slotCount`, `slotSize`): [`SPSCRingPair`](../interfaces/SPSCRingPair.md)

Defined in: [\_spine/worker.d.ts:328](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L328)

#### Parameters

##### slotCount

`number`

##### slotSize

`number`

#### Returns

[`SPSCRingPair`](../interfaces/SPSCRingPair.md)

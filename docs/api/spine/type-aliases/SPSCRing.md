[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / SPSCRing

# Type Alias: SPSCRing

> **SPSCRing** = `object`

Defined in: [\_spine/worker.d.ts:303](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L303)

## Methods

### attachConsumer()

> **attachConsumer**(`sab`, `slotCount?`, `slotSize?`): `SPSCRing`

Defined in: [\_spine/worker.d.ts:331](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L331)

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

Defined in: [\_spine/worker.d.ts:329](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L329)

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

Defined in: [\_spine/worker.d.ts:327](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L327)

#### Parameters

##### slotCount

`number`

##### slotSize

`number`

#### Returns

[`SPSCRingPair`](../interfaces/SPSCRingPair.md)

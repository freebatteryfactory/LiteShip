[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ReceiptEnvelope

# Interface: ReceiptEnvelope

Defined in: [\_spine/core.d.ts:1198](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1198)

Hash-linked receipt carrying deterministic evidence payload and causality.

## Properties

### hash

> `readonly` **hash**: `string`

Defined in: [\_spine/core.d.ts:1203](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1203)

***

### kind

> `readonly` **kind**: `string`

Defined in: [\_spine/core.d.ts:1199](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1199)

***

### payload

> `readonly` **payload**: [`TypedRef`](TypedRef.md)

Defined in: [\_spine/core.d.ts:1202](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1202)

***

### previous

> `readonly` **previous**: `string` \| readonly `string`[]

Defined in: [\_spine/core.d.ts:1204](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1204)

***

### signature?

> `readonly` `optional` **signature?**: `string`

Defined in: [\_spine/core.d.ts:1205](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1205)

***

### subject

> `readonly` **subject**: [`ReceiptSubject`](ReceiptSubject.md)

Defined in: [\_spine/core.d.ts:1201](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1201)

***

### timestamp

> `readonly` **timestamp**: [`HLC`](../type-aliases/HLC.md)

Defined in: [\_spine/core.d.ts:1200](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1200)

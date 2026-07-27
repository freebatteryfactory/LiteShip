[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ReceiptEnvelope

# Interface: ReceiptEnvelope

Defined in: [\_spine/core.d.ts:983](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L983)

Hash-linked receipt carrying deterministic evidence payload and causality.

## Properties

### hash

> `readonly` **hash**: `string`

Defined in: [\_spine/core.d.ts:988](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L988)

***

### kind

> `readonly` **kind**: `string`

Defined in: [\_spine/core.d.ts:984](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L984)

***

### payload

> `readonly` **payload**: [`TypedRef`](TypedRef.md)

Defined in: [\_spine/core.d.ts:987](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L987)

***

### previous

> `readonly` **previous**: `string` \| readonly `string`[]

Defined in: [\_spine/core.d.ts:989](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L989)

***

### signature?

> `readonly` `optional` **signature?**: `string`

Defined in: [\_spine/core.d.ts:990](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L990)

***

### subject

> `readonly` **subject**: [`ReceiptSubject`](ReceiptSubject.md)

Defined in: [\_spine/core.d.ts:986](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L986)

***

### timestamp

> `readonly` **timestamp**: [`HLC`](../type-aliases/HLC.md)

Defined in: [\_spine/core.d.ts:985](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L985)

[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / AddQuantizerMessage

# Interface: AddQuantizerMessage

Defined in: [\_spine/worker.d.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L36)

Host command registering one quantizer with the worker.

## Properties

### boundaryId

> `readonly` **boundaryId**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/worker.d.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L39)

***

### name

> `readonly` **name**: `string`

Defined in: [\_spine/worker.d.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L38)

***

### states

> `readonly` **states**: readonly [`StateName`](../type-aliases/StateName.md)[]

Defined in: [\_spine/worker.d.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L40)

***

### thresholds

> `readonly` **thresholds**: readonly `number`[] \| `Float64Array`\<`ArrayBufferLike`\>

Defined in: [\_spine/worker.d.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L41)

***

### type

> `readonly` **type**: `"add-quantizer"`

Defined in: [\_spine/worker.d.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L37)

[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / BootstrapQuantizerRegistration

# Interface: BootstrapQuantizerRegistration

Defined in: [\_spine/worker.d.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L44)

Quantizer definition and initial evidence transferred during bootstrap.

## Properties

### blendWeights?

> `readonly` `optional` **blendWeights?**: `Record`\<`string`, `number`\>

Defined in: [\_spine/worker.d.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L50)

***

### boundaryId

> `readonly` **boundaryId**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/worker.d.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L46)

***

### initialState?

> `readonly` `optional` **initialState?**: [`StateName`](../type-aliases/StateName.md)

Defined in: [\_spine/worker.d.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L49)

***

### name

> `readonly` **name**: `string`

Defined in: [\_spine/worker.d.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L45)

***

### states

> `readonly` **states**: readonly [`StateName`](../type-aliases/StateName.md)[]

Defined in: [\_spine/worker.d.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L47)

***

### thresholds

> `readonly` **thresholds**: readonly `number`[] \| `Float64Array`\<`ArrayBufferLike`\>

Defined in: [\_spine/worker.d.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L48)

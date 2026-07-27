[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / QuantizerBoundarySource

# Interface: QuantizerBoundarySource

Defined in: [\_spine/worker.d.ts:377](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L377)

The boundary surface addQuantizer derives a registration from —
structurally satisfied by a `defineBoundary` result from @liteship/core.

## Properties

### id

> `readonly` **id**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/worker.d.ts:378](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L378)

***

### input

> `readonly` **input**: `string`

Defined in: [\_spine/worker.d.ts:380](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L380)

Signal input name — used as the quantizer name when none is given.

***

### states

> `readonly` **states**: readonly `string`[]

Defined in: [\_spine/worker.d.ts:382](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L382)

Plain strings — BoundaryDef.states is unbranded.

***

### thresholds

> `readonly` **thresholds**: readonly `number`[]

Defined in: [\_spine/worker.d.ts:383](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L383)

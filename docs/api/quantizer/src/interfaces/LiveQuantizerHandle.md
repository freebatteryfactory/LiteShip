[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / LiveQuantizerHandle

# Interface: LiveQuantizerHandle\<B, O\>

Defined in: [quantizer/src/quantizer.ts:289](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L289)

The pair [QuantizerConfig.create](QuantizerConfig.md#create) returns: the live reactive quantizer
plus the [Lifetime](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts) that owns its teardown. Dispose the lifetime to close
the state / outputs / crossings kernels (completing subscribers, making publish
inert).

## Type Parameters

### B

`B` *extends* [`Boundary.Shape`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)

### O

`O` *extends* [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\> = [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\>

## Properties

### lifetime

> `readonly` **lifetime**: `LifetimeShape`

Defined in: [quantizer/src/quantizer.ts:291](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L291)

***

### quantizer

> `readonly` **quantizer**: [`LiveQuantizer`](LiveQuantizer.md)\<`B`, `O`\>

Defined in: [quantizer/src/quantizer.ts:290](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L290)

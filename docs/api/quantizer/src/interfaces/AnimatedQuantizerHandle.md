[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / AnimatedQuantizerHandle

# Interface: AnimatedQuantizerHandle\<B\>

Defined in: [quantizer/src/animated-quantizer.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L56)

The pair [AnimatedQuantizer.make](../variables/AnimatedQuantizer.md#make) returns: the live animated quantizer
plus the [Lifetime](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/lifetime.ts) that owns its teardown. Dispose the lifetime to stop
observing the wrapped quantizer's crossings, abort any in-flight animation, and
close the `interpolated` fan-out (completing subscribers, making publish inert).

## Type Parameters

### B

`B` *extends* [`Boundary.Shape`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)

## Properties

### animated

> `readonly` **animated**: [`AnimatedQuantizerShape`](AnimatedQuantizerShape.md)\<`B`\>

Defined in: [quantizer/src/animated-quantizer.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L57)

***

### lifetime

> `readonly` **lifetime**: `LifetimeShape`

Defined in: [quantizer/src/animated-quantizer.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L58)

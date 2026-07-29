[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / OwnedAnimatedQuantizer

# Type Alias: OwnedAnimatedQuantizer\<B\>

> **OwnedAnimatedQuantizer**\<`B`\> = [`AnimatedQuantizer`](AnimatedQuantizer.md)\<`B`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

Defined in: [\_spine/quantizer.d.ts:202](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L202)

A live animated quantizer that owns its teardown directly
([AsyncOwnedResource](../interfaces/AsyncOwnedResource.md)): `await animated.dispose()` stops observing the
wrapped quantizer's crossings, aborts any in-flight animation, and closes the
`interpolated` fan-out. The value IS the disposable — no pair to destructure.

## Type Parameters

### B

`B` *extends* [`Boundary`](../interfaces/Boundary.md)

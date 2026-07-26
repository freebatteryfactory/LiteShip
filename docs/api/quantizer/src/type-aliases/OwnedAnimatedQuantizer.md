[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / OwnedAnimatedQuantizer

# Type Alias: OwnedAnimatedQuantizer\<B\>

> **OwnedAnimatedQuantizer**\<`B`\> = [`AnimatedQuantizerShape`](../interfaces/AnimatedQuantizerShape.md)\<`B`\> & [`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md)

Defined in: [quantizer/src/animated-quantizer.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L67)

A live animated quantizer that owns its teardown directly
([AsyncOwnedResource](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md)): `await animated.dispose()` stops observing the
wrapped quantizer's crossings, aborts any in-flight animation, and closes the
`interpolated` fan-out (completing subscribers, making publish inert). The
owning [Lifetime](../../../liteship/src/reactive/type-aliases/Lifetime.md) stays reachable as `animated.lifetime` for advanced
composition.

## Type Parameters

### B

`B` *extends* [`Boundary`](../../../liteship/src/type-aliases/Boundary.md)

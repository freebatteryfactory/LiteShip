[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / OwnedAnimatedQuantizer

# Type Alias: OwnedAnimatedQuantizer\<B\>

> **OwnedAnimatedQuantizer**\<`B`\> = [`AnimatedQuantizerShape`](../interfaces/AnimatedQuantizerShape.md)\<`B`\> & [`AsyncOwnedResource`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/AsyncOwnedResource.md)

Defined in: [quantizer/src/animated-quantizer.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L67)

A live animated quantizer that owns its teardown directly
([AsyncOwnedResource](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/AsyncOwnedResource.md)): `await animated.dispose()` stops observing the
wrapped quantizer's crossings, aborts any in-flight animation, and closes the
`interpolated` fan-out (completing subscribers, making publish inert). The
owning [Lifetime](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts) stays reachable as `animated.lifetime` for advanced
composition.

## Type Parameters

### B

`B` *extends* [`Boundary`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Boundary.md)

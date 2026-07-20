[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / OwnedQuantizer

# Type Alias: OwnedQuantizer\<B, O\>

> **OwnedQuantizer**\<`B`, `O`\> = [`LiveQuantizer`](../interfaces/LiveQuantizer.md)\<`B`, `O`\> & [`AsyncOwnedResource`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/AsyncOwnedResource.md)

Defined in: [quantizer/src/quantizer.ts:291](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L291)

A live reactive quantizer that owns its teardown directly
([AsyncOwnedResource](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/AsyncOwnedResource.md)): `await quantizer.dispose()` closes the state /
outputs / crossings kernels (completing subscribers, making publish inert). The
owning [Lifetime](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts) stays reachable as `quantizer.lifetime` for advanced
composition (e.g. threading it into an [AnimatedQuantizer](AnimatedQuantizer.md)).

## Type Parameters

### B

`B` *extends* [`Boundary`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Boundary.md)

### O

`O` *extends* [`QuantizerOutputs`](../interfaces/QuantizerOutputs.md)\<`B`\> = [`QuantizerOutputs`](../interfaces/QuantizerOutputs.md)\<`B`\>

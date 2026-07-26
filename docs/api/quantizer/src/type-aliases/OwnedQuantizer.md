[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / OwnedQuantizer

# Type Alias: OwnedQuantizer\<B, O\>

> **OwnedQuantizer**\<`B`, `O`\> = [`LiveQuantizer`](../interfaces/LiveQuantizer.md)\<`B`, `O`\> & [`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md)

Defined in: [quantizer/src/quantizer.ts:316](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L316)

A live reactive quantizer that owns its teardown directly
([AsyncOwnedResource](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md)): `await quantizer.dispose()` closes the state /
outputs / crossings kernels (completing subscribers, making publish inert). The
owning [Lifetime](../../../liteship/src/reactive/type-aliases/Lifetime.md) stays reachable as `quantizer.lifetime` for advanced
composition (e.g. threading it into an `AnimatedQuantizer`).

## Type Parameters

### B

`B` *extends* [`Boundary`](../../../liteship/src/type-aliases/Boundary.md)

### O

`O` *extends* [`QuantizerOutputs`](../interfaces/QuantizerOutputs.md)\<`B`\> = [`QuantizerOutputs`](../interfaces/QuantizerOutputs.md)\<`B`\>

[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / OwnedQuantizer

# Type Alias: OwnedQuantizer\<B, O\>

> **OwnedQuantizer**\<`B`, `O`\> = [`LiveQuantizer`](../interfaces/LiveQuantizer.md)\<`B`, `O`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

Defined in: quantizer/dist/quantizer.d.ts:211

A live reactive quantizer that owns its teardown directly
([AsyncOwnedResource](../interfaces/AsyncOwnedResource.md)): `await quantizer.dispose()` closes the state /
outputs / crossings kernels (completing subscribers, making publish inert). The
owning [Lifetime](../namespaces/Lifetime/README.md) stays reachable as `quantizer.lifetime` for advanced
composition (e.g. threading it into an `AnimatedQuantizer`).

## Type Parameters

### B

`B` *extends* [`Boundary`](../../type-aliases/Boundary.md)

### O

`O` *extends* `QuantizerOutputs`\<`B`\> = `QuantizerOutputs`\<`B`\>

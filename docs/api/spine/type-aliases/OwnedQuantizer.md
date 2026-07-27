[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / OwnedQuantizer

# Type Alias: OwnedQuantizer\<B, O\>

> **OwnedQuantizer**\<`B`, `O`\> = [`LiveQuantizer`](../interfaces/LiveQuantizer.md)\<`B`, `O`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

Defined in: [\_spine/quantizer.d.ts:111](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L111)

A live reactive quantizer that owns its teardown directly
([AsyncOwnedResource](../interfaces/AsyncOwnedResource.md)): `await quantizer.dispose()` closes the state /
outputs / crossings kernels. The value IS the disposable — no pair to
destructure — with the owning `lifetime` still reachable.

## Type Parameters

### B

`B` *extends* [`Boundary`](../interfaces/Boundary.md)

### O

`O` *extends* [`QuantizerOutputs`](../interfaces/QuantizerOutputs.md)\<`B`\> = [`QuantizerOutputs`](../interfaces/QuantizerOutputs.md)\<`B`\>

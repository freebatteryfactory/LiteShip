[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / QuantizerBuilder

# Interface: QuantizerBuilder\<B\>

Defined in: [quantizer/src/quantizer.ts:240](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L240)

Fluent builder returned by [Q.from](../variables/Q.md#from).

Call `.outputs({ ... })` to produce a content-addressed
[QuantizerConfig](QuantizerConfig.md), optionally preceded by `.force(targets)` to
override MotionTier gating for specific targets (e.g., enabling AI
signals at the `none` tier for testing).

## Type Parameters

### B

`B` *extends* [`Boundary.Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)

## Methods

### force()

> **force**(...`targets`): `QuantizerBuilder`\<`B`\>

Defined in: [quantizer/src/quantizer.ts:244](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L244)

Force-enable specific targets regardless of the current tier's gating set.

#### Parameters

##### targets

...[`OutputTarget`](../type-aliases/OutputTarget.md)[]

#### Returns

`QuantizerBuilder`\<`B`\>

***

### outputs()

> **outputs**\<`O`\>(`outputs`): [`QuantizerConfig`](QuantizerConfig.md)\<`B`, `O`\>

Defined in: [quantizer/src/quantizer.ts:242](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L242)

Attach per-target output tables and produce a [QuantizerConfig](QuantizerConfig.md).

#### Type Parameters

##### O

`O` *extends* [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\>

#### Parameters

##### outputs

`O`

#### Returns

[`QuantizerConfig`](QuantizerConfig.md)\<`B`, `O`\>

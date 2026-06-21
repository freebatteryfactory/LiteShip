[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / QuantizerConfig

# Interface: QuantizerConfig\<B, O\>

Defined in: [quantizer/src/quantizer.ts:178](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L178)

Immutable, content-addressed quantizer definition.

The `id` is an FNV-1a hash over the boundary id and outputs, so two
configs with identical definitions share the same address and are
deduplicated by the internal memo cache. `create()` materializes a
fresh [LiveQuantizer](LiveQuantizer.md) within an Effect scope.

## Type Parameters

### B

`B` *extends* [`Boundary.Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)

### O

`O` *extends* [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\> = [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\>

## Properties

### boundary

> `readonly` **boundary**: `B`

Defined in: [quantizer/src/quantizer.ts:180](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L180)

Boundary this config quantizes against.

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [quantizer/src/quantizer.ts:184](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L184)

Content-addressed identity (FNV-1a of boundary id + outputs).

***

### outputs

> `readonly` **outputs**: `O`

Defined in: [quantizer/src/quantizer.ts:182](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L182)

Per-target output tables keyed by state.

***

### spring?

> `readonly` `optional` **spring?**: [`SpringConfig`](SpringConfig.md)

Defined in: [quantizer/src/quantizer.ts:188](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L188)

Spring config driving CSS easing injection.

***

### tier?

> `readonly` `optional` **tier?**: `MotionTier`

Defined in: [quantizer/src/quantizer.ts:186](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L186)

Motion tier gating active targets; see [QuantizerFromOptions.tier](QuantizerFromOptions.md#tier) for the tier → targets table.

## Methods

### create()

> **create**(): `Effect`\<[`LiveQuantizer`](LiveQuantizer.md)\<`B`, `O`\>, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\>

Defined in: [quantizer/src/quantizer.ts:190](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L190)

Instantiate a reactive [LiveQuantizer](LiveQuantizer.md) scoped to an Effect fiber.

#### Returns

`Effect`\<[`LiveQuantizer`](LiveQuantizer.md)\<`B`, `O`\>, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\>

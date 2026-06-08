[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / QuantizerConfig

# Interface: QuantizerConfig\<B, O\>

Defined in: [quantizer/src/quantizer.ts:152](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L152)

Immutable, content-addressed quantizer definition.

The `id` is an FNV-1a hash over the boundary id and outputs, so two
configs with identical definitions share the same address and are
deduplicated by the internal memo cache. `create()` materializes a
fresh [LiveQuantizer](LiveQuantizer.md) within an Effect scope.

## Type Parameters

### B

`B` *extends* [`Boundary.Shape`](#)

### O

`O` *extends* [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\> = [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\>

## Properties

### boundary

> `readonly` **boundary**: `B`

Defined in: [quantizer/src/quantizer.ts:154](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L154)

Boundary this config quantizes against.

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [quantizer/src/quantizer.ts:158](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L158)

Content-addressed identity (FNV-1a of boundary id + outputs).

***

### outputs

> `readonly` **outputs**: `O`

Defined in: [quantizer/src/quantizer.ts:156](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L156)

Per-target output tables keyed by state.

***

### spring?

> `readonly` `optional` **spring?**: [`SpringConfig`](SpringConfig.md)

Defined in: [quantizer/src/quantizer.ts:162](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L162)

Spring config driving CSS easing injection.

***

### tier?

> `readonly` `optional` **tier?**: `MotionTier`

Defined in: [quantizer/src/quantizer.ts:160](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L160)

Motion tier gating active targets; see `TIER_TARGETS` (in `@czap/quantizer/testing`).

## Methods

### create()

> **create**(): `Effect`\<[`LiveQuantizer`](LiveQuantizer.md)\<`B`, `O`\>, `never`, [`Scope`](#)\>

Defined in: [quantizer/src/quantizer.ts:164](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L164)

Instantiate a reactive [LiveQuantizer](LiveQuantizer.md) scoped to an Effect fiber.

#### Returns

`Effect`\<[`LiveQuantizer`](LiveQuantizer.md)\<`B`, `O`\>, `never`, [`Scope`](#)\>

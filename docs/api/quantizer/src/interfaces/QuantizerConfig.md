[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / QuantizerConfig

# Interface: QuantizerConfig\<B, O\>

Defined in: [quantizer/src/quantizer.ts:248](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L248)

Immutable, content-addressed quantizer definition (authored intent).

The `id` is an FNV-1a hash over the boundary id, outputs, tier, spring, and
forced targets, so two configs with identical definitions share the same
address and are deduplicated by the internal memo cache. This is a PURE data
definition — pass it to [createQuantizer](../functions/createQuantizer.md) to materialize a fresh
[LiveQuantizer](LiveQuantizer.md) that owns its own teardown via `dispose()`.

## Type Parameters

### B

`B` *extends* [`Boundary`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Boundary.md)

### O

`O` *extends* [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\> = [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\>

## Properties

### boundary

> `readonly` **boundary**: `B`

Defined in: [quantizer/src/quantizer.ts:250](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L250)

Boundary this config quantizes against.

***

### force?

> `readonly` `optional` **force?**: readonly [`QualityTierTarget`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/QualityTierTarget.md)[]

Defined in: [quantizer/src/quantizer.ts:260](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L260)

Targets force-enabled past their tier gate; part of the content address.

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [quantizer/src/quantizer.ts:254](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L254)

Content-addressed identity (FNV-1a of boundary id + outputs + tier + spring + force).

***

### outputs

> `readonly` **outputs**: `O`

Defined in: [quantizer/src/quantizer.ts:252](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L252)

Per-target output tables keyed by state.

***

### spring?

> `readonly` `optional` **spring?**: [`SpringConfig`](SpringConfig.md)

Defined in: [quantizer/src/quantizer.ts:258](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L258)

Spring config driving CSS easing injection.

***

### tier?

> `readonly` `optional` **tier?**: `MotionTier`

Defined in: [quantizer/src/quantizer.ts:256](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L256)

Motion tier gating active targets; see [DefineQuantizerOptions.tier](DefineQuantizerOptions.md#tier) for the tier → targets table.

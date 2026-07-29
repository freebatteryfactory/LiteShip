[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/reactive](../README.md) / QuantizerConfig

# Interface: QuantizerConfig\<B, O\>

Defined in: quantizer/dist/quantizer.d.ts:152

Immutable, content-addressed quantizer definition (authored intent).

The `id` is an FNV-1a hash over the boundary id, outputs, tier, spring, and
forced targets, so two configs with identical definitions share the same
address and are deduplicated by the internal memo cache. This is a PURE data
definition — pass it to [createQuantizer](../functions/createQuantizer.md) to materialize a fresh
[LiveQuantizer](LiveQuantizer.md) that owns its own teardown via `dispose()`.

## Type Parameters

### B

`B` *extends* [`Boundary`](../../type-aliases/Boundary.md)

### O

`O` *extends* `QuantizerOutputs`\<`B`\> = `QuantizerOutputs`\<`B`\>

## Properties

### boundary

> `readonly` **boundary**: `B`

Defined in: quantizer/dist/quantizer.d.ts:154

Boundary this config quantizes against.

***

### force?

> `readonly` `optional` **force?**: readonly [`QualityTierTarget`](../../evidence/type-aliases/QualityTierTarget.md)[]

Defined in: quantizer/dist/quantizer.d.ts:164

Targets force-enabled past their tier gate; part of the content address.

***

### id

> `readonly` **id**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: quantizer/dist/quantizer.d.ts:158

Content-addressed identity (FNV-1a of boundary id + outputs + tier + spring + force).

***

### outputs

> `readonly` **outputs**: `DeepReadonly`\<`O`\>

Defined in: quantizer/dist/quantizer.d.ts:156

Per-target output tables keyed by state.

***

### spring?

> `readonly` `optional` **spring?**: `object`

Defined in: quantizer/dist/quantizer.d.ts:162

Spring config driving CSS easing injection.

#### damping

> `readonly` **damping**: `number`

Damping coefficient; higher = less oscillation.

#### mass?

> `readonly` `optional` **mass?**: `number`

Mass of the animated body; defaults to `1`.

#### stiffness

> `readonly` **stiffness**: `number`

Spring constant (force per unit displacement); higher = snappier.

***

### tier?

> `readonly` `optional` **tier?**: [`MotionTier`](../../../../spine/type-aliases/MotionTier.md)

Defined in: quantizer/dist/quantizer.d.ts:160

Motion tier gating active targets; see [DefineQuantizerOptions.tier](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts) for the tier → targets table.

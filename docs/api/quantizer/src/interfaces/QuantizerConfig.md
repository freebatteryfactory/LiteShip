[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / QuantizerConfig

# Interface: QuantizerConfig\<B, O\>

Defined in: [quantizer/src/quantizer.ts:214](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L214)

Immutable, content-addressed quantizer definition.

The `id` is an FNV-1a hash over the boundary id and outputs, so two
configs with identical definitions share the same address and are
deduplicated by the internal memo cache. `create()` materializes a
fresh [LiveQuantizer](LiveQuantizer.md) paired with its owning [Lifetime](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/lifetime.ts).

## Type Parameters

### B

`B` *extends* [`Boundary.Shape`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)

### O

`O` *extends* [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\> = [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\>

## Properties

### boundary

> `readonly` **boundary**: `B`

Defined in: [quantizer/src/quantizer.ts:216](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L216)

Boundary this config quantizes against.

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [quantizer/src/quantizer.ts:220](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L220)

Content-addressed identity (FNV-1a of boundary id + outputs).

***

### outputs

> `readonly` **outputs**: `O`

Defined in: [quantizer/src/quantizer.ts:218](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L218)

Per-target output tables keyed by state.

***

### spring?

> `readonly` `optional` **spring?**: [`SpringConfig`](SpringConfig.md)

Defined in: [quantizer/src/quantizer.ts:224](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L224)

Spring config driving CSS easing injection.

***

### tier?

> `readonly` `optional` **tier?**: `MotionTier`

Defined in: [quantizer/src/quantizer.ts:222](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L222)

Motion tier gating active targets; see [QuantizerFromOptions.tier](QuantizerFromOptions.md#tier) for the tier → targets table.

## Methods

### create()

> **create**(`runtime?`): [`LiveQuantizerHandle`](LiveQuantizerHandle.md)\<`B`, `O`\>

Defined in: [quantizer/src/quantizer.ts:235](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/quantizer.ts#L235)

Instantiate a reactive [LiveQuantizer](LiveQuantizer.md), paired with the [Lifetime](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/lifetime.ts)
that owns its teardown — disposing it closes the state / outputs / crossings
kernels (completing every subscriber and making publish inert).

Pass a [QuantizerRuntime](QuantizerRuntime.md) to inject the wall-clock boundary that
advances this instance's monotonic crossing HLC; omit it to default to
`@liteship/core`'s `wallClock`. The clock is per-instantiation, never part of
the cached config's identity.

#### Parameters

##### runtime?

[`QuantizerRuntime`](QuantizerRuntime.md)

#### Returns

[`LiveQuantizerHandle`](LiveQuantizerHandle.md)\<`B`, `O`\>

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / QuantizerBoundarySource

# Interface: QuantizerBoundarySource

Defined in: [worker/src/compositor-types.ts:50](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L50)

The boundary surface [CompositorWorkerShape.addQuantizer](CompositorWorkerShape.md#addquantizer) derives
a registration from — structurally satisfied by a `Boundary.make`
result from `@czap/core`, whose content-addressed `id` and `input`
name make hand-assembled registrations unnecessary.

## Properties

### id

> `readonly` **id**: `ContentAddress`

Defined in: [worker/src/compositor-types.ts:52](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L52)

Content address computed by `Boundary.make` (ADR-0003).

***

### input

> `readonly` **input**: `string`

Defined in: [worker/src/compositor-types.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L54)

Signal input name — used as the quantizer name when none is given.

***

### states

> `readonly` **states**: readonly `string`[]

Defined in: [worker/src/compositor-types.ts:56](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L56)

Ordered discrete state labels (plain strings — `BoundaryDef.states` is unbranded).

***

### thresholds

> `readonly` **thresholds**: readonly `number`[]

Defined in: [worker/src/compositor-types.ts:58](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L58)

Lower-bound thresholds, one per state.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / QuantizerBoundarySource

# Interface: QuantizerBoundarySource

Defined in: [worker/src/compositor-types.ts:59](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L59)

The boundary surface [CompositorWorkerShape.addQuantizer](CompositorWorkerShape.md#addquantizer) derives
a registration from — structurally satisfied by a `Boundary.make`
result from `@czap/core`, whose content-addressed `id` and `input`
name make hand-assembled registrations unnecessary.

## Properties

### id

> `readonly` **id**: `ContentAddress`

Defined in: [worker/src/compositor-types.ts:61](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L61)

Content address computed by `Boundary.make` (ADR-0003).

***

### input

> `readonly` **input**: `string`

Defined in: [worker/src/compositor-types.ts:63](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L63)

Signal input name — used as the quantizer name when none is given.

***

### states

> `readonly` **states**: readonly `string`[]

Defined in: [worker/src/compositor-types.ts:65](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L65)

Ordered discrete state labels (plain strings — `BoundaryDef.states` is unbranded).

***

### thresholds

> `readonly` **thresholds**: readonly `number`[]

Defined in: [worker/src/compositor-types.ts:67](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L67)

Lower-bound thresholds, one per state.

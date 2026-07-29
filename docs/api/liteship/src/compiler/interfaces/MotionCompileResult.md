[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / MotionCompileResult

# Interface: MotionCompileResult

Defined in: compiler/dist/motion.d.ts:59

CSS artifacts emitted by [MotionCompiler.compile](../variables/MotionCompiler.md#compile).

## Properties

### keyframes

> `readonly` **keyframes**: `string`

Defined in: compiler/dist/motion.d.ts:63

***

### propertyRegistrations

> `readonly` **propertyRegistrations**: `string`

Defined in: compiler/dist/motion.d.ts:62

***

### raw

> `readonly` **raw**: `string`

Defined in: compiler/dist/motion.d.ts:61

Full concatenated CSS sheet (sections joined by blank lines).

***

### scrollTimeline

> `readonly` **scrollTimeline**: `string`

Defined in: compiler/dist/motion.d.ts:67

`@supports (animation-timeline: …)` block; empty when no view timeline.

***

### startingStyle

> `readonly` **startingStyle**: `string`

Defined in: compiler/dist/motion.d.ts:64

***

### support

> `readonly` **support**: [`MotionSupportMetadata`](MotionSupportMetadata.md)

Defined in: compiler/dist/motion.d.ts:69

Generated fidelity receipt for the emitted keyframe and transition tiers.

***

### transition

> `readonly` **transition**: `string`

Defined in: compiler/dist/motion.d.ts:65

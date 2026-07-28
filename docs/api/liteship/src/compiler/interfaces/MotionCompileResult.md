[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / MotionCompileResult

# Interface: MotionCompileResult

Defined in: compiler/dist/motion.d.ts:56

CSS artifacts emitted by [MotionCompiler.compile](../variables/MotionCompiler.md#compile).

## Properties

### keyframes

> `readonly` **keyframes**: `string`

Defined in: compiler/dist/motion.d.ts:60

***

### propertyRegistrations

> `readonly` **propertyRegistrations**: `string`

Defined in: compiler/dist/motion.d.ts:59

***

### raw

> `readonly` **raw**: `string`

Defined in: compiler/dist/motion.d.ts:58

Full concatenated CSS sheet (sections joined by blank lines).

***

### scrollTimeline

> `readonly` **scrollTimeline**: `string`

Defined in: compiler/dist/motion.d.ts:64

`@supports (animation-timeline: …)` block; empty when no view timeline.

***

### startingStyle

> `readonly` **startingStyle**: `string`

Defined in: compiler/dist/motion.d.ts:61

***

### support

> `readonly` **support**: [`MotionSupportMetadata`](MotionSupportMetadata.md)

Defined in: compiler/dist/motion.d.ts:66

Generated fidelity receipt for the emitted keyframe and transition tiers.

***

### transition

> `readonly` **transition**: `string`

Defined in: compiler/dist/motion.d.ts:62

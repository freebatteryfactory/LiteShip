[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / MotionCompileResult

# Interface: MotionCompileResult

Defined in: compiler/dist/motion.d.ts:38

CSS artifacts emitted by [MotionCompiler.compile](../variables/MotionCompiler.md#compile).

## Properties

### keyframes

> `readonly` **keyframes**: `string`

Defined in: compiler/dist/motion.d.ts:42

***

### propertyRegistrations

> `readonly` **propertyRegistrations**: `string`

Defined in: compiler/dist/motion.d.ts:41

***

### raw

> `readonly` **raw**: `string`

Defined in: compiler/dist/motion.d.ts:40

Full concatenated CSS sheet (sections joined by blank lines).

***

### scrollTimeline

> `readonly` **scrollTimeline**: `string`

Defined in: compiler/dist/motion.d.ts:46

`@supports (animation-timeline: …)` block; empty when no view timeline.

***

### startingStyle

> `readonly` **startingStyle**: `string`

Defined in: compiler/dist/motion.d.ts:43

***

### transition

> `readonly` **transition**: `string`

Defined in: compiler/dist/motion.d.ts:44

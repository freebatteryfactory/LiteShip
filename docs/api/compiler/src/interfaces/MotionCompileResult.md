[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / MotionCompileResult

# Interface: MotionCompileResult

Defined in: [compiler/src/motion.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L52)

CSS artifacts emitted by [MotionCompiler.compile](../variables/MotionCompiler.md#compile).

## Properties

### keyframes

> `readonly` **keyframes**: `string`

Defined in: [compiler/src/motion.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L56)

***

### propertyRegistrations

> `readonly` **propertyRegistrations**: `string`

Defined in: [compiler/src/motion.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L55)

***

### raw

> `readonly` **raw**: `string`

Defined in: [compiler/src/motion.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L54)

Full concatenated CSS sheet (sections joined by blank lines).

***

### scrollTimeline

> `readonly` **scrollTimeline**: `string`

Defined in: [compiler/src/motion.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L60)

`@supports (animation-timeline: …)` block; empty when no view timeline.

***

### startingStyle

> `readonly` **startingStyle**: `string`

Defined in: [compiler/src/motion.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L57)

***

### transition

> `readonly` **transition**: `string`

Defined in: [compiler/src/motion.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L58)

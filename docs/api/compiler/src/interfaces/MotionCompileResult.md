[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / MotionCompileResult

# Interface: MotionCompileResult

Defined in: [compiler/src/motion.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L43)

CSS artifacts emitted by [MotionCompiler.compile](../variables/MotionCompiler.md#compile).

## Properties

### keyframes

> `readonly` **keyframes**: `string`

Defined in: [compiler/src/motion.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L47)

***

### propertyRegistrations

> `readonly` **propertyRegistrations**: `string`

Defined in: [compiler/src/motion.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L46)

***

### raw

> `readonly` **raw**: `string`

Defined in: [compiler/src/motion.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L45)

Full concatenated CSS sheet (sections joined by blank lines).

***

### scrollTimeline

> `readonly` **scrollTimeline**: `string`

Defined in: [compiler/src/motion.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L51)

`@supports (animation-timeline: …)` block; empty when no view timeline.

***

### startingStyle

> `readonly` **startingStyle**: `string`

Defined in: [compiler/src/motion.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L48)

***

### transition

> `readonly` **transition**: `string`

Defined in: [compiler/src/motion.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L49)

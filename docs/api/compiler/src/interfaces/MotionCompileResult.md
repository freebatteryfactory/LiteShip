[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / MotionCompileResult

# Interface: MotionCompileResult

Defined in: [compiler/src/motion.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L72)

CSS artifacts emitted by [MotionCompiler.compile](../variables/MotionCompiler.md#compile).

## Properties

### keyframes

> `readonly` **keyframes**: `string`

Defined in: [compiler/src/motion.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L76)

***

### propertyRegistrations

> `readonly` **propertyRegistrations**: `string`

Defined in: [compiler/src/motion.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L75)

***

### raw

> `readonly` **raw**: `string`

Defined in: [compiler/src/motion.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L74)

Full concatenated CSS sheet (sections joined by blank lines).

***

### scrollTimeline

> `readonly` **scrollTimeline**: `string`

Defined in: [compiler/src/motion.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L80)

`@supports (animation-timeline: …)` block; empty when no view timeline.

***

### startingStyle

> `readonly` **startingStyle**: `string`

Defined in: [compiler/src/motion.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L77)

***

### support

> `readonly` **support**: [`MotionSupportMetadata`](MotionSupportMetadata.md)

Defined in: [compiler/src/motion.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L82)

Generated fidelity receipt for the emitted keyframe and transition tiers.

***

### transition

> `readonly` **transition**: `string`

Defined in: [compiler/src/motion.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L78)

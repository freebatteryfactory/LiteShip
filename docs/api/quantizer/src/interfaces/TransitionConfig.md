[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [quantizer/src](../README.md) / TransitionConfig

# Interface: TransitionConfig

Defined in: [quantizer/src/transition.ts:21](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/transition.ts#L21)

Per-transition animation parameters.

Used by [AnimatedQuantizer](AnimatedQuantizer.md) to drive interpolation between two
state output records. `duration` of `0` produces an instantaneous snap.

Plain `number` literals are accepted alongside branded [Millis](../../../liteship/src/schema/variables/Millis.md);
the resolver brands internally (the one sanctioned cast site lives in
`@liteship/core` brands), so `{ duration: 300 }` needs no import.

## Properties

### delay?

> `readonly` `optional` **delay?**: `number` \| [`Millis`](../../../spine/type-aliases/Millis.md)

Defined in: [quantizer/src/transition.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/transition.ts#L27)

Delay before the animation begins, in milliseconds (plain `number` or branded [Millis](../../../liteship/src/schema/variables/Millis.md)).

***

### duration

> `readonly` **duration**: `number` \| [`Millis`](../../../spine/type-aliases/Millis.md)

Defined in: [quantizer/src/transition.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/transition.ts#L23)

Animation duration in milliseconds (plain `number` or branded [Millis](../../../liteship/src/schema/variables/Millis.md)).

***

### easing?

> `readonly` `optional` **easing?**: `EasingFnShape`

Defined in: [quantizer/src/transition.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/transition.ts#L25)

Easing function applied to progress; defaults to linear.

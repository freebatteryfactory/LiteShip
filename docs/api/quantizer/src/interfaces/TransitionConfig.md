[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / TransitionConfig

# Interface: TransitionConfig

Defined in: [quantizer/src/transition.ts:21](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/transition.ts#L21)

Per-transition animation parameters.

Used by [AnimatedQuantizer](../namespaces/AnimatedQuantizer/README.md) to drive interpolation between two
state output records. `duration` of `0` produces an instantaneous snap.

Plain `number` literals are accepted alongside branded [Millis](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/Millis.md);
the resolver brands internally (the one sanctioned cast site lives in
`@czap/core` brands), so `{ duration: 300 }` needs no import.

## Properties

### delay?

> `readonly` `optional` **delay?**: `number` \| `Millis`

Defined in: [quantizer/src/transition.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/transition.ts#L27)

Delay before the animation begins, in milliseconds (plain `number` or branded [Millis](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/Millis.md)).

***

### duration

> `readonly` **duration**: `number` \| `Millis`

Defined in: [quantizer/src/transition.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/transition.ts#L23)

Animation duration in milliseconds (plain `number` or branded [Millis](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/Millis.md)).

***

### easing?

> `readonly` `optional` **easing?**: `EasingFnShape`

Defined in: [quantizer/src/transition.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/transition.ts#L25)

Easing function applied to progress; defaults to linear.

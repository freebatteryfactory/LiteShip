[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / CssMotionPlan

# Interface: CssMotionPlan

Defined in: [core/src/motion/interpret-transition.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L90)

CSS projection plan — keyframes / transition keyed on discrete state.

## Properties

### durationMs

> `readonly` **durationMs**: `number`

Defined in: [core/src/motion/interpret-transition.ts:97](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L97)

***

### fromState

> `readonly` **fromState**: [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/motion/interpret-transition.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L94)

***

### keyframes

> `readonly` **keyframes**: readonly [`CssKeyframeStep`](CssKeyframeStep.md)[]

Defined in: [core/src/motion/interpret-transition.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L99)

***

### nativeTimeline

> `readonly` **nativeTimeline**: [`NativeTimelineEligibility`](../type-aliases/NativeTimelineEligibility.md)

Defined in: [core/src/motion/interpret-transition.ts:108](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L108)

Whether this plan may own a native `animation-timeline`. `interpretTransition` always
mints the eligible verdict (a single transition is uniform by construction);
`interpretProgram` computes it from the composed windows — the ineligible
`mixed-easing-overlap` verdict when overlapping windows disagree on easing. The compiler
reads this to decide whether to emit the native ownership block.

***

### properties

> `readonly` **properties**: readonly [`MotionPropertyTween`](MotionPropertyTween.md)[]

Defined in: [core/src/motion/interpret-transition.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L96)

***

### routing

> `readonly` **routing**: [`EdgeType`](../type-aliases/EdgeType.md)

Defined in: [core/src/motion/interpret-transition.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L98)

***

### selector

> `readonly` **selector**: `string`

Defined in: [core/src/motion/interpret-transition.ts:93](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L93)

***

### target

> `readonly` **target**: `string`

Defined in: [core/src/motion/interpret-transition.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L92)

Original authored boundary identity; selectors are projections, never identity storage.

***

### toState

> `readonly` **toState**: [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/motion/interpret-transition.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L95)

***

### transitionProperty

> `readonly` **transitionProperty**: `string`

Defined in: [core/src/motion/interpret-transition.ts:100](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L100)

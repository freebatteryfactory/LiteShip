[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CssMotionPlan

# Interface: CssMotionPlan

Defined in: [core/src/motion/interpret-transition.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L83)

CSS projection plan — keyframes / transition keyed on discrete state.

## Properties

### durationMs

> `readonly` **durationMs**: `number`

Defined in: [core/src/motion/interpret-transition.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L88)

***

### fromState

> `readonly` **fromState**: [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/motion/interpret-transition.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L85)

***

### keyframes

> `readonly` **keyframes**: readonly [`CssKeyframeStep`](CssKeyframeStep.md)[]

Defined in: [core/src/motion/interpret-transition.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L90)

***

### nativeTimeline

> `readonly` **nativeTimeline**: [`NativeTimelineEligibility`](../type-aliases/NativeTimelineEligibility.md)

Defined in: [core/src/motion/interpret-transition.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L99)

Whether this plan may own a native `animation-timeline`. `interpretTransition` always
mints the eligible verdict (a single transition is uniform by construction);
`interpretProgram` computes it from the composed windows — the ineligible
`mixed-easing-overlap` verdict when overlapping windows disagree on easing. The compiler
reads this to decide whether to emit the native ownership block.

***

### properties

> `readonly` **properties**: readonly [`MotionPropertyTween`](MotionPropertyTween.md)[]

Defined in: [core/src/motion/interpret-transition.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L87)

***

### routing

> `readonly` **routing**: [`EdgeType`](../type-aliases/EdgeType.md)

Defined in: [core/src/motion/interpret-transition.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L89)

***

### selector

> `readonly` **selector**: `string`

Defined in: [core/src/motion/interpret-transition.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L84)

***

### toState

> `readonly` **toState**: [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/motion/interpret-transition.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L86)

***

### transitionProperty

> `readonly` **transitionProperty**: `string`

Defined in: [core/src/motion/interpret-transition.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L91)

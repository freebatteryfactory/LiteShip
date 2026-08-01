[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/motion](../README.md) / CssMotionPlan

# Interface: CssMotionPlan

Defined in: core/dist/motion/interpret-transition.d.ts:76

CSS projection plan — keyframes / transition keyed on discrete state.

## Properties

### durationMs

> `readonly` **durationMs**: `number`

Defined in: core/dist/motion/interpret-transition.d.ts:83

***

### fromState

> `readonly` **fromState**: [`StateName`](../../schema/type-aliases/StateName.md)

Defined in: core/dist/motion/interpret-transition.d.ts:80

***

### keyframes

> `readonly` **keyframes**: readonly [`CssKeyframeStep`](CssKeyframeStep.md)[]

Defined in: core/dist/motion/interpret-transition.d.ts:85

***

### nativeTimeline

> `readonly` **nativeTimeline**: [`NativeTimelineEligibility`](../type-aliases/NativeTimelineEligibility.md)

Defined in: core/dist/motion/interpret-transition.d.ts:94

Whether this plan may own a native `animation-timeline`. `interpretTransition` always
mints the eligible verdict (a single transition is uniform by construction);
`interpretProgram` computes it from the composed windows — the ineligible
`mixed-easing-overlap` verdict when overlapping windows disagree on easing. The compiler
reads this to decide whether to emit the native ownership block.

***

### properties

> `readonly` **properties**: readonly [`MotionPropertyTween`](MotionPropertyTween.md)[]

Defined in: core/dist/motion/interpret-transition.d.ts:82

***

### routing

> `readonly` **routing**: `EdgeType`

Defined in: core/dist/motion/interpret-transition.d.ts:84

***

### selector

> `readonly` **selector**: `string`

Defined in: core/dist/motion/interpret-transition.d.ts:79

***

### target

> `readonly` **target**: `string`

Defined in: core/dist/motion/interpret-transition.d.ts:78

Original authored boundary identity; selectors are projections, never identity storage.

***

### toState

> `readonly` **toState**: [`StateName`](../../schema/type-aliases/StateName.md)

Defined in: core/dist/motion/interpret-transition.d.ts:81

***

### transitionProperty

> `readonly` **transitionProperty**: `string`

Defined in: core/dist/motion/interpret-transition.d.ts:86

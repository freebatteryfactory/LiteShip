[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / RuntimeWriteWindow

# Interface: RuntimeWriteWindow

Defined in: [core/src/motion/interpret-transition.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L116)

A per-window runtime sub-sampler for a composed [TransitionProgram](../type-aliases/TransitionProgram.md): the
properties one transition tweens over its `[windowStart, windowEnd]` slice of the
global `[0,1]` timeline, with its OWN easing descriptor. Populated by
`interpretProgram`; absent on a single-step plan (the flat `properties`/`easing`
path). The `client:motion` floor samples these to scrub a multi-step chain.

## Properties

### easing

> `readonly` **easing**: [`RuntimeEasing`](RuntimeEasing.md)

Defined in: [core/src/motion/interpret-transition.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L120)

***

### properties

> `readonly` **properties**: readonly [`RuntimeWriteProperty`](RuntimeWriteProperty.md)[]

Defined in: [core/src/motion/interpret-transition.ts:119](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L119)

***

### windowEnd

> `readonly` **windowEnd**: `number`

Defined in: [core/src/motion/interpret-transition.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L118)

***

### windowStart

> `readonly` **windowStart**: `number`

Defined in: [core/src/motion/interpret-transition.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/interpret-transition.ts#L117)

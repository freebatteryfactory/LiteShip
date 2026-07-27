[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/motion](../README.md) / RuntimeWriteWindow

# Interface: RuntimeWriteWindow

Defined in: core/dist/motion/interpret-transition.d.ts:107

A per-window runtime sub-sampler for a composed [TransitionProgram](../type-aliases/TransitionProgram.md): the
properties one transition tweens over its `[windowStart, windowEnd]` slice of the
global `[0,1]` timeline, with its OWN easing descriptor. Populated by
`interpretProgram`; absent on a single-step plan (the flat `properties`/`easing`
path). The `client:motion` floor samples these to scrub a multi-step chain.

## Properties

### easing

> `readonly` **easing**: [`RuntimeEasing`](RuntimeEasing.md)

Defined in: core/dist/motion/interpret-transition.d.ts:111

***

### properties

> `readonly` **properties**: readonly [`RuntimeWriteProperty`](RuntimeWriteProperty.md)[]

Defined in: core/dist/motion/interpret-transition.d.ts:110

***

### windowEnd

> `readonly` **windowEnd**: `number`

Defined in: core/dist/motion/interpret-transition.d.ts:109

***

### windowStart

> `readonly` **windowStart**: `number`

Defined in: core/dist/motion/interpret-transition.d.ts:108

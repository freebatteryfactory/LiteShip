[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / RuntimeWriteWindow

# Interface: RuntimeWriteWindow

Defined in: [core/src/interpret-transition.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L80)

A per-window runtime sub-sampler for a composed [TransitionProgram](../type-aliases/TransitionProgram.md): the
properties one transition tweens over its `[windowStart, windowEnd]` slice of the
global `[0,1]` timeline, with its OWN easing descriptor. Populated by
`interpretProgram`; absent on a single-step plan (the flat `properties`/`easing`
path). The `client:motion` floor samples these to scrub a multi-step chain.

## Properties

### easing

> `readonly` **easing**: [`RuntimeEasing`](RuntimeEasing.md)

Defined in: [core/src/interpret-transition.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L84)

***

### properties

> `readonly` **properties**: readonly [`RuntimeWriteProperty`](RuntimeWriteProperty.md)[]

Defined in: [core/src/interpret-transition.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L83)

***

### windowEnd

> `readonly` **windowEnd**: `number`

Defined in: [core/src/interpret-transition.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L82)

***

### windowStart

> `readonly` **windowStart**: `number`

Defined in: [core/src/interpret-transition.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L81)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CssMotionPlan

# Interface: CssMotionPlan

Defined in: [core/src/interpret-transition.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L42)

CSS projection plan — keyframes / transition keyed on discrete state.

## Properties

### durationMs

> `readonly` **durationMs**: `number`

Defined in: [core/src/interpret-transition.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L47)

***

### fromState

> `readonly` **fromState**: [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/interpret-transition.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L44)

***

### keyframes

> `readonly` **keyframes**: readonly [`CssKeyframeStep`](CssKeyframeStep.md)[]

Defined in: [core/src/interpret-transition.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L49)

***

### properties

> `readonly` **properties**: readonly [`MotionPropertyTween`](MotionPropertyTween.md)[]

Defined in: [core/src/interpret-transition.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L46)

***

### routing

> `readonly` **routing**: [`EdgeType`](../type-aliases/EdgeType.md)

Defined in: [core/src/interpret-transition.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L48)

***

### selector

> `readonly` **selector**: `string`

Defined in: [core/src/interpret-transition.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L43)

***

### toState

> `readonly` **toState**: [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/interpret-transition.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L45)

***

### transitionProperty

> `readonly` **transitionProperty**: `string`

Defined in: [core/src/interpret-transition.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpret-transition.ts#L50)

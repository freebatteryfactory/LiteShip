[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [compiler/src](../README.md) / MotionTransitionFallbackSupport

# Interface: MotionTransitionFallbackSupport

Defined in: [compiler/src/motion.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L44)

Plan-specific truth about the last-resort CSS transition projection.

## Properties

### approximatedProperties

> `readonly` **approximatedProperties**: readonly `string`[]

Defined in: [compiler/src/motion.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L50)

Properties whose authored value path or easing cannot be represented faithfully.

***

### contract

> `readonly` **contract**: `"single-segment-monotonic-only"`

Defined in: [compiler/src/motion.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L46)

A CSS transition can faithfully express one monotonic point-to-point segment only.

***

### fidelity

> `readonly` **fidelity**: `"faithful-single-segment"` \| `"monotonic-endpoint-only"`

Defined in: [compiler/src/motion.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L48)

Whether this plan is exact in that tier or is reduced to its monotonic endpoint.

***

### returningProperties

> `readonly` **returningProperties**: readonly `string`[]

Defined in: [compiler/src/motion.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L52)

Approximated properties that leave and later return to their initial value.

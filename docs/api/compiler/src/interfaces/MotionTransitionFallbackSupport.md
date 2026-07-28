[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / MotionTransitionFallbackSupport

# Interface: MotionTransitionFallbackSupport

Defined in: [compiler/src/motion.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L43)

Plan-specific truth about the last-resort CSS transition projection.

## Properties

### approximatedProperties

> `readonly` **approximatedProperties**: readonly `string`[]

Defined in: [compiler/src/motion.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L49)

Properties whose authored value path or easing cannot be represented faithfully.

***

### contract

> `readonly` **contract**: `"single-segment-monotonic-only"`

Defined in: [compiler/src/motion.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L45)

A CSS transition can faithfully express one monotonic point-to-point segment only.

***

### fidelity

> `readonly` **fidelity**: `"faithful-single-segment"` \| `"monotonic-endpoint-only"`

Defined in: [compiler/src/motion.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L47)

Whether this plan is exact in that tier or is reduced to its monotonic endpoint.

***

### returningProperties

> `readonly` **returningProperties**: readonly `string`[]

Defined in: [compiler/src/motion.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/motion.ts#L51)

Approximated properties that leave and later return to their initial value.

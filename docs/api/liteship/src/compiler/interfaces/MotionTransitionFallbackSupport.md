[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / MotionTransitionFallbackSupport

# Interface: MotionTransitionFallbackSupport

Defined in: compiler/dist/motion.d.ts:28

Plan-specific truth about the last-resort CSS transition projection.

## Properties

### approximatedProperties

> `readonly` **approximatedProperties**: readonly `string`[]

Defined in: compiler/dist/motion.d.ts:34

Properties whose authored value path or easing cannot be represented faithfully.

***

### contract

> `readonly` **contract**: `"single-segment-monotonic-only"`

Defined in: compiler/dist/motion.d.ts:30

A CSS transition can faithfully express one monotonic point-to-point segment only.

***

### fidelity

> `readonly` **fidelity**: `"faithful-single-segment"` \| `"monotonic-endpoint-only"`

Defined in: compiler/dist/motion.d.ts:32

Whether this plan is exact in that tier or is reduced to its monotonic endpoint.

***

### returningProperties

> `readonly` **returningProperties**: readonly `string`[]

Defined in: compiler/dist/motion.d.ts:36

Approximated properties that leave and later return to their initial value.

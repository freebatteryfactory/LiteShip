[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / Millis

# Variable: Millis

> **Millis**: (`value`) => `Millis`

Defined in: core/dist/schema/brands.d.ts:39

Wrap a plain number as a Millis.

A duration cannot run backwards and `NaN`/`Infinity` are not realizable
delays, so the real invariant is finite and non-negative. Fractional values
are allowed (sub-millisecond timing). Use `Millis(0)` for immediate.

## Parameters

### value

`number`

## Returns

`Millis`

## Throws

`ValidationError` when `value` is negative or not finite.

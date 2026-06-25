[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Millis

# Variable: Millis

> **Millis**: (`value`) => `Millis`

Defined in: [core/src/brands.ts:60](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/brands.ts#L60)

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

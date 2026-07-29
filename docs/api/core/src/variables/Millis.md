[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / Millis

# Variable: Millis

> **Millis**: (`value`) => [`Millis`](../../../spine/type-aliases/Millis.md)

Defined in: [core/src/schema/brands.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/brands.ts#L60)

Wrap a plain number as a Millis.

A duration cannot run backwards and `NaN`/`Infinity` are not realizable
delays, so the real invariant is finite and non-negative. Fractional values
are allowed (sub-millisecond timing). Use `Millis(0)` for immediate.

## Parameters

### value

`number`

## Returns

[`Millis`](../../../spine/type-aliases/Millis.md)

## Throws

`ValidationError` when `value` is negative or not finite.

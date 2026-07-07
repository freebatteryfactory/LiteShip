[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / interpolateTyped

# Function: interpolateTyped()

> **interpolateTyped**(`from`, `to`, `eased`): [`TypedValue`](../type-aliases/TypedValue.md)

Defined in: [core/src/interpolate.ts:152](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/interpolate.ts#L152)

Interpolate two [TypedValue](../type-aliases/TypedValue.md)s within-kind. Cross-kind or unit-mismatch
interpolation is refused loudly — holds `to` and emits a diagnostic.

## Parameters

### from

[`TypedValue`](../type-aliases/TypedValue.md)

### to

[`TypedValue`](../type-aliases/TypedValue.md)

### eased

`number`

## Returns

[`TypedValue`](../type-aliases/TypedValue.md)

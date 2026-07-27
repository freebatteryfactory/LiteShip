[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / ThresholdValue

# Variable: ThresholdValue

> **ThresholdValue**: (`value`) => [`ThresholdValue`](../../../../spine/type-aliases/ThresholdValue.md)

Defined in: core/dist/schema/brands.d.ts:18

Wrap a plain number as a ThresholdValue.

A threshold is compared against a continuous signal value; `NaN`/`Infinity`
break the ordered comparison the boundary evaluator relies on (every
comparison with `NaN` is false). The range is signal-specific, so finiteness
is the real generic invariant.

## Parameters

### value

`number`

## Returns

[`ThresholdValue`](../../../../spine/type-aliases/ThresholdValue.md)

## Throws

`ValidationError` when `value` is not finite.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ThresholdValue

# Variable: ThresholdValue

> **ThresholdValue**: (`value`) => `ThresholdValue`

Defined in: [core/src/brands.ts:33](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/brands.ts#L33)

Wrap a plain number as a ThresholdValue.

A threshold is compared against a continuous signal value; `NaN`/`Infinity`
break the ordered comparison the boundary evaluator relies on (every
comparison with `NaN` is false). The range is signal-specific, so finiteness
is the real generic invariant.

## Parameters

### value

`number`

## Returns

`ThresholdValue`

## Throws

ValidationError when `value` is not finite.

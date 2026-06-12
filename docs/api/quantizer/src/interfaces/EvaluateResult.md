[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / EvaluateResult

# Interface: EvaluateResult\<S\>

Defined in: [quantizer/src/evaluate.ts:16](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/evaluate.ts#L16)

Result of quantizing a single numeric value against a boundary.

`crossed` is true only when `previousState` was supplied and differs
from the resolved state; it is the signal consumers use to emit
transition events and route side effects.

## Type Parameters

### S

`S` *extends* `string` = `string`

## Properties

### crossed

> `readonly` **crossed**: `boolean`

Defined in: [quantizer/src/evaluate.ts:24](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/evaluate.ts#L24)

Whether evaluation produced a change from `previousState`.

***

### index

> `readonly` **index**: `number`

Defined in: [quantizer/src/evaluate.ts:20](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/evaluate.ts#L20)

Index of `state` within the boundary's states tuple.

***

### state

> `readonly` **state**: `S`

Defined in: [quantizer/src/evaluate.ts:18](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/evaluate.ts#L18)

The resolved state literal.

***

### value

> `readonly` **value**: `number`

Defined in: [quantizer/src/evaluate.ts:22](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/evaluate.ts#L22)

The input value that was evaluated.

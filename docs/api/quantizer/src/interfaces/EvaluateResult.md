[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / EvaluateResult

# Interface: EvaluateResult\<S\>

Defined in: core/dist/authoring/types.d.ts:10

Rich result of evaluating one numeric value against a boundary.

## Type Parameters

### S

`S` *extends* `string` = `string`

## Properties

### crossed

> `readonly` **crossed**: `boolean`

Defined in: core/dist/authoring/types.d.ts:18

Whether evaluation produced a change from `previousState`.

***

### index

> `readonly` **index**: `number`

Defined in: core/dist/authoring/types.d.ts:14

Index of `state` within the boundary's states tuple.

***

### state

> `readonly` **state**: `S`

Defined in: core/dist/authoring/types.d.ts:12

The resolved state literal.

***

### value

> `readonly` **value**: `number`

Defined in: core/dist/authoring/types.d.ts:16

The input value that was evaluated.

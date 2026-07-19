[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / EvaluateResult

# Interface: EvaluateResult\<S\>

Defined in: core/dist/internal/type-level.d.ts:29

Result of evaluating a single numeric value against a boundary (the rich face
of `Boundary.evaluateResult`).

`crossed` is true only when `previousState` was supplied and differs from the
resolved state; consumers use it to emit transition events and route side
effects. `index` is the position of `state` within the boundary's states tuple.

## Type Parameters

### S

`S` *extends* `string` = `string`

## Properties

### crossed

> `readonly` **crossed**: `boolean`

Defined in: core/dist/internal/type-level.d.ts:37

Whether evaluation produced a change from `previousState`.

***

### index

> `readonly` **index**: `number`

Defined in: core/dist/internal/type-level.d.ts:33

Index of `state` within the boundary's states tuple.

***

### state

> `readonly` **state**: `S`

Defined in: core/dist/internal/type-level.d.ts:31

The resolved state literal.

***

### value

> `readonly` **value**: `number`

Defined in: core/dist/internal/type-level.d.ts:35

The input value that was evaluated.

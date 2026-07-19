[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / EvaluateResult

# Interface: EvaluateResult\<S\>

Defined in: [core/src/internal/type-level.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/internal/type-level.ts#L32)

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

Defined in: [core/src/internal/type-level.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/internal/type-level.ts#L40)

Whether evaluation produced a change from `previousState`.

***

### index

> `readonly` **index**: `number`

Defined in: [core/src/internal/type-level.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/internal/type-level.ts#L36)

Index of `state` within the boundary's states tuple.

***

### state

> `readonly` **state**: `S`

Defined in: [core/src/internal/type-level.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/internal/type-level.ts#L34)

The resolved state literal.

***

### value

> `readonly` **value**: `number`

Defined in: [core/src/internal/type-level.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/internal/type-level.ts#L38)

The input value that was evaluated.

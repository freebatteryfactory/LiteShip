[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / EvaluateResult

# Interface: EvaluateResult\<S\>

Defined in: [core/src/authoring/types.ts:14](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/types.ts#L14)

Rich result of evaluating one numeric value against a boundary.

## Type Parameters

### S

`S` *extends* `string` = `string`

## Properties

### crossed

> `readonly` **crossed**: `boolean`

Defined in: [core/src/authoring/types.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/types.ts#L22)

Whether evaluation produced a change from `previousState`.

***

### index

> `readonly` **index**: `number`

Defined in: [core/src/authoring/types.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/types.ts#L18)

Index of `state` within the boundary's states tuple.

***

### state

> `readonly` **state**: `S`

Defined in: [core/src/authoring/types.ts:16](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/types.ts#L16)

The resolved state literal.

***

### value

> `readonly` **value**: `number`

Defined in: [core/src/authoring/types.ts:20](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/types.ts#L20)

The input value that was evaluated.

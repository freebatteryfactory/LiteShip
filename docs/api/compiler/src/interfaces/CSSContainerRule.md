[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CSSContainerRule

# Interface: CSSContainerRule

Defined in: [compiler/src/css.ts:37](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/css.ts#L37)

A `@container` at-rule grouping rules that apply at a given container query.

Produced per-state by [CSSCompiler.compile](../variables/CSSCompiler.md#compile); the container `name`
is derived from the boundary's `input` identifier.

## Properties

### name

> `readonly` **name**: `string`

Defined in: [compiler/src/css.ts:39](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/css.ts#L39)

Container name (sanitized from the boundary input).

***

### query

> `readonly` **query**: `string`

Defined in: [compiler/src/css.ts:41](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/css.ts#L41)

Condition text like `(width >= 768px)`.

***

### rules

> `readonly` **rules**: readonly [`CSSRule`](CSSRule.md)[]

Defined in: [compiler/src/css.ts:43](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/css.ts#L43)

Rules evaluated inside the container query.

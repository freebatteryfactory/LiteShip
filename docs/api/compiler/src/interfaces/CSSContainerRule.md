[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CSSContainerRule

# Interface: CSSContainerRule

Defined in: [compiler/src/css.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L52)

A `@container` at-rule grouping rules that apply at a given container query.

Produced per-state by [CSSCompiler.compile](../variables/CSSCompiler.md#compile); the container `name`
is derived from the boundary's `input` identifier.

## Properties

### atRuleGroups?

> `readonly` `optional` **atRuleGroups?**: readonly [`CSSAtRuleGroup`](CSSAtRuleGroup.md)[]

Defined in: [compiler/src/css.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L60)

Nested `@supports` / `@media` groups inside the container block.

***

### name

> `readonly` **name**: `string`

Defined in: [compiler/src/css.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L54)

Container name (sanitized from the boundary input).

***

### query

> `readonly` **query**: `string`

Defined in: [compiler/src/css.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L56)

Condition text like `(width >= 768px)`.

***

### rules

> `readonly` **rules**: readonly [`CSSRule`](CSSRule.md)[]

Defined in: [compiler/src/css.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L58)

Rules evaluated inside the container query.

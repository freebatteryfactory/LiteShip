[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CSSContainerRule

# Interface: CSSContainerRule

Defined in: [compiler/src/css.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L49)

A `@container` at-rule grouping rules that apply at a given container query.

Produced per-state by [CSSCompiler.compile](../variables/CSSCompiler.md#compile); the container `name`
is derived from the boundary's `input` identifier.

## Properties

### atRuleGroups?

> `readonly` `optional` **atRuleGroups?**: readonly [`CSSAtRuleGroup`](CSSAtRuleGroup.md)[]

Defined in: [compiler/src/css.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L57)

Nested `@supports` / `@media` groups inside the container block.

***

### name

> `readonly` **name**: `string`

Defined in: [compiler/src/css.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L51)

Container name (sanitized from the boundary input).

***

### query

> `readonly` **query**: `string`

Defined in: [compiler/src/css.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L53)

Condition text like `(width >= 768px)`.

***

### rules

> `readonly` **rules**: readonly [`CSSRule`](CSSRule.md)[]

Defined in: [compiler/src/css.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L55)

Rules evaluated inside the container query.

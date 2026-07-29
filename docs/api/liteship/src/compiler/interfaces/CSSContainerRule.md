[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / CSSContainerRule

# Interface: CSSContainerRule

Defined in: compiler/dist/css.d.ts:42

A `@container` at-rule grouping rules that apply at a given container query.

Produced per-state by [CSSCompiler.compile](../variables/CSSCompiler.md#compile); the container `name`
is derived from the boundary's `input` identifier.

## Properties

### atRuleGroups?

> `readonly` `optional` **atRuleGroups?**: readonly [`CSSAtRuleGroup`](CSSAtRuleGroup.md)[]

Defined in: compiler/dist/css.d.ts:50

Nested `@supports` / `@media` groups inside the container block.

***

### name

> `readonly` **name**: `string`

Defined in: compiler/dist/css.d.ts:44

Container name (sanitized from the boundary input).

***

### query

> `readonly` **query**: `string`

Defined in: compiler/dist/css.d.ts:46

Condition text like `(width >= 768px)`.

***

### rules

> `readonly` **rules**: readonly [`CSSRule`](CSSRule.md)[]

Defined in: compiler/dist/css.d.ts:48

Rules evaluated inside the container query.

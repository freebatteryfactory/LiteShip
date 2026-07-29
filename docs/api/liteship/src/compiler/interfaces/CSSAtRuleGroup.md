[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / CSSAtRuleGroup

# Interface: CSSAtRuleGroup

Defined in: compiler/dist/css.d.ts:26

A nested `@supports` / `@media` group inside a state's container block.
Nested groups are preserved recursively (#110 — never silent-drop depth ≥ 2).

## Properties

### atRuleGroups?

> `readonly` `optional` **atRuleGroups?**: readonly `CSSAtRuleGroup`[]

Defined in: compiler/dist/css.d.ts:34

Nested conditional at-rule groups.

***

### bareProps?

> `readonly` `optional` **bareProps?**: `Record`\<`string`, `string`\>

Defined in: compiler/dist/css.d.ts:30

Declarations authored directly inside the at-rule.

***

### prelude

> `readonly` **prelude**: `string`

Defined in: compiler/dist/css.d.ts:28

The at-rule prelude exactly as authored.

***

### rules?

> `readonly` `optional` **rules?**: readonly [`CSSRule`](CSSRule.md)[]

Defined in: compiler/dist/css.d.ts:32

Nested selector rules inside the at-rule.

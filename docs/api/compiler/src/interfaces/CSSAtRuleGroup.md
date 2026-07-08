[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CSSAtRuleGroup

# Interface: CSSAtRuleGroup

Defined in: [compiler/src/css.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L35)

A nested `@supports` / `@media` group inside a state's container block.
Nested groups are preserved recursively (#110 — never silent-drop depth ≥ 2).

## Properties

### atRuleGroups?

> `readonly` `optional` **atRuleGroups?**: readonly `CSSAtRuleGroup`[]

Defined in: [compiler/src/css.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L43)

Nested conditional at-rule groups.

***

### bareProps?

> `readonly` `optional` **bareProps?**: `Record`\<`string`, `string`\>

Defined in: [compiler/src/css.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L39)

Declarations authored directly inside the at-rule.

***

### prelude

> `readonly` **prelude**: `string`

Defined in: [compiler/src/css.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L37)

The at-rule prelude exactly as authored.

***

### rules?

> `readonly` `optional` **rules?**: readonly [`CSSRule`](CSSRule.md)[]

Defined in: [compiler/src/css.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L41)

Nested selector rules inside the at-rule.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CSSAtRuleGroup

# Interface: CSSAtRuleGroup

Defined in: [compiler/src/css.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L34)

A nested `@supports` / `@media` group inside a state's container block.

## Properties

### bareProps?

> `readonly` `optional` **bareProps?**: `Record`\<`string`, `string`\>

Defined in: [compiler/src/css.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L38)

Declarations authored directly inside the at-rule.

***

### prelude

> `readonly` **prelude**: `string`

Defined in: [compiler/src/css.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L36)

The at-rule prelude exactly as authored.

***

### rules?

> `readonly` `optional` **rules?**: readonly [`CSSRule`](CSSRule.md)[]

Defined in: [compiler/src/css.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L40)

Nested selector rules inside the at-rule.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / QuantizeAtRuleGroup

# Interface: QuantizeAtRuleGroup

Defined in: [vite/src/css-quantize.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L38)

A nested `@supports` / `@media` group inside a `@quantize` state body.
Serialized inside the state's `@container` block as a real at-rule group.
Nested at-rule groups are preserved (depth ≥ 2); silent drop is forbidden (#110).

## Properties

### atRuleGroups?

> `readonly` `optional` **atRuleGroups?**: readonly `QuantizeAtRuleGroup`[]

Defined in: [vite/src/css-quantize.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L46)

Nested `@supports` / `@media` groups inside this at-rule (#110 depth ≥ 2).

***

### bareProps

> `readonly` **bareProps**: `Record`\<`string`, `string`\>

Defined in: [vite/src/css-quantize.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L42)

Declarations authored directly inside the at-rule (no nested selector).

***

### prelude

> `readonly` **prelude**: `string`

Defined in: [vite/src/css-quantize.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L40)

The at-rule prelude exactly as authored (e.g. `@supports (display: grid)`).

***

### rules

> `readonly` **rules**: readonly [`QuantizeNestedRule`](QuantizeNestedRule.md)[]

Defined in: [vite/src/css-quantize.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L44)

Nested selector rules inside the at-rule.

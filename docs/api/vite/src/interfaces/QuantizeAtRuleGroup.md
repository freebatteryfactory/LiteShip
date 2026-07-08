[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / QuantizeAtRuleGroup

# Interface: QuantizeAtRuleGroup

Defined in: [vite/src/css-quantize.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L41)

A nested `@supports` / `@media` group inside a `@quantize` state body.
Serialized inside the state's `@container` block as a real at-rule group.
Nested at-rule groups are preserved (depth ≥ 2); silent drop is forbidden (#110).

## Properties

### atRuleGroups?

> `readonly` `optional` **atRuleGroups?**: readonly `QuantizeAtRuleGroup`[]

Defined in: [vite/src/css-quantize.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L49)

Nested `@supports` / `@media` groups inside this at-rule (#110 depth ≥ 2).

***

### bareProps

> `readonly` **bareProps**: `Record`\<`string`, `string`\>

Defined in: [vite/src/css-quantize.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L45)

Declarations authored directly inside the at-rule (no nested selector).

***

### prelude

> `readonly` **prelude**: `string`

Defined in: [vite/src/css-quantize.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L43)

The at-rule prelude exactly as authored (e.g. `@supports (display: grid)`).

***

### rules

> `readonly` **rules**: readonly [`QuantizeNestedRule`](QuantizeNestedRule.md)[]

Defined in: [vite/src/css-quantize.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L47)

Nested selector rules inside the at-rule.

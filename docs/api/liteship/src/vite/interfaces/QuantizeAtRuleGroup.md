[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/vite](../README.md) / QuantizeAtRuleGroup

# Interface: QuantizeAtRuleGroup

Defined in: vite/dist/css-quantize.d.ts:16

A nested `@supports` / `@media` group inside a `@quantize` state body.
Serialized inside the state's `@container` block as a real at-rule group.
Nested at-rule groups are preserved (depth ≥ 2); silent drop is forbidden (#110).

## Properties

### atRuleGroups?

> `readonly` `optional` **atRuleGroups?**: readonly `QuantizeAtRuleGroup`[]

Defined in: vite/dist/css-quantize.d.ts:24

Nested `@supports` / `@media` groups inside this at-rule (#110 depth ≥ 2).

***

### bareProps

> `readonly` **bareProps**: `Record`\<`string`, `string`\>

Defined in: vite/dist/css-quantize.d.ts:20

Declarations authored directly inside the at-rule (no nested selector).

***

### prelude

> `readonly` **prelude**: `string`

Defined in: vite/dist/css-quantize.d.ts:18

The at-rule prelude exactly as authored (e.g. `@supports (display: grid)`).

***

### rules

> `readonly` **rules**: readonly [`QuantizeNestedRule`](QuantizeNestedRule.md)[]

Defined in: vite/dist/css-quantize.d.ts:22

Nested selector rules inside the at-rule.

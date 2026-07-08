[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / QuantizeAtRuleGroup

# Interface: QuantizeAtRuleGroup

Defined in: [vite/src/css-quantize.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L37)

A nested `@supports` / `@media` group inside a `@quantize` state body.
Serialized inside the state's `@container` block as a real at-rule group.

## Properties

### bareProps

> `readonly` **bareProps**: `Record`\<`string`, `string`\>

Defined in: [vite/src/css-quantize.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L41)

Declarations authored directly inside the at-rule (no nested selector).

***

### prelude

> `readonly` **prelude**: `string`

Defined in: [vite/src/css-quantize.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L39)

The at-rule prelude exactly as authored (e.g. `@supports (display: grid)`).

***

### rules

> `readonly` **rules**: readonly [`QuantizeNestedRule`](QuantizeNestedRule.md)[]

Defined in: [vite/src/css-quantize.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L43)

Nested selector rules inside the at-rule.

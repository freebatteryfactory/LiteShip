[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CSSStateBody

# Interface: CSSStateBody

Defined in: [compiler/src/css.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L69)

Structured per-state input for [CSSCompiler.compile](../variables/CSSCompiler.md#compile): bare
properties that style the boundary selector itself, plus nested rules
that each carry their own selector (the `@quantize` nested-selector
authoring form).

## Properties

### atRuleGroups?

> `readonly` `optional` **atRuleGroups?**: readonly [`CSSAtRuleGroup`](CSSAtRuleGroup.md)[]

Defined in: [compiler/src/css.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L75)

Nested `@supports` / `@media` groups inside the state (#110).

***

### bareProps?

> `readonly` `optional` **bareProps?**: `Record`\<`string`, `string`\>

Defined in: [compiler/src/css.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L71)

Properties applied to the boundary selector (the `selector` param, default `.liteship-boundary`).

***

### rules?

> `readonly` `optional` **rules?**: readonly [`CSSRule`](CSSRule.md)[]

Defined in: [compiler/src/css.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L73)

Per-selector rules emitted verbatim into the state's `@container` block.

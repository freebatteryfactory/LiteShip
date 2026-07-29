[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / CSSStateBody

# Interface: CSSStateBody

Defined in: compiler/dist/css.d.ts:58

Structured per-state input for [CSSCompiler.compile](../variables/CSSCompiler.md#compile): bare
properties that style the boundary selector itself, plus nested rules
that each carry their own selector (the `@quantize` nested-selector
authoring form).

## Properties

### atRuleGroups?

> `readonly` `optional` **atRuleGroups?**: readonly [`CSSAtRuleGroup`](CSSAtRuleGroup.md)[]

Defined in: compiler/dist/css.d.ts:64

Nested `@supports` / `@media` groups inside the state (#110).

***

### bareProps?

> `readonly` `optional` **bareProps?**: `Record`\<`string`, `string`\>

Defined in: compiler/dist/css.d.ts:60

Properties applied to the boundary selector (the `selector` param, default `.liteship-boundary`).

***

### rules?

> `readonly` `optional` **rules?**: readonly [`CSSRule`](CSSRule.md)[]

Defined in: compiler/dist/css.d.ts:62

Per-selector rules emitted verbatim into the state's `@container` block.

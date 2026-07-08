[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CSSStateBody

# Interface: CSSStateBody

Defined in: [compiler/src/css.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L66)

Structured per-state input for [CSSCompiler.compile](../variables/CSSCompiler.md#compile): bare
properties that style the boundary selector itself, plus nested rules
that each carry their own selector (the `@quantize` nested-selector
authoring form).

## Properties

### atRuleGroups?

> `readonly` `optional` **atRuleGroups?**: readonly [`CSSAtRuleGroup`](CSSAtRuleGroup.md)[]

Defined in: [compiler/src/css.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L72)

Nested `@supports` / `@media` groups inside the state (#110).

***

### bareProps?

> `readonly` `optional` **bareProps?**: `Record`\<`string`, `string`\>

Defined in: [compiler/src/css.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L68)

Properties applied to the boundary selector (the `selector` param, default `.czap-boundary`).

***

### rules?

> `readonly` `optional` **rules?**: readonly [`CSSRule`](CSSRule.md)[]

Defined in: [compiler/src/css.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/css.ts#L70)

Per-selector rules emitted verbatim into the state's `@container` block.

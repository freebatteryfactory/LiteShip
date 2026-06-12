[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CSSStateBody

# Interface: CSSStateBody

Defined in: [compiler/src/css.ts:52](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/css.ts#L52)

Structured per-state input for [CSSCompiler.compile](../variables/CSSCompiler.md#compile): bare
properties that style the boundary selector itself, plus nested rules
that each carry their own selector (the `@quantize` nested-selector
authoring form).

## Properties

### bareProps?

> `readonly` `optional` **bareProps?**: `Record`\<`string`, `string`\>

Defined in: [compiler/src/css.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/css.ts#L54)

Properties applied to the boundary selector (the `selector` param, default `.czap-boundary`).

***

### rules?

> `readonly` `optional` **rules?**: readonly [`CSSRule`](CSSRule.md)[]

Defined in: [compiler/src/css.ts:56](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/css.ts#L56)

Per-selector rules emitted verbatim into the state's `@container` block.

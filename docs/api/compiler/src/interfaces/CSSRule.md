[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CSSRule

# Interface: CSSRule

Defined in: [compiler/src/css.ts:24](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/css.ts#L24)

A single CSS rule — a selector plus a property map.

Emitted inside a [CSSContainerRule](CSSContainerRule.md) by [CSSCompiler.compile](../variables/CSSCompiler.md#compile).

## Properties

### properties

> `readonly` **properties**: `Record`\<`string`, `string`\>

Defined in: [compiler/src/css.ts:28](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/css.ts#L28)

Flat property map applied inside the selector block.

***

### selector

> `readonly` **selector**: `string`

Defined in: [compiler/src/css.ts:26](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/css.ts#L26)

CSS selector (e.g. `.card`, `[data-state="open"]`).

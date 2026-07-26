[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / CSSRule

# Interface: CSSRule

Defined in: compiler/dist/css.d.ts:16

A single CSS rule — a selector plus a property map.

Emitted inside a [CSSContainerRule](CSSContainerRule.md) by [CSSCompiler.compile](../variables/CSSCompiler.md#compile).

## Properties

### properties

> `readonly` **properties**: `Record`\<`string`, `string`\>

Defined in: compiler/dist/css.d.ts:20

Flat property map applied inside the selector block.

***

### selector

> `readonly` **selector**: `string`

Defined in: compiler/dist/css.d.ts:18

CSS selector (e.g. `.card`, `[data-state="open"]`).

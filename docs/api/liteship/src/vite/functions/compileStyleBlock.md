[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/vite](../README.md) / compileStyleBlock

# Function: compileStyleBlock()

> **compileStyleBlock**(`block`, `style`): `string`

Defined in: vite/dist/style-transform.d.ts:58

Compile a parsed [StyleBlock](../interfaces/StyleBlock.md) plus a resolved `StyleDef` into
scoped CSS with `@layer`, `@scope`, and `@starting-style` rules.
Delegates to the canonical `StyleCSSCompiler` to avoid duplicating
style-to-CSS logic.

## Parameters

### block

[`StyleBlock`](../interfaces/StyleBlock.md)

### style

[`Style`](../../type-aliases/Style.md)

## Returns

`string`

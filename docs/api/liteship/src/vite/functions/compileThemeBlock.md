[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/vite](../README.md) / compileThemeBlock

# Function: compileThemeBlock()

> **compileThemeBlock**(`block`, `theme`): `string`

Defined in: vite/dist/theme-transform.d.ts:51

Compile a parsed [ThemeBlock](../interfaces/ThemeBlock.md) plus a resolved `ThemeDef` into
`html[data-theme]` selector blocks and transition declarations.
Delegates to the canonical `ThemeCSSCompiler` to avoid duplicating
theme-to-CSS logic.

## Parameters

### block

[`ThemeBlock`](../interfaces/ThemeBlock.md)

### theme

[`Theme`](../../type-aliases/Theme.md)

## Returns

`string`

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / compileThemeBlock

# Function: compileThemeBlock()

> **compileThemeBlock**(`block`, `theme`): `string`

Defined in: [vite/src/theme-transform.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/theme-transform.ts#L90)

Compile a parsed [ThemeBlock](../interfaces/ThemeBlock.md) plus a resolved `ThemeDef` into
`html[data-theme]` selector blocks and transition declarations.
Delegates to the canonical `ThemeCSSCompiler` to avoid duplicating
theme-to-CSS logic.

## Parameters

### block

[`ThemeBlock`](../interfaces/ThemeBlock.md)

### theme

[`Theme`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/Theme.md)

## Returns

`string`

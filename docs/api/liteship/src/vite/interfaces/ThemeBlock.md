[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/vite](../README.md) / ThemeBlock

# Interface: ThemeBlock

Defined in: vite/dist/theme-transform.d.ts:15

Parsed `@theme` block: the theme to apply and any inline token
overrides declared on the block itself.

## Properties

### declarations

> `readonly` **declarations**: `Record`\<`string`, `string`\>

Defined in: vite/dist/theme-transform.d.ts:19

Inline token overrides (`{ tokenName: value }`).

***

### line

> `readonly` **line**: `number`

Defined in: vite/dist/theme-transform.d.ts:23

1-based line where the block begins.

***

### sourceFile

> `readonly` **sourceFile**: `string`

Defined in: vite/dist/theme-transform.d.ts:21

Absolute source file path.

***

### themeName

> `readonly` **themeName**: `string`

Defined in: vite/dist/theme-transform.d.ts:17

Named theme (resolved against exported `ThemeDef` values).

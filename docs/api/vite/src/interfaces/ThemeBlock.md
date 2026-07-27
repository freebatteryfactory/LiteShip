[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / ThemeBlock

# Interface: ThemeBlock

Defined in: [vite/src/theme-transform.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/theme-transform.ts#L28)

Parsed `@theme` block: the theme to apply and any inline token
overrides declared on the block itself.

## Properties

### declarations

> `readonly` **declarations**: `Record`\<`string`, `string`\>

Defined in: [vite/src/theme-transform.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/theme-transform.ts#L32)

Inline token overrides (`{ tokenName: value }`).

***

### line

> `readonly` **line**: `number`

Defined in: [vite/src/theme-transform.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/theme-transform.ts#L36)

1-based line where the block begins.

***

### sourceFile

> `readonly` **sourceFile**: `string`

Defined in: [vite/src/theme-transform.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/theme-transform.ts#L34)

Absolute source file path.

***

### themeName

> `readonly` **themeName**: `string`

Defined in: [vite/src/theme-transform.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/theme-transform.ts#L30)

Named theme (resolved against exported `ThemeDef` values).

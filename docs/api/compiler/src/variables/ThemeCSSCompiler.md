[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / ThemeCSSCompiler

# Variable: ThemeCSSCompiler

> `const` **ThemeCSSCompiler**: `object`

Defined in: [compiler/src/theme-css.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/theme-css.ts#L99)

Theme CSS compiler namespace.

Serializes a [Theme](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/Theme.md) into `html[data-theme="…"]` selector
overrides of `--liteship-*` custom properties and, when theme metadata
requests it, a `:root` transition block that animates all theme
property changes.

## Type Declaration

### compile

> **compile**: (`theme`) => [`ThemeCSSResult`](../interfaces/ThemeCSSResult.md)

Compile a theme definition into per-variant selector blocks.

Compile a [Theme](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/Theme.md) into per-variant selector blocks and optional
root transitions.

#### Parameters

##### theme

[`Theme`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/Theme.md)

#### Returns

[`ThemeCSSResult`](../interfaces/ThemeCSSResult.md)

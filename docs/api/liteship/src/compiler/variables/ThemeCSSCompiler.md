[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / ThemeCSSCompiler

# Variable: ThemeCSSCompiler

> `const` **ThemeCSSCompiler**: `object`

Defined in: compiler/dist/theme-css.d.ts:37

Theme CSS compiler namespace.

Serializes a [Theme](../../type-aliases/Theme.md) into `html[data-theme="…"]` selector
overrides of `--liteship-*` custom properties and, when theme metadata
requests it, a `:root` transition block that animates all theme
property changes.

## Type Declaration

### compile

> `readonly` **compile**: *typeof* `compile`

Compile a theme definition into per-variant selector blocks.

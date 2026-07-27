[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / TokenCSSCompiler

# Variable: TokenCSSCompiler

> `const` **TokenCSSCompiler**: `object`

Defined in: compiler/dist/token-css.d.ts:40

Token CSS compiler namespace.

Compiles a single [Token](../../type-aliases/Token.md) into its CSS custom property
definitions (with optional `@property` registration for animatable
values) and, when a theme is supplied, the per-variant override blocks.

## Type Declaration

### compile

> `readonly` **compile**: *typeof* `compile`

Compile a token (optionally with theme overrides) into CSS.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [compiler/src](../README.md) / TokenCSSCompiler

# Variable: TokenCSSCompiler

> `const` **TokenCSSCompiler**: `object`

Defined in: [compiler/src/token-css.ts:137](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/token-css.ts#L137)

Token CSS compiler namespace.

Compiles a single [Token](../../../liteship/src/type-aliases/Token.md) into its CSS custom property
definitions (with optional `@property` registration for animatable
values) and, when a theme is supplied, the per-variant override blocks.

## Type Declaration

### compile

> **compile**: (`token`, `theme?`) => [`TokenCSSResult`](../interfaces/TokenCSSResult.md)

Compile a token (optionally with theme overrides) into CSS.

Compile a single [Token](../../../liteship/src/type-aliases/Token.md) into CSS custom property definitions.

Emits any applicable `@property` registration, the `:root` fallback, and
(when a `theme` is supplied) per-variant override selectors.

#### Parameters

##### token

[`Token`](../../../liteship/src/type-aliases/Token.md)

##### theme?

[`Theme`](../../../liteship/src/type-aliases/Theme.md)

#### Returns

[`TokenCSSResult`](../interfaces/TokenCSSResult.md)

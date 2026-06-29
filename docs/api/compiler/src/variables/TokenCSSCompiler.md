[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / TokenCSSCompiler

# Variable: TokenCSSCompiler

> `const` **TokenCSSCompiler**: `object`

Defined in: [compiler/src/token-css.ts:137](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/token-css.ts#L137)

Token CSS compiler namespace.

Compiles a single [Token.Shape](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/namespaces/Token/type-aliases/Shape.md) into its CSS custom property
definitions (with optional `@property` registration for animatable
values) and, when a theme is supplied, the per-variant override blocks.

## Type Declaration

### compile

> **compile**: (`token`, `theme?`) => [`TokenCSSResult`](../interfaces/TokenCSSResult.md)

Compile a token (optionally with theme overrides) into CSS.

Compile a single [Token.Shape](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/namespaces/Token/type-aliases/Shape.md) into CSS custom property definitions.

Emits any applicable `@property` registration, the `:root` fallback, and
(when a `theme` is supplied) per-variant override selectors.

#### Parameters

##### token

[`Shape`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/namespaces/Token/type-aliases/Shape.md)

##### theme?

[`Shape`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/namespaces/Theme/type-aliases/Shape.md)\<readonly `string`[]\>

#### Returns

[`TokenCSSResult`](../interfaces/TokenCSSResult.md)

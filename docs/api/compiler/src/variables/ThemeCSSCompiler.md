[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / ThemeCSSCompiler

# Variable: ThemeCSSCompiler

> `const` **ThemeCSSCompiler**: `object`

Defined in: [compiler/src/theme-css.ts:99](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/theme-css.ts#L99)

Theme CSS compiler namespace.

Serializes a [Theme.Shape](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Theme/type-aliases/Shape.md) into `html[data-theme="…"]` selector
overrides of `--czap-*` custom properties and, when theme metadata
requests it, a `:root` transition block that animates all theme
property changes.

## Type Declaration

### compile

> **compile**: (`theme`) => [`ThemeCSSResult`](../interfaces/ThemeCSSResult.md)

Compile a theme definition into per-variant selector blocks.

Compile a [Theme.Shape](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Theme/type-aliases/Shape.md) into per-variant selector blocks and optional
root transitions.

#### Parameters

##### theme

[`Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Theme/type-aliases/Shape.md)

#### Returns

[`ThemeCSSResult`](../interfaces/ThemeCSSResult.md)

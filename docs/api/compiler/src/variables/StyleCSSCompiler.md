[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / StyleCSSCompiler

# Variable: StyleCSSCompiler

> `const` **StyleCSSCompiler**: `object`

Defined in: [compiler/src/style-css.ts:203](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/style-css.ts#L203)

Style CSS compiler namespace.

Compiles a [Style](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/Style.md) into cascade-layered, scoped CSS using
`@layer`, `@scope`, `@starting-style`, and `@container` — the modern CSS
features that let liteship deliver component isolation and state-driven
restyling without runtime class toggling.

## Type Declaration

### compile

> **compile**: (`style`, `componentName?`) => [`StyleCSSResult`](../interfaces/StyleCSSResult.md)

Compile a style definition into scoped, layered CSS.

Compile a [Style](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/Style.md) into layered, scoped CSS.

When `componentName` is supplied the output is wrapped in an `@scope`
block targeting `.liteship-<name>` and bounded at `[data-liteship-slot]`
children. Boundary states are compiled into nested `@container` rules
via the core [CSSCompiler](CSSCompiler.md).

#### Parameters

##### style

[`Style`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/Style.md)

##### componentName?

`string`

#### Returns

[`StyleCSSResult`](../interfaces/StyleCSSResult.md)

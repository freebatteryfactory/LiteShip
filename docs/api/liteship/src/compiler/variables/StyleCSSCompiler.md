[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / StyleCSSCompiler

# Variable: StyleCSSCompiler

> `const` **StyleCSSCompiler**: `object`

Defined in: compiler/dist/style-css.d.ts:61

Style CSS compiler namespace.

Compiles a [Style](../../type-aliases/Style.md) into cascade-layered, scoped CSS using
`@layer`, `@scope`, `@starting-style`, and `@container` — the modern CSS
features that let liteship deliver component isolation and state-driven
restyling without runtime class toggling.

## Type Declaration

### compile

> `readonly` **compile**: *typeof* `compile`

Compile a style definition into scoped, layered CSS.

### compileAdaptive

> `readonly` **compileAdaptive**: *typeof* `compileAdaptive`

Compile a self-contained Adaptive projection driven by `data-liteship-state`.

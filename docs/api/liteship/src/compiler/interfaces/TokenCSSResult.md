[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / TokenCSSResult

# Interface: TokenCSSResult

Defined in: compiler/dist/token-css.d.ts:18

Output of [TokenCSSCompiler.compile](../variables/TokenCSSCompiler.md#compile).

`properties` is the list of CSS custom property names emitted for this
token (usually one). `customProperties` bundles any `@property`
registrations and the `:root` fallback block. `themed` contains
per-variant override blocks derived from an optional theme.

## Properties

### customProperties

> `readonly` **customProperties**: `string`

Defined in: compiler/dist/token-css.d.ts:22

`@property` registrations plus the `:root { … }` fallback block.

***

### properties

> `readonly` **properties**: readonly `string`[]

Defined in: compiler/dist/token-css.d.ts:20

CSS custom property names emitted for this token.

***

### themed

> `readonly` **themed**: `string`

Defined in: compiler/dist/token-css.d.ts:24

`html[data-theme="…"]` override blocks (empty when no theme supplied).

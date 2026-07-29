[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / TokenTailwindCompiler

# Variable: TokenTailwindCompiler

> `const` **TokenTailwindCompiler**: `object`

Defined in: compiler/dist/token-tailwind.d.ts:35

Token Tailwind compiler namespace.

Adapts a `@liteship/core` token set to Tailwind v4's CSS-first theming
pipeline by emitting a single `@theme { }` block with the category
prefixes Tailwind expects (`--color-`, `--spacing-`, `--font-`, …).

## Type Declaration

### compile

> `readonly` **compile**: *typeof* `compile`

Compile a token array into a Tailwind v4 `@theme` block.

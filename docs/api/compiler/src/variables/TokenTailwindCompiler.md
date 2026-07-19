[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / TokenTailwindCompiler

# Variable: TokenTailwindCompiler

> `const` **TokenTailwindCompiler**: `object`

Defined in: [compiler/src/token-tailwind.ts:127](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/token-tailwind.ts#L127)

Token Tailwind compiler namespace.

Adapts a `@liteship/core` token set to Tailwind v4's CSS-first theming
pipeline by emitting a single `@theme { }` block with the category
prefixes Tailwind expects (`--color-`, `--spacing-`, `--font-`, …).

## Type Declaration

### compile

> **compile**: (`tokens`) => [`TokenTailwindResult`](../interfaces/TokenTailwindResult.md)

Compile a token array into a Tailwind v4 `@theme` block.

Compile a list of [Token.Shape](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/namespaces/Token/type-aliases/Shape.md) into a Tailwind v4 `@theme` block.

Tokens are grouped by category with a short comment separator so the
generated CSS remains human-readable alongside hand-authored Tailwind.

#### Parameters

##### tokens

readonly [`Shape`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/namespaces/Token/type-aliases/Shape.md)\<`string`, readonly `string`[]\>[]

#### Returns

[`TokenTailwindResult`](../interfaces/TokenTailwindResult.md)

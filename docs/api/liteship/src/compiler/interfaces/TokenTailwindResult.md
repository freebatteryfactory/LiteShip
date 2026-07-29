[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / TokenTailwindResult

# Interface: TokenTailwindResult

Defined in: compiler/dist/token-tailwind.d.ts:17

Output of [TokenTailwindCompiler.compile](../variables/TokenTailwindCompiler.md#compile).

Tailwind v4's CSS-first pipeline consumes the emitted `@theme { }` block
verbatim; there are no structured side outputs because Tailwind only
needs the declarations text.

## Properties

### themeBlock

> `readonly` **themeBlock**: `string`

Defined in: compiler/dist/token-tailwind.d.ts:19

Complete `@theme { … }` block ready for a Tailwind v4 entry CSS file.

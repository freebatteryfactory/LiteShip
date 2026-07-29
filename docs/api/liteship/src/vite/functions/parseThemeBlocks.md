[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/vite](../README.md) / parseThemeBlocks

# Function: parseThemeBlocks()

> **parseThemeBlocks**(`css`, `sourceFile`): readonly [`ThemeBlock`](../interfaces/ThemeBlock.md)[]

Defined in: vite/dist/theme-transform.d.ts:44

Parse every `@theme` block from CSS source text.

Grammar (the block may collapse onto a single line and may sit
mid-line, e.g. inside compiler-re-serialized CSS):

```css
@theme name {
  tokenName: value;
}
```

At-rule markers are located on a comment- and string-blanked copy of
the source (same offsets) so neither commented-out blocks nor marker
text inside string values or data URLs ever match; declarations are
parsed character-by-character from the original source, so real
string values are preserved. Token names additionally accept
underscores (e.g. `accent_color`).

## Parameters

### css

`string`

### sourceFile

`string`

## Returns

readonly [`ThemeBlock`](../interfaces/ThemeBlock.md)[]

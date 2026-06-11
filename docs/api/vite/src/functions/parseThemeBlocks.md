[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / parseThemeBlocks

# Function: parseThemeBlocks()

> **parseThemeBlocks**(`css`, `sourceFile`): readonly [`ThemeBlock`](../interfaces/ThemeBlock.md)[]

Defined in: [vite/src/theme-transform.ts:56](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/theme-transform.ts#L56)

Parse every `@theme` block from CSS source text.

Grammar (the block may collapse onto a single line and may sit
mid-line, e.g. inside compiler-re-serialized CSS):

```css
@theme name {
  tokenName: value;
}
```

At-rule markers are located on a comment-blanked copy of the source
(same offsets) so commented-out blocks never match; declarations are
parsed character-by-character from the original source. Token names
additionally accept underscores (e.g. `accent_color`).

## Parameters

### css

`string`

### sourceFile

`string`

## Returns

readonly [`ThemeBlock`](../interfaces/ThemeBlock.md)[]

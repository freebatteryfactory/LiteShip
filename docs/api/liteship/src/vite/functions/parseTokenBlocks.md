[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/vite](../README.md) / parseTokenBlocks

# Function: parseTokenBlocks()

> **parseTokenBlocks**(`css`, `sourceFile`): readonly [`TokenBlock`](../interfaces/TokenBlock.md)[]

Defined in: vite/dist/token-transform.d.ts:42

Parse every `@token` block from CSS source text.

Grammar (the block may collapse onto a single line and may sit
mid-line, e.g. inside compiler-re-serialized CSS):

```css
@token name {
  property: value;
}
```

At-rule markers are located on a comment- and string-blanked copy of
the source (same offsets) so neither commented-out blocks nor marker
text inside string values or data URLs ever match; declarations are
parsed character-by-character from the original source, so real
string values are preserved.

## Parameters

### css

`string`

### sourceFile

`string`

## Returns

readonly [`TokenBlock`](../interfaces/TokenBlock.md)[]

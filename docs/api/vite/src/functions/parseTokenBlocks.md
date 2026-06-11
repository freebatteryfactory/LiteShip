[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / parseTokenBlocks

# Function: parseTokenBlocks()

> **parseTokenBlocks**(`css`, `sourceFile`): readonly [`TokenBlock`](../interfaces/TokenBlock.md)[]

Defined in: [vite/src/token-transform.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/token-transform.ts#L54)

Parse every `@token` block from CSS source text.

Grammar (the block may collapse onto a single line and may sit
mid-line, e.g. inside compiler-re-serialized CSS):

```css
@token name {
  property: value;
}
```

At-rule markers are located on a comment-blanked copy of the source
(same offsets) so commented-out blocks never match; declarations are
parsed character-by-character from the original source.

## Parameters

### css

`string`

### sourceFile

`string`

## Returns

readonly [`TokenBlock`](../interfaces/TokenBlock.md)[]

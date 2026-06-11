[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / parseStyleBlocks

# Function: parseStyleBlocks()

> **parseStyleBlocks**(`css`, `sourceFile`): readonly [`StyleBlock`](../interfaces/StyleBlock.md)[]

Defined in: [vite/src/style-transform.ts:70](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/style-transform.ts#L70)

Parse every `@style` block from CSS source text.

Grammar:

```css
@style name {
  stateName {
    property: value;
  }
}
```

Parsing is fully character-level via the shared `css-scan` helpers
(same scanner as `@token` / `@theme` / `@quantize`): upstream
compilers (e.g. the Astro compiler re-serializing a `<style>` block)
emit at-rules mid-line and collapse whole sheets onto a single line,
so no line structure is assumed. At-rule markers are located on a
comment- and string-blanked copy of the source (same offsets) so
neither commented-out blocks nor marker text inside string values or
data URLs ever match; state bodies are parsed from the original
source with comment / string / functional-notation awareness,
including multi-line values.

## Parameters

### css

`string`

### sourceFile

`string`

## Returns

readonly [`StyleBlock`](../interfaces/StyleBlock.md)[]

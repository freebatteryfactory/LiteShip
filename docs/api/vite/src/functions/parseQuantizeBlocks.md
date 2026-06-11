[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / parseQuantizeBlocks

# Function: parseQuantizeBlocks()

> **parseQuantizeBlocks**(`css`, `sourceFile`): readonly [`QuantizeBlock`](../interfaces/QuantizeBlock.md)[]

Defined in: [vite/src/css-quantize.ts:227](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L227)

Parse every `@quantize` block from CSS source text.

Grammar (states accept bare declarations, nested selector rules, or
both):

```css
@quantize boundaryName {
  stateName {
    property: value;
    .selector {
      property: value;
    }
  }
}
```

Parsing is fully character-level: upstream compilers (e.g. the Astro
compiler re-serializing a `<style>` block) emit at-rules mid-line and
collapse whole sheets onto a single line, so no line structure is
assumed. At-rule markers are located on a comment-blanked copy of the
source (same offsets) so commented-out blocks never match; bodies are
parsed from the original source with comment / string / functional-
notation awareness, including multi-line values and nested
`<selector> { ... }` rules.

## Parameters

### css

`string`

### sourceFile

`string`

## Returns

readonly [`QuantizeBlock`](../interfaces/QuantizeBlock.md)[]

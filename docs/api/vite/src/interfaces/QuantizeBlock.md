[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / QuantizeBlock

# Interface: QuantizeBlock

Defined in: [vite/src/css-quantize.ts:62](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L62)

A single parsed `@quantize` block: the boundary being quantised, the
per-state bodies, and provenance info so HMR can emit
source-mapped warnings.

## Properties

### boundaryName

> `readonly` **boundaryName**: `string`

Defined in: [vite/src/css-quantize.ts:64](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L64)

Boundary name referenced in the at-rule preamble.

***

### line

> `readonly` **line**: `number`

Defined in: [vite/src/css-quantize.ts:70](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L70)

1-based source line where the block begins.

***

### sourceFile

> `readonly` **sourceFile**: `string`

Defined in: [vite/src/css-quantize.ts:68](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L68)

Absolute path of the CSS source file.

***

### states

> `readonly` **states**: `Record`\<`string`, [`QuantizeStateBody`](QuantizeStateBody.md)\>

Defined in: [vite/src/css-quantize.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L66)

`{ stateName: { bareProps, rules } }` mapping.

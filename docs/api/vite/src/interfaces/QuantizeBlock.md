[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / QuantizeBlock

# Interface: QuantizeBlock

Defined in: [vite/src/css-quantize.ts:55](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L55)

A single parsed `@quantize` block: the boundary being quantised, the
per-state bodies, and provenance info so HMR can emit
source-mapped warnings.

## Properties

### boundaryName

> `readonly` **boundaryName**: `string`

Defined in: [vite/src/css-quantize.ts:57](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L57)

Boundary name referenced in the at-rule preamble.

***

### line

> `readonly` **line**: `number`

Defined in: [vite/src/css-quantize.ts:63](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L63)

1-based source line where the block begins.

***

### sourceFile

> `readonly` **sourceFile**: `string`

Defined in: [vite/src/css-quantize.ts:61](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L61)

Absolute path of the CSS source file.

***

### states

> `readonly` **states**: `Record`\<`string`, [`QuantizeStateBody`](QuantizeStateBody.md)\>

Defined in: [vite/src/css-quantize.ts:59](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L59)

`{ stateName: { bareProps, rules } }` mapping.

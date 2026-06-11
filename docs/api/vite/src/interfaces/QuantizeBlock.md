[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / QuantizeBlock

# Interface: QuantizeBlock

Defined in: [vite/src/css-quantize.ts:48](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L48)

A single parsed `@quantize` block: the boundary being quantised, the
per-state bodies, and provenance info so HMR can emit
source-mapped warnings.

## Properties

### boundaryName

> `readonly` **boundaryName**: `string`

Defined in: [vite/src/css-quantize.ts:50](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L50)

Boundary name referenced in the at-rule preamble.

***

### line

> `readonly` **line**: `number`

Defined in: [vite/src/css-quantize.ts:56](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L56)

1-based source line where the block begins.

***

### sourceFile

> `readonly` **sourceFile**: `string`

Defined in: [vite/src/css-quantize.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L54)

Absolute path of the CSS source file.

***

### states

> `readonly` **states**: `Record`\<`string`, [`QuantizeStateBody`](QuantizeStateBody.md)\>

Defined in: [vite/src/css-quantize.ts:52](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L52)

`{ stateName: { bareProps, rules } }` mapping.

[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/vite](../README.md) / QuantizeBlock

# Interface: QuantizeBlock

Defined in: vite/dist/css-quantize.d.ts:92

A single parsed `@quantize` block: the boundary being quantised, the
per-state bodies, and provenance info so HMR can emit
source-mapped warnings.

## Properties

### boundaryName

> `readonly` **boundaryName**: `string`

Defined in: vite/dist/css-quantize.d.ts:94

Boundary name referenced in the at-rule preamble.

***

### line

> `readonly` **line**: `number`

Defined in: vite/dist/css-quantize.d.ts:100

1-based source line where the block begins.

***

### sourceFile

> `readonly` **sourceFile**: `string`

Defined in: vite/dist/css-quantize.d.ts:98

Absolute path of the CSS source file.

***

### states

> `readonly` **states**: `Record`\<`string`, [`QuantizeStateBody`](QuantizeStateBody.md)\>

Defined in: vite/dist/css-quantize.d.ts:96

`{ stateName: { bareProps, rules } }` mapping.

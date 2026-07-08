[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / QuantizeBlock

# Interface: QuantizeBlock

Defined in: [vite/src/css-quantize.ts:136](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L136)

A single parsed `@quantize` block: the boundary being quantised, the
per-state bodies, and provenance info so HMR can emit
source-mapped warnings.

## Properties

### boundaryName

> `readonly` **boundaryName**: `string`

Defined in: [vite/src/css-quantize.ts:138](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L138)

Boundary name referenced in the at-rule preamble.

***

### line

> `readonly` **line**: `number`

Defined in: [vite/src/css-quantize.ts:144](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L144)

1-based source line where the block begins.

***

### sourceFile

> `readonly` **sourceFile**: `string`

Defined in: [vite/src/css-quantize.ts:142](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L142)

Absolute path of the CSS source file.

***

### states

> `readonly` **states**: `Record`\<`string`, [`QuantizeStateBody`](QuantizeStateBody.md)\>

Defined in: [vite/src/css-quantize.ts:140](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L140)

`{ stateName: { bareProps, rules } }` mapping.

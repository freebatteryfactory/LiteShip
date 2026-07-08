[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / QuantizeBlock

# Interface: QuantizeBlock

Defined in: [vite/src/css-quantize.ts:133](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L133)

A single parsed `@quantize` block: the boundary being quantised, the
per-state bodies, and provenance info so HMR can emit
source-mapped warnings.

## Properties

### boundaryName

> `readonly` **boundaryName**: `string`

Defined in: [vite/src/css-quantize.ts:135](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L135)

Boundary name referenced in the at-rule preamble.

***

### line

> `readonly` **line**: `number`

Defined in: [vite/src/css-quantize.ts:141](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L141)

1-based source line where the block begins.

***

### sourceFile

> `readonly` **sourceFile**: `string`

Defined in: [vite/src/css-quantize.ts:139](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L139)

Absolute path of the CSS source file.

***

### states

> `readonly` **states**: `Record`\<`string`, [`QuantizeStateBody`](QuantizeStateBody.md)\>

Defined in: [vite/src/css-quantize.ts:137](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/css-quantize.ts#L137)

`{ stateName: { bareProps, rules } }` mapping.

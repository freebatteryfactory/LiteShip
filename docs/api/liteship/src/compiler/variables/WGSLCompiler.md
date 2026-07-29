[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / WGSLCompiler

# Variable: WGSLCompiler

> `const` **WGSLCompiler**: `object`

Defined in: compiler/dist/wgsl.d.ts:130

WGSL compiler namespace.

Compiles boundary definitions into WebGPU Shading Language code: struct
layouts for uniform buffers, `@group/@binding` declarations, and `const`
state index values.

## Type Declaration

### compile

> `readonly` **compile**: *typeof* `compile`

### serialize

> `readonly` **serialize**: *typeof* `serialize`

## Example

```ts
import { defineBoundary } from '@liteship/core';
import { WGSLCompiler } from '@liteship/compiler';

const boundary = defineBoundary({
  input: 'viewport',
  at: [[0, 'sm'], [768, 'lg']],
});
const result = WGSLCompiler.compile(boundary, {
  sm: { radius: 4 }, lg: { radius: 12 },
});
const wgsl = WGSLCompiler.serialize(result);
```

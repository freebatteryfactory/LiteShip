[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / GLSLCompiler

# Variable: GLSLCompiler

> `const` **GLSLCompiler**: `object`

Defined in: compiler/dist/glsl.d.ts:132

GLSL compiler namespace.

Compiles boundary definitions into GLSL shader preambles containing
`#define` state constants, `uniform` declarations, and a JavaScript
`bindUniforms()` helper for setting uniform values via WebGL.

## Type Declaration

### compile

> `readonly` **compile**: *typeof* `compile`

### serialize

> `readonly` **serialize**: *typeof* `serialize`

## Example

```ts
import { defineBoundary } from '@liteship/core';
import { GLSLCompiler } from '@liteship/compiler';

const boundary = defineBoundary({
  input: 'width',
  at: [[0, 'sm'], [768, 'lg']],
});
const result = GLSLCompiler.compile(boundary, {
  sm: { intensity: 0.5 }, lg: { intensity: 1.0 },
});
const preamble = GLSLCompiler.serialize(result);
```

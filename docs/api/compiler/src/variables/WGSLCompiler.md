[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / WGSLCompiler

# Variable: WGSLCompiler

> `const` **WGSLCompiler**: `object`

Defined in: [compiler/src/wgsl.ts:290](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L290)

WGSL compiler namespace.

Compiles boundary definitions into WebGPU Shading Language code: struct
layouts for uniform buffers, `@group/@binding` declarations, and `const`
state index values.

## Type Declaration

### compile

> **compile**: \<`B`\>(`boundary`, `states`) => [`WGSLCompileResult`](../interfaces/WGSLCompileResult.md)

Compile a boundary definition and per-state scalar/vector value maps into
WGSL struct definitions, `@group/@binding` declarations, and state constants.

#### Type Parameters

##### B

`B` *extends* [`Boundary`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Boundary.md)

#### Parameters

##### boundary

`B`

The boundary definition with states

##### states

`{ [S in string]: Record<string, WGSLUniformValue> }`

Per-state scalar/vector value maps

#### Returns

[`WGSLCompileResult`](../interfaces/WGSLCompileResult.md)

A [WGSLCompileResult](../interfaces/WGSLCompileResult.md) with structs, bindings, and declarations

#### Example

```ts
import { Boundary } from '@liteship/core';
import { WGSLCompiler } from '@liteship/compiler';

const boundary = Boundary.make({
  input: 'viewport',
  at: [[0, 'mobile'], [768, 'desktop']],
});
const result = WGSLCompiler.compile(boundary, {
  mobile: { blur_radius: 2.0, scale: 0.5 },
  desktop: { blur_radius: 0.0, scale: 1.0 },
});
console.log(result.declarations);
// struct ViewportState { state_index: u32, blur_radius: f32, scale: f32 }
// @group(0) @binding(0) var<uniform> boundary_state: ViewportState;
```

### serialize

> **serialize**: (`result`) => `string`

Serialize a [WGSLCompileResult](../interfaces/WGSLCompileResult.md) into a WGSL declaration string.

#### Parameters

##### result

[`WGSLCompileResult`](../interfaces/WGSLCompileResult.md)

The compile result to serialize

#### Returns

`string`

A WGSL declaration string

#### Example

```ts
import { WGSLCompiler } from '@liteship/compiler';

const result = WGSLCompiler.compile(boundary, states);
const wgsl = WGSLCompiler.serialize(result);
// Prepend to your compute/render shader
```

## Example

```ts
import { Boundary } from '@liteship/core';
import { WGSLCompiler } from '@liteship/compiler';

const boundary = Boundary.make({
  input: 'viewport',
  at: [[0, 'sm'], [768, 'lg']],
});
const result = WGSLCompiler.compile(boundary, {
  sm: { radius: 4 }, lg: { radius: 12 },
});
const wgsl = WGSLCompiler.serialize(result);
```

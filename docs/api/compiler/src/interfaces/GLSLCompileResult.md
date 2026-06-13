[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / GLSLCompileResult

# Interface: GLSLCompileResult

Defined in: [compiler/src/glsl.ts:64](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/glsl.ts#L64)

Output of [GLSLCompiler.compile](../variables/GLSLCompiler.md#compile).

`declarations` is the complete preamble block ready to prepend to a
shader; `bindUniforms` is a `function bindUniforms(gl, program, values)`
stringified helper that routes the values map into `uniform*` calls.

## Properties

### bindUniforms

> `readonly` **bindUniforms**: `string`

Defined in: [compiler/src/glsl.ts:74](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/glsl.ts#L74)

Stringified `bindUniforms(gl, program, values)` helper.

***

### declarations

> `readonly` **declarations**: `string`

Defined in: [compiler/src/glsl.ts:72](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/glsl.ts#L72)

Pre-serialized `#define` + `uniform` declarations block.

***

### defines

> `readonly` **defines**: readonly [`GLSLDefine`](GLSLDefine.md)[]

Defined in: [compiler/src/glsl.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/glsl.ts#L66)

State-index `#define`s.

***

### uniforms

> `readonly` **uniforms**: readonly [`GLSLUniform`](GLSLUniform.md)[]

Defined in: [compiler/src/glsl.ts:68](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/glsl.ts#L68)

Uniform declarations, including the `u_state` index uniform.

***

### uniformValues

> `readonly` **uniformValues**: `Record`\<`string`, `number`\>

Defined in: [compiler/src/glsl.ts:70](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/glsl.ts#L70)

Default uniform values keyed by uniform name (from the last state's values).

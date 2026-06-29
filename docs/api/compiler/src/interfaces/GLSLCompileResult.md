[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / GLSLCompileResult

# Interface: GLSLCompileResult

Defined in: [compiler/src/glsl.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/glsl.ts#L64)

Output of [GLSLCompiler.compile](../variables/GLSLCompiler.md#compile).

`declarations` is the complete preamble block ready to prepend to a
shader; `bindUniforms` is a `function bindUniforms(gl, program, values)`
stringified helper that routes the values map into `uniform*` calls.

## Properties

### bindUniforms

> `readonly` **bindUniforms**: `string`

Defined in: [compiler/src/glsl.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/glsl.ts#L82)

Stringified `bindUniforms(gl, program, values)` helper.

***

### declarations

> `readonly` **declarations**: `string`

Defined in: [compiler/src/glsl.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/glsl.ts#L80)

Pre-serialized `#define` + `uniform` declarations block.

***

### defines

> `readonly` **defines**: readonly [`GLSLDefine`](GLSLDefine.md)[]

Defined in: [compiler/src/glsl.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/glsl.ts#L66)

State-index `#define`s.

***

### stateUniforms

> `readonly` **stateUniforms**: `Record`\<`string`, `Record`\<`string`, `number`\>\>

Defined in: [compiler/src/glsl.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/glsl.ts#L78)

Per-state uniform values keyed by state name then `u_*` uniform name. Unlike
the flat [uniformValues](#uniformvalues) default (last-state-wins), this preserves
every state's authored values so the live runtime can resolve
`stateUniforms[currentState]` and update uniforms on each boundary crossing
— the GLSL analog of `ARIACompileResult.stateAttributes`.

***

### uniforms

> `readonly` **uniforms**: readonly [`GLSLUniform`](GLSLUniform.md)[]

Defined in: [compiler/src/glsl.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/glsl.ts#L68)

Uniform declarations, including the `u_state` index uniform.

***

### uniformValues

> `readonly` **uniformValues**: `Record`\<`string`, `number`\>

Defined in: [compiler/src/glsl.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/glsl.ts#L70)

Default uniform values keyed by uniform name (from the last state's values).

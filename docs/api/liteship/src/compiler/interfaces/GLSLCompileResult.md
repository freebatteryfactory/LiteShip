[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / GLSLCompileResult

# Interface: GLSLCompileResult

Defined in: compiler/dist/glsl.d.ts:39

Output of [GLSLCompiler.compile](../variables/GLSLCompiler.md#compile).

`declarations` is the complete preamble block ready to prepend to a
shader; `bindUniforms` is a `function bindUniforms(gl, program, values)`
stringified helper that routes the values map into `uniform*` calls.

## Properties

### bindUniforms

> `readonly` **bindUniforms**: `string`

Defined in: compiler/dist/glsl.d.ts:57

Stringified `bindUniforms(gl, program, values)` helper.

***

### declarations

> `readonly` **declarations**: `string`

Defined in: compiler/dist/glsl.d.ts:55

Pre-serialized `#define` + `uniform` declarations block.

***

### defines

> `readonly` **defines**: readonly [`GLSLDefine`](GLSLDefine.md)[]

Defined in: compiler/dist/glsl.d.ts:41

State-index `#define`s.

***

### stateUniforms

> `readonly` **stateUniforms**: `Record`\<`string`, `Record`\<`string`, `number`\>\>

Defined in: compiler/dist/glsl.d.ts:53

Per-state uniform values keyed by state name then `u_*` uniform name. Unlike
the flat [uniformValues](#uniformvalues) default (last-state-wins), this preserves
every state's authored values so the live runtime can resolve
`stateUniforms[currentState]` and update uniforms on each boundary crossing
— the GLSL analog of `ARIACompileResult.stateAttributes`.

***

### uniforms

> `readonly` **uniforms**: readonly [`GLSLUniform`](GLSLUniform.md)[]

Defined in: compiler/dist/glsl.d.ts:43

Uniform declarations, including the `u_state` index uniform.

***

### uniformValues

> `readonly` **uniformValues**: `Record`\<`string`, `number`\>

Defined in: compiler/dist/glsl.d.ts:45

Default uniform values keyed by uniform name (from the last state's values).

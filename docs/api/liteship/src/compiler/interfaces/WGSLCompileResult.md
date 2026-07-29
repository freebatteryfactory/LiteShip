[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / WGSLCompileResult

# Interface: WGSLCompileResult

Defined in: compiler/dist/wgsl.d.ts:46

Output of [WGSLCompiler.compile](../variables/WGSLCompiler.md#compile).

`declarations` is the ready-to-prepend WGSL preamble containing state
constants, the uniform struct, and its binding declaration.

## Properties

### bindings

> `readonly` **bindings**: readonly [`WGSLBinding`](WGSLBinding.md)[]

Defined in: compiler/dist/wgsl.d.ts:50

Uniform buffer bindings.

***

### bindingValues

> `readonly` **bindingValues**: `Record`\<`string`, [`WGSLUniformValue`](../type-aliases/WGSLUniformValue.md)\>

Defined in: compiler/dist/wgsl.d.ts:52

Default field values keyed by WGSL field name.

***

### declarations

> `readonly` **declarations**: `string`

Defined in: compiler/dist/wgsl.d.ts:61

Pre-serialized WGSL preamble string.

***

### stateBindings

> `readonly` **stateBindings**: `Record`\<`string`, `Record`\<`string`, [`WGSLUniformValue`](../type-aliases/WGSLUniformValue.md)\>\>

Defined in: compiler/dist/wgsl.d.ts:59

Per-state binding values keyed by state name then snake_case field name —
the WGSL analog of `GLSLCompileResult.stateUniforms`. Built alongside the
merged `bindingValues` so the live runtime can resolve
`stateBindings[currentState]` and update struct fields on each crossing.

***

### structs

> `readonly` **structs**: readonly [`WGSLStruct`](WGSLStruct.md)[]

Defined in: compiler/dist/wgsl.d.ts:48

Declared struct types (currently one: the boundary's state struct).

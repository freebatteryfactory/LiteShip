[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / WGSLCompileResult

# Interface: WGSLCompileResult

Defined in: [compiler/src/wgsl.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L69)

Output of [WGSLCompiler.compile](../variables/WGSLCompiler.md#compile).

`declarations` is the ready-to-prepend WGSL preamble containing state
constants, the uniform struct, and its binding declaration.

## Properties

### bindings

> `readonly` **bindings**: readonly [`WGSLBinding`](WGSLBinding.md)[]

Defined in: [compiler/src/wgsl.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L73)

Uniform buffer bindings.

***

### bindingValues

> `readonly` **bindingValues**: `Record`\<`string`, [`WGSLUniformValue`](../type-aliases/WGSLUniformValue.md)\>

Defined in: [compiler/src/wgsl.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L75)

Default field values keyed by WGSL field name.

***

### declarations

> `readonly` **declarations**: `string`

Defined in: [compiler/src/wgsl.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L84)

Pre-serialized WGSL preamble string.

***

### stateBindings

> `readonly` **stateBindings**: `Record`\<`string`, `Record`\<`string`, [`WGSLUniformValue`](../type-aliases/WGSLUniformValue.md)\>\>

Defined in: [compiler/src/wgsl.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L82)

Per-state binding values keyed by state name then snake_case field name —
the WGSL analog of `GLSLCompileResult.stateUniforms`. Built alongside the
merged `bindingValues` so the live runtime can resolve
`stateBindings[currentState]` and update struct fields on each crossing.

***

### structs

> `readonly` **structs**: readonly [`WGSLStruct`](WGSLStruct.md)[]

Defined in: [compiler/src/wgsl.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L71)

Declared struct types (currently one: the boundary's state struct).

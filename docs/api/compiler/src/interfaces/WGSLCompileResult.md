[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / WGSLCompileResult

# Interface: WGSLCompileResult

Defined in: [compiler/src/wgsl.ts:62](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L62)

Output of [WGSLCompiler.compile](../variables/WGSLCompiler.md#compile).

`declarations` is the ready-to-prepend WGSL preamble containing state
constants, the uniform struct, and its binding declaration.

## Properties

### bindings

> `readonly` **bindings**: readonly [`WGSLBinding`](WGSLBinding.md)[]

Defined in: [compiler/src/wgsl.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L66)

Uniform buffer bindings.

***

### bindingValues

> `readonly` **bindingValues**: `Record`\<`string`, `number`\>

Defined in: [compiler/src/wgsl.ts:68](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L68)

Default field values keyed by WGSL field name.

***

### declarations

> `readonly` **declarations**: `string`

Defined in: [compiler/src/wgsl.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L77)

Pre-serialized WGSL preamble string.

***

### stateBindings

> `readonly` **stateBindings**: `Record`\<`string`, `Record`\<`string`, `number`\>\>

Defined in: [compiler/src/wgsl.ts:75](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L75)

Per-state binding values keyed by state name then snake_case field name —
the WGSL analog of `GLSLCompileResult.stateUniforms`. Built alongside the
merged `bindingValues` so the live runtime can resolve
`stateBindings[currentState]` and update struct fields on each crossing.

***

### structs

> `readonly` **structs**: readonly [`WGSLStruct`](WGSLStruct.md)[]

Defined in: [compiler/src/wgsl.ts:64](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L64)

Declared struct types (currently one: the boundary's state struct).

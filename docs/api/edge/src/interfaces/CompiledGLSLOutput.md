[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [edge/src](../README.md) / CompiledGLSLOutput

# Interface: CompiledGLSLOutput

Defined in: [edge/src/kv-cache.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L86)

Serialized GLSL cast artifact stored on [CompiledOutputs.glsl](CompiledOutputs.md#glsl): the
shader preamble plus default uniform values. JSON-round-trippable subset of
`@liteship/compiler`'s `GLSLCompileResult` (the structured `defines`/`uniforms`
arrays re-derive from `declarations`, so only the runtime-needed fields are
stored).

## Properties

### declarations

> `readonly` **declarations**: `string`

Defined in: [edge/src/kv-cache.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L88)

`#define` + `uniform` shader preamble block.

***

### stateUniforms?

> `readonly` `optional` **stateUniforms?**: `Readonly`\<`Record`\<`string`, `Readonly`\<`Record`\<`string`, `number`\>\>\>\>

Defined in: [edge/src/kv-cache.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L98)

Per-state authored uniform values keyed by state name then `u_*` identifier.
Rides the adaptive payload so the live runtime resolves
`stateUniforms[currentState]` and updates uniforms on each boundary crossing
— the GLSL analog of `CompiledOutputs.aria`. Absent when the boundary's
`@glsl` blocks authored no per-state values.

***

### uniformValues

> `readonly` **uniformValues**: `Readonly`\<`Record`\<`string`, `number`\>\>

Defined in: [edge/src/kv-cache.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L90)

Default uniform values keyed by GLSL uniform identifier (`u_*`).

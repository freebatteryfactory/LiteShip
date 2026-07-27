[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / CompiledWGSLOutput

# Interface: CompiledWGSLOutput

Defined in: [edge/src/kv-cache.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L113)

Serialized WGSL cast artifact stored on [CompiledOutputs.wgsl](CompiledOutputs.md#wgsl): the
WebGPU preamble plus default binding values. JSON-round-trippable subset of
`@liteship/compiler`'s `WGSLCompileResult`.

## Properties

### bindingValues

> `readonly` **bindingValues**: `Readonly`\<`Record`\<`string`, `WGSLUniformValue`\>\>

Defined in: [edge/src/kv-cache.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L117)

Default binding values keyed by WGSL struct field name.

***

### declarations

> `readonly` **declarations**: `string`

Defined in: [edge/src/kv-cache.ts:115](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L115)

State consts + uniform struct + `@group/@binding` preamble block.

***

### stateBindings?

> `readonly` `optional` **stateBindings?**: `Readonly`\<`Record`\<`string`, `Readonly`\<`Record`\<`string`, `WGSLUniformValue`\>\>\>\>

Defined in: [edge/src/kv-cache.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L124)

Per-state authored binding values keyed by state name then field name — the
WGSL analog of [CompiledGLSLOutput.stateUniforms](CompiledGLSLOutput.md#stateuniforms). Rides the adaptive
payload so the runtime resolves `stateBindings[currentState]` and updates
struct fields on each crossing. Absent when no per-state values were authored.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / CompiledOutputs

# Interface: CompiledOutputs

Defined in: [edge/src/kv-cache.ts:32](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L32)

Precompiled outputs for a single boundary at a given tier.

## Properties

### aria?

> `readonly` `optional` **aria?**: `Readonly`\<`Record`\<`string`, `Readonly`\<`Record`\<`string`, `string`\>\>\>\>

Defined in: [edge/src/kv-cache.ts:42](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L42)

Authored per-state ARIA/data attributes (`@aria` blocks), keyed by state
name then attribute (`ARIACompileResult.stateAttributes`). Tier-invariant.
Absent when the boundary declares no `@aria` — most boundaries. The runtime
resolves `aria[currentState]` so authored attributes update on crossings.

***

### containerQueries

> `readonly` **containerQueries**: `string`

Defined in: [edge/src/kv-cache.ts:35](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L35)

***

### css

> `readonly` **css**: `string`

Defined in: [edge/src/kv-cache.ts:33](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L33)

***

### glsl?

> `readonly` `optional` **glsl?**: `CompiledGLSLOutput`

Defined in: [edge/src/kv-cache.ts:51](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L51)

Compiled GLSL cast (`@glsl` blocks): the shader preamble `declarations`
the runtime prepends to a fragment shader plus the default `uniformValues`
keyed by GLSL uniform identifier (`GLSLCompileResult`). Tier-invariant.
Absent when the boundary declares no `@glsl` — most boundaries. The live
GPU runtime consumer (`runtime/gpu.ts`) is out of the D0 data-path scope;
D0 only carries this field end to end.

***

### propertyRegistrations

> `readonly` **propertyRegistrations**: `string`

Defined in: [edge/src/kv-cache.ts:34](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L34)

***

### wgsl?

> `readonly` `optional` **wgsl?**: `CompiledWGSLOutput`

Defined in: [edge/src/kv-cache.ts:59](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L59)

Compiled WGSL cast (`@wgsl` blocks): the WebGPU preamble `declarations`
(state consts + uniform struct + binding) plus the default `bindingValues`
keyed by WGSL field name (`WGSLCompileResult`). Tier-invariant. Absent when
the boundary declares no `@wgsl`. The live WebGPU runtime consumer
(`runtime/wgpu.ts`) is out of the D0 data-path scope; D0 only carries it.

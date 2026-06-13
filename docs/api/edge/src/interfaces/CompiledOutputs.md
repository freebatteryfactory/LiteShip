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

### propertyRegistrations

> `readonly` **propertyRegistrations**: `string`

Defined in: [edge/src/kv-cache.ts:34](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L34)

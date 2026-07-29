[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / EdgeHostBoundaryConfig

# Interface: EdgeHostBoundaryConfig

Defined in: [\_spine/edge.d.ts:255](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L255)

Boundary manifest and precompiled-asset inputs for edge host resolution.

## Properties

### assetUrlsByTier?

> `readonly` `optional` **assetUrlsByTier?**: `Readonly`\<`Partial`\<`Record`\<`"none:rich"` \| `"none:minimal"` \| `"none:standard"` \| `"none:enhanced"` \| `"transitions:rich"` \| `"transitions:minimal"` \| `"transitions:standard"` \| `"transitions:enhanced"` \| `"animations:rich"` \| `"animations:minimal"` \| `"animations:standard"` \| `"animations:enhanced"` \| `"physics:rich"` \| `"physics:minimal"` \| `"physics:standard"` \| `"physics:enhanced"` \| `"compute:rich"` \| `"compute:minimal"` \| `"compute:standard"` \| `"compute:enhanced"`, `string`\>\>\>

Defined in: [\_spine/edge.d.ts:258](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L258)

***

### boundaryId

> `readonly` **boundaryId**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/edge.d.ts:256](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L256)

***

### compile?

> `readonly` `optional` **compile?**: (`context`) => [`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

Defined in: [\_spine/edge.d.ts:259](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L259)

#### Parameters

##### context

[`EdgeHostCompileContext`](EdgeHostCompileContext.md)

#### Returns

[`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

***

### precompiled?

> `readonly` `optional` **precompiled?**: `Readonly`\<`Partial`\<`Record`\<`"none:rich"` \| `"none:minimal"` \| `"none:standard"` \| `"none:enhanced"` \| `"transitions:rich"` \| `"transitions:minimal"` \| `"transitions:standard"` \| `"transitions:enhanced"` \| `"animations:rich"` \| `"animations:minimal"` \| `"animations:standard"` \| `"animations:enhanced"` \| `"physics:rich"` \| `"physics:minimal"` \| `"physics:standard"` \| `"physics:enhanced"` \| `"compute:rich"` \| `"compute:minimal"` \| `"compute:standard"` \| `"compute:enhanced"`, [`CompiledOutputs`](CompiledOutputs.md)\>\>\>

Defined in: [\_spine/edge.d.ts:257](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L257)

***

### tags?

> `readonly` `optional` **tags?**: [`EdgeHostCacheTags`](../type-aliases/EdgeHostCacheTags.md)

Defined in: [\_spine/edge.d.ts:260](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L260)

[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / EdgeHostBoundaryConfig

# Interface: EdgeHostBoundaryConfig

Defined in: [\_spine/edge.d.ts:235](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L235)

Boundary manifest and precompiled-asset inputs for edge host resolution.

## Properties

### assetUrlsByTier?

> `readonly` `optional` **assetUrlsByTier?**: `Readonly`\<`Partial`\<`Record`\<`` `${MotionTier}:minimal` `` \| `` `${MotionTier}:standard` `` \| `` `${MotionTier}:enhanced` `` \| `` `${MotionTier}:rich` ``, `string`\>\>\>

Defined in: [\_spine/edge.d.ts:238](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L238)

***

### boundaryId

> `readonly` **boundaryId**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/edge.d.ts:236](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L236)

***

### compile?

> `readonly` `optional` **compile?**: (`context`) => [`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

Defined in: [\_spine/edge.d.ts:239](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L239)

#### Parameters

##### context

[`EdgeHostCompileContext`](EdgeHostCompileContext.md)

#### Returns

[`CompiledOutputs`](CompiledOutputs.md) \| `Promise`\<[`CompiledOutputs`](CompiledOutputs.md)\>

***

### precompiled?

> `readonly` `optional` **precompiled?**: `Readonly`\<`Partial`\<`Record`\<`` `${MotionTier}:minimal` `` \| `` `${MotionTier}:standard` `` \| `` `${MotionTier}:enhanced` `` \| `` `${MotionTier}:rich` ``, [`CompiledOutputs`](CompiledOutputs.md)\>\>\>

Defined in: [\_spine/edge.d.ts:237](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L237)

***

### tags?

> `readonly` `optional` **tags?**: [`EdgeHostCacheTags`](../type-aliases/EdgeHostCacheTags.md)

Defined in: [\_spine/edge.d.ts:240](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L240)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / BoundaryCache

# Interface: BoundaryCache

Defined in: [edge/src/kv-cache.ts:42](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L42)

Content-addressed cache for boundary compilation results keyed by
tier combination.

## Methods

### getCompiledOutputs()

> **getCompiledOutputs**(`boundaryId`, `tierResult`, `qualifier?`): `Promise`\<[`CompiledOutputs`](CompiledOutputs.md) \| `null`\>

Defined in: [edge/src/kv-cache.ts:49](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L49)

`qualifier` joins the key when two NAMES share one boundary
`ContentAddress` but carry different compiled CSS (the same
`Boundary.make` definition referenced by two `@quantize` blocks) —
without it, the first name's compile result would serve every name.

#### Parameters

##### boundaryId

`ContentAddress`

##### tierResult

[`EdgeTierResult`](EdgeTierResult.md)

##### qualifier?

`string`

#### Returns

`Promise`\<[`CompiledOutputs`](CompiledOutputs.md) \| `null`\>

***

### putCompiledOutputs()

> **putCompiledOutputs**(`boundaryId`, `tierResult`, `outputs`, `qualifier?`): `Promise`\<`void`\>

Defined in: [edge/src/kv-cache.ts:51](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L51)

#### Parameters

##### boundaryId

`ContentAddress`

##### tierResult

[`EdgeTierResult`](EdgeTierResult.md)

##### outputs

[`CompiledOutputs`](CompiledOutputs.md)

##### qualifier?

`string`

#### Returns

`Promise`\<`void`\>

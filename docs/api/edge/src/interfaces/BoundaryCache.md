[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / BoundaryCache

# Interface: BoundaryCache

Defined in: [edge/src/kv-cache.ts:107](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L107)

Content-addressed cache for boundary compilation results keyed by
tier combination.

## Methods

### getCompiledOutputs()

> **getCompiledOutputs**(`boundaryId`, `tierResult`, `qualifier?`, `themeFp?`): `Promise`\<[`CompiledOutputs`](CompiledOutputs.md) \| `null`\>

Defined in: [edge/src/kv-cache.ts:116](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L116)

`qualifier` joins the key when two NAMES share one boundary
`ContentAddress` but carry different compiled CSS (the same
`Boundary.make` definition referenced by two `@quantize` blocks) —
without it, the first name's compile result would serve every name.
`themeFp` likewise segregates outputs compiled under different resolved
themes (a per-request theme is a real input to the cached CSS).

#### Parameters

##### boundaryId

`ContentAddress`

##### tierResult

[`EdgeTierResult`](EdgeTierResult.md)

##### qualifier?

`string`

##### themeFp?

`string`

#### Returns

`Promise`\<[`CompiledOutputs`](CompiledOutputs.md) \| `null`\>

***

### putCompiledOutputs()

> **putCompiledOutputs**(`boundaryId`, `tierResult`, `outputs`, `qualifier?`, `themeFp?`): `Promise`\<`void`\>

Defined in: [edge/src/kv-cache.ts:123](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L123)

#### Parameters

##### boundaryId

`ContentAddress`

##### tierResult

[`EdgeTierResult`](EdgeTierResult.md)

##### outputs

[`CompiledOutputs`](CompiledOutputs.md)

##### qualifier?

`string`

##### themeFp?

`string`

#### Returns

`Promise`\<`void`\>

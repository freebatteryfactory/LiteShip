[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / BoundaryCache

# Interface: BoundaryCache

Defined in: [\_spine/edge.d.ts:128](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L128)

Async cache contract for content-addressed boundary outputs.

## Methods

### getCompiledOutputs()

> **getCompiledOutputs**(`boundaryId`, `tierResult`, `qualifier?`, `themeFp?`): `Promise`\<[`CompiledOutputs`](CompiledOutputs.md) \| `null`\>

Defined in: [\_spine/edge.d.ts:137](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L137)

`qualifier` joins the key when two NAMES share one boundary
`ContentAddress` but carry different compiled CSS (the same
`defineBoundary` definition referenced by two `@quantize` blocks) —
without it, the first name's compile result would serve every name.
`themeFp` likewise segregates outputs compiled under different resolved
themes (a per-request theme is a real input to the cached CSS).

#### Parameters

##### boundaryId

[`ContentAddress`](../type-aliases/ContentAddress.md)

##### tierResult

`Pick`\<[`EdgeTierResult`](EdgeTierResult.md), `"motionTier"` \| `"designTier"`\>

##### qualifier?

`string`

##### themeFp?

`string`

#### Returns

`Promise`\<[`CompiledOutputs`](CompiledOutputs.md) \| `null`\>

***

### invalidateByPath()

> **invalidateByPath**(`boundaryId`): `Promise`\<`number`\>

Defined in: [\_spine/edge.d.ts:151](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L151)

#### Parameters

##### boundaryId

[`ContentAddress`](../type-aliases/ContentAddress.md)

#### Returns

`Promise`\<`number`\>

***

### invalidateByTag()

> **invalidateByTag**(`tag`): `Promise`\<`number`\>

Defined in: [\_spine/edge.d.ts:152](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L152)

#### Parameters

##### tag

`string`

#### Returns

`Promise`\<`number`\>

***

### putCompiledOutputs()

> **putCompiledOutputs**(`boundaryId`, `tierResult`, `outputs`, `qualifier?`, `themeFp?`, `tags?`): `Promise`\<`void`\>

Defined in: [\_spine/edge.d.ts:143](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L143)

#### Parameters

##### boundaryId

[`ContentAddress`](../type-aliases/ContentAddress.md)

##### tierResult

`Pick`\<[`EdgeTierResult`](EdgeTierResult.md), `"motionTier"` \| `"designTier"`\>

##### outputs

[`CompiledOutputs`](CompiledOutputs.md)

##### qualifier?

`string`

##### themeFp?

`string`

##### tags?

readonly `string`[]

#### Returns

`Promise`\<`void`\>

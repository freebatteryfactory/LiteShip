[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / BoundaryCache

# Interface: BoundaryCache

Defined in: [edge/src/kv-cache.ts:130](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L130)

Content-addressed cache for boundary compilation results keyed by
tier combination.

## Methods

### getCompiledOutputs()

> **getCompiledOutputs**(`boundaryId`, `tierResult`, `qualifier?`, `themeFp?`): `Promise`\<[`CompiledOutputs`](CompiledOutputs.md) \| `null`\>

Defined in: [edge/src/kv-cache.ts:139](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L139)

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

### invalidateByPath()

> **invalidateByPath**(`boundaryId`): `Promise`\<`number`\>

Defined in: [edge/src/kv-cache.ts:161](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L161)

Active purge by content address: delete every cached tier × theme variant of
one boundary (the passive answer is to mint a new `ContentAddress` and wait
for TTL — see ADR-0017). Requires `KVNamespace.list` + `delete`; without them
it emits a diagnostic and returns 0. Resolves to the number of keys deleted.

#### Parameters

##### boundaryId

`ContentAddress`

#### Returns

`Promise`\<`number`\>

***

### invalidateByTag()

> **invalidateByTag**(`tag`): `Promise`\<`number`\>

Defined in: [edge/src/kv-cache.ts:171](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L171)

Active purge by tag (Astro 7 `Astro.cache` tag parity): delete every entry
stored with `tag` via [putCompiledOutputs](#putcompiledoutputs)'s `tags`, across all of their
tier/theme variants. Uses per-entry tag indexes when `KVNamespace.list` is
available, with a legacy JSON-index fallback. Requires `KVNamespace.delete`;
without it emits a
diagnostic and returns 0. Resolves to the number of keys deleted.

#### Parameters

##### tag

`string`

#### Returns

`Promise`\<`number`\>

***

### putCompiledOutputs()

> **putCompiledOutputs**(`boundaryId`, `tierResult`, `outputs`, `qualifier?`, `themeFp?`, `tags?`): `Promise`\<`void`\>

Defined in: [edge/src/kv-cache.ts:146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L146)

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

##### tags?

readonly `string`[]

#### Returns

`Promise`\<`void`\>

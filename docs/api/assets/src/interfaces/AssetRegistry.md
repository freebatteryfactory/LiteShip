[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / AssetRegistry

# Interface: AssetRegistry

Defined in: [assets/src/contract.ts:331](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L331)

An immutable, explicitly-assembled index of asset capsules. Replaces the
old mutable module-global registry: there is no import-time mutation, so
resolution no longer depends on which modules happened to load first, and
no test-only reset hook is needed (build a fresh registry per scope).

Construct one with [AssetRegistry.make](../variables/AssetRegistry.md#make) over the capsules you got
from [defineAsset](../functions/defineAsset.md), then thread it to the consumers that validate or
resolve an id (`ref`, `resolveDecoder`, the projection factories).

## Methods

### assertAudioRegistered()

> **assertAudioRegistered**(`audioAssetId`, `factory`): `void`

Defined in: [assets/src/contract.ts:348](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L348)

Validate that an audio asset id is registered before constructing a
projection capsule for it. Throws a registry-miss teaching error naming
`factory` when missing.

#### Parameters

##### audioAssetId

`string`

##### factory

`string`

#### Returns

`void`

***

### capsule()

> **capsule**(`id`): [`AnyAssetCapsule`](../type-aliases/AnyAssetCapsule.md) \| `undefined`

Defined in: [assets/src/contract.ts:337](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L337)

The capsule registered under `id`, or `undefined`.

#### Parameters

##### id

`string`

#### Returns

[`AnyAssetCapsule`](../type-aliases/AnyAssetCapsule.md) \| `undefined`

***

### has()

> **has**(`id`): `boolean`

Defined in: [assets/src/contract.ts:333](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L333)

True when `id` names a capsule in this registry.

#### Parameters

##### id

`string`

#### Returns

`boolean`

***

### ids()

> **ids**(): readonly `string`[]

Defined in: [assets/src/contract.ts:335](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L335)

Sorted ids of every capsule in this registry (for teaching errors / listing).

#### Returns

readonly `string`[]

***

### ref()

> **ref**(`id`): [`AssetRefId`](../type-aliases/AssetRefId.md)

Defined in: [assets/src/contract.ts:342](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L342)

Validate `id` is registered and return it as a branded [AssetRefId](../type-aliases/AssetRefId.md).
Throws a registry-miss teaching error (with did-you-mean) on an unknown id.

#### Parameters

##### id

`string`

#### Returns

[`AssetRefId`](../type-aliases/AssetRefId.md)

***

### resolveAudioDecoder()

> **resolveAudioDecoder**(`assetId`): [`AssetDecoder`](../type-aliases/AssetDecoder.md)\<`"audio"`\>

Defined in: [assets/src/contract.ts:356](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L356)

Resolve a registered audio decoder and reject unknown or non-audio assets.

#### Parameters

##### assetId

`string`

#### Returns

[`AssetDecoder`](../type-aliases/AssetDecoder.md)\<`"audio"`\>

***

### resolveDecoder()

> **resolveDecoder**(`assetId`): [`AssetDecoder`](../type-aliases/AssetDecoder.md)

Defined in: [assets/src/contract.ts:354](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L354)

Resolve the registered byte decoder for an asset id. Unknown ids and
assets without a decoder fail closed; hosts that only have a manifest
must select an explicit decoder rather than manufacture registry truth.

#### Parameters

##### assetId

`string`

#### Returns

[`AssetDecoder`](../type-aliases/AssetDecoder.md)

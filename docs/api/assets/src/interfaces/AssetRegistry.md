[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / AssetRegistry

# Interface: AssetRegistry

Defined in: [assets/src/contract.ts:289](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L289)

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

Defined in: [assets/src/contract.ts:306](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L306)

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

> **capsule**(`id`): [`AssetCapsule`](../type-aliases/AssetCapsule.md) \| `undefined`

Defined in: [assets/src/contract.ts:295](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L295)

The capsule registered under `id`, or `undefined`.

#### Parameters

##### id

`string`

#### Returns

[`AssetCapsule`](../type-aliases/AssetCapsule.md) \| `undefined`

***

### has()

> **has**(`id`): `boolean`

Defined in: [assets/src/contract.ts:291](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L291)

True when `id` names a capsule in this registry.

#### Parameters

##### id

`string`

#### Returns

`boolean`

***

### ids()

> **ids**(): readonly `string`[]

Defined in: [assets/src/contract.ts:293](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L293)

Sorted ids of every capsule in this registry (for teaching errors / listing).

#### Returns

readonly `string`[]

***

### ref()

> **ref**(`id`): [`AssetRefId`](../type-aliases/AssetRefId.md)

Defined in: [assets/src/contract.ts:300](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L300)

Validate `id` is registered and return it as a branded [AssetRefId](../type-aliases/AssetRefId.md).
Throws a registry-miss teaching error (with did-you-mean) on an unknown id.

#### Parameters

##### id

`string`

#### Returns

[`AssetRefId`](../type-aliases/AssetRefId.md)

***

### resolveDecoder()

> **resolveDecoder**(`assetId`): [`AssetDecoder`](../type-aliases/AssetDecoder.md)

Defined in: [assets/src/contract.ts:316](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L316)

Resolve the decode function for an asset id: the registered capsule's
`derive` handler (which carries the asset's own decoder, custom or
built-in) when present, else the audio built-in — host processes that
build a registry without the scene's asset module (e.g. the CLI reading
only the compiled manifest) keep the audio-decode fallback. The audio
fallback matches the only consumers (beat/onset/waveform are audio
projections).

#### Parameters

##### assetId

`string`

#### Returns

[`AssetDecoder`](../type-aliases/AssetDecoder.md)

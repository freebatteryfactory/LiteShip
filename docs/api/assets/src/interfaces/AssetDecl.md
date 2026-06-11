[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / AssetDecl

# Interface: AssetDecl\<K\>

Defined in: [assets/src/contract.ts:41](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L41)

Asset declaration shape consumed by `defineAsset`.

## Type Parameters

### K

`K` *extends* [`AssetKind`](../type-aliases/AssetKind.md)

## Properties

### attribution?

> `readonly` `optional` **attribution?**: `AttributionDecl`

Defined in: [assets/src/contract.ts:55](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L55)

***

### budgets

> `readonly` **budgets**: `object`

Defined in: [assets/src/contract.ts:53](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L53)

#### decodeP95Ms

> `readonly` **decodeP95Ms**: `number`

#### memoryMb?

> `readonly` `optional` **memoryMb?**: `number`

***

### decoder?

> `readonly` `optional` **decoder?**: (`bytes`) => `Promise`\<[`DecodedAsset`](../type-aliases/DecodedAsset.md)\<`K`\>\>

Defined in: [assets/src/contract.ts:52](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L52)

Optional per-asset decode override. When omitted, media kinds fall
back to the built-in decoder for `kind` (audio → audioDecoder,
video → videoDecoder, image → imageDecoder). Must produce the
kind's decoded shape so downstream projections (beat/onset/waveform
over [DecodedAudio](DecodedAudio.md)) keep working.

#### Parameters

##### bytes

`ArrayBuffer`

#### Returns

`Promise`\<[`DecodedAsset`](../type-aliases/DecodedAsset.md)\<`K`\>\>

***

### id

> `readonly` **id**: `string`

Defined in: [assets/src/contract.ts:42](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L42)

***

### invariants

> `readonly` **invariants**: readonly `Invariant`\<`unknown`, `unknown`\>[]

Defined in: [assets/src/contract.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L54)

***

### kind

> `readonly` **kind**: `K`

Defined in: [assets/src/contract.ts:44](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L44)

***

### source

> `readonly` **source**: `string`

Defined in: [assets/src/contract.ts:43](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L43)

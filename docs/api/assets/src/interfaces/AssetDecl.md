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

Defined in: [assets/src/contract.ts:68](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L68)

***

### budgets?

> `readonly` `optional` **budgets?**: `object`

Defined in: [assets/src/contract.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L66)

#### decodeP95Ms?

> `readonly` `optional` **decodeP95Ms?**: `number`

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

### invariants?

> `readonly` `optional` **invariants?**: readonly `Invariant`\<`unknown`, `unknown`\>[]

Defined in: [assets/src/contract.ts:67](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L67)

***

### kind

> `readonly` **kind**: `K`

Defined in: [assets/src/contract.ts:44](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L44)

***

### site?

> `readonly` `optional` **site?**: readonly `Site`[]

Defined in: [assets/src/contract.ts:65](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L65)

Optional explicit site override. When omitted, the capsule's site is
derived from decoder presence: a custom `decoder` keeps the permissive
`['node', 'browser']` (the declarer owns its runtime safety), while a
builtin decoder uses [builtinDecoderSiteFor](../functions/builtinDecoderSiteFor.md) (video → `['node']`,
because ffprobe needs node:child_process). Override when the derivation
is wrong for THIS asset — e.g. a custom video decoder that itself
shells out to node tooling should declare `['node']`, or an audio
asset that must never ship to browsers can narrow to `['node']`.
Claims the builtin decoder cannot honor (e.g. `'browser'` for builtin
video) are rejected at decl time; an empty array is always rejected.

***

### source

> `readonly` **source**: `string`

Defined in: [assets/src/contract.ts:43](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L43)

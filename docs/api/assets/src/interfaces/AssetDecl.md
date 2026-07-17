[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / AssetDecl

# Interface: AssetDecl\<K\>

Defined in: [assets/src/contract.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L47)

Asset declaration shape consumed by `defineAsset`.

## Type Parameters

### K

`K` *extends* [`AssetKind`](../type-aliases/AssetKind.md)

## Properties

### attribution?

> `readonly` `optional` **attribution?**: `AttributionDecl`

Defined in: [assets/src/contract.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L74)

***

### budgets?

> `readonly` `optional` **budgets?**: `object`

Defined in: [assets/src/contract.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L72)

#### decodeP95Ms?

> `readonly` `optional` **decodeP95Ms?**: `number`

#### memoryMb?

> `readonly` `optional` **memoryMb?**: `number`

***

### decoder?

> `readonly` `optional` **decoder?**: (`bytes`) => `Promise`\<[`DecodedAsset`](../type-aliases/DecodedAsset.md)\<`K`\>\>

Defined in: [assets/src/contract.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L58)

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

Defined in: [assets/src/contract.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L48)

***

### invariants?

> `readonly` `optional` **invariants?**: readonly `Invariant`\<`unknown`, `unknown`\>[]

Defined in: [assets/src/contract.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L73)

***

### kind

> `readonly` **kind**: `K`

Defined in: [assets/src/contract.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L50)

***

### site?

> `readonly` `optional` **site?**: readonly `Site`[]

Defined in: [assets/src/contract.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L71)

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

Defined in: [assets/src/contract.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L49)

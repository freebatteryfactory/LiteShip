[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [assets/src](../README.md) / AssetDecoder

# Type Alias: AssetDecoder\<K\>

> **AssetDecoder**\<`K`\> = (`bytes`) => `Promise`\<[`DecodedAsset`](DecodedAsset.md)\<`K`\>\>

Defined in: [assets/src/contract.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L98)

Decode function shape shared by AssetDecl.decoder and the built-ins.

## Type Parameters

### K

`K` *extends* [`AssetKind`](AssetKind.md) = [`AssetKind`](AssetKind.md)

## Parameters

### bytes

`ArrayBuffer`

## Returns

`Promise`\<[`DecodedAsset`](DecodedAsset.md)\<`K`\>\>

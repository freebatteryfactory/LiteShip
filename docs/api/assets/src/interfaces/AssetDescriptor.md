[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [assets/src](../README.md) / AssetDescriptor

# Interface: AssetDescriptor\<K\>

Defined in: [assets/src/contract.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L78)

Any asset capsule, regardless of its decoded shape. The unit an [AssetRegistry](../variables/AssetRegistry.md) indexes.

## Type Parameters

### K

`K` *extends* [`AssetKind`](../type-aliases/AssetKind.md) = [`AssetKind`](../type-aliases/AssetKind.md)

## Properties

### decoder?

> `readonly` `optional` **decoder?**: [`AssetDecoder`](../type-aliases/AssetDecoder.md)\<`K`\>

Defined in: [assets/src/contract.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L81)

***

### kind

> `readonly` **kind**: `K`

Defined in: [assets/src/contract.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L79)

***

### source

> `readonly` **source**: `string`

Defined in: [assets/src/contract.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L80)

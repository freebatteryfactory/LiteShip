[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [assets/src](../README.md) / AnyAssetCapsule

# Type Alias: AnyAssetCapsule

> **AnyAssetCapsule** = `{ readonly [K in AssetKind]: AssetCapsule<K> }`\[[`AssetKind`](AssetKind.md)\]

Defined in: [assets/src/contract.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L95)

Discriminated union accepted by heterogeneous registries without erasing each capsule's decoded output.

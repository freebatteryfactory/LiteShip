[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / AssetRegistry

# Variable: AssetRegistry

> **AssetRegistry**: `object`

Defined in: [assets/src/contract.ts:263](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/assets/src/contract.ts#L263)

Assemble an immutable AssetRegistry from the capsules returned by
[defineAsset](../functions/defineAsset.md). Duplicate ids throw at assembly time. This is the ONE
registration seam — no module-global Map, no import-order dependence.

## Type Declaration

### make

> `readonly` **make**: (`capsules`) => [`AssetRegistry`](../interfaces/AssetRegistry.md) = `makeAssetRegistry`

#### Parameters

##### capsules

readonly [`AssetCapsule`](../type-aliases/AssetCapsule.md)[]

#### Returns

[`AssetRegistry`](../interfaces/AssetRegistry.md)

## Example

```ts
const introBed = defineAsset({ id: 'intro-bed', source: 'intro-bed.wav', kind: 'audio' });
const registry = AssetRegistry.make([introBed]);
registry.ref('intro-bed');                 // branded id, validated
const decode = registry.resolveDecoder('intro-bed');
```

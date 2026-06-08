[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / AssetDecl

# Interface: AssetDecl\<K\>

Defined in: [assets/src/contract.ts:19](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L19)

Asset declaration shape consumed by `defineAsset`.

## Type Parameters

### K

`K` *extends* [`AssetKind`](../type-aliases/AssetKind.md)

## Properties

### attribution?

> `readonly` `optional` **attribution?**: `AttributionDecl`

Defined in: [assets/src/contract.ts:26](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L26)

***

### budgets

> `readonly` **budgets**: `object`

Defined in: [assets/src/contract.ts:24](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L24)

#### decodeP95Ms

> `readonly` **decodeP95Ms**: `number`

#### memoryMb?

> `readonly` `optional` **memoryMb?**: `number`

***

### decoder?

> `readonly` `optional` **decoder?**: (`bytes`) => `Promise`\<`unknown`\>

Defined in: [assets/src/contract.ts:23](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L23)

#### Parameters

##### bytes

`ArrayBuffer`

#### Returns

`Promise`\<`unknown`\>

***

### id

> `readonly` **id**: `string`

Defined in: [assets/src/contract.ts:20](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L20)

***

### invariants

> `readonly` **invariants**: readonly `Invariant`\<`unknown`, `unknown`\>[]

Defined in: [assets/src/contract.ts:25](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L25)

***

### kind

> `readonly` **kind**: `K`

Defined in: [assets/src/contract.ts:22](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L22)

***

### source

> `readonly` **source**: `string`

Defined in: [assets/src/contract.ts:21](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L21)

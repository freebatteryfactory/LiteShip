[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SceneInvariant

# Interface: SceneInvariant

Defined in: [scene/src/contract.ts:76](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L76)

Scene invariant — evaluated against the contract at compile time.
`compileScene` runs every declared check; a check returning `false`
(or throwing) is a violation, and all violations are reported in one
`CzapValidationError` carrying each invariant's name and message.

## Properties

### check

> `readonly` **check**: (`scene`) => `boolean`

Defined in: [scene/src/contract.ts:78](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L78)

#### Parameters

##### scene

[`SceneContract`](SceneContract.md)

#### Returns

`boolean`

***

### message

> `readonly` **message**: `string`

Defined in: [scene/src/contract.ts:79](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L79)

***

### name

> `readonly` **name**: `string`

Defined in: [scene/src/contract.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L77)

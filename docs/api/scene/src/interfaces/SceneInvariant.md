[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SceneInvariant

# Interface: SceneInvariant

Defined in: [scene/src/contract.ts:113](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L113)

Scene invariant — evaluated against the contract at compile time.
`compileScene` runs every declared check; a check returning `false`
(or throwing) is a violation, and all violations are reported in one
`CzapValidationError` carrying each invariant's name and message.

The check receives the [ResolvedSceneContract](../type-aliases/ResolvedSceneContract.md) — track `from` /
`to` are plain frame numbers because `compileScene` resolves every
`Beat()` mark BEFORE invariants run. Arithmetic such as
`t.to <= frames` is therefore always sound; never read marks off the
raw authoring contract inside a check.

## Properties

### check

> `readonly` **check**: (`scene`) => `boolean`

Defined in: [scene/src/contract.ts:115](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L115)

#### Parameters

##### scene

[`ResolvedSceneContract`](../type-aliases/ResolvedSceneContract.md)

#### Returns

`boolean`

***

### message

> `readonly` **message**: `string`

Defined in: [scene/src/contract.ts:116](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L116)

***

### name

> `readonly` **name**: `string`

Defined in: [scene/src/contract.ts:114](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L114)

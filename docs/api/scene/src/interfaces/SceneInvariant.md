[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SceneInvariant

# Interface: SceneInvariant

Defined in: [scene/src/contract.ts:127](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L127)

Scene invariant — evaluated against the contract at compile time.
`compileScene` runs every declared check; a check returning `false`
(or throwing) is a violation, and all violations are reported in one
`ValidationError` carrying each invariant's name and message.

The check receives the [ResolvedSceneContract](../type-aliases/ResolvedSceneContract.md) — track `from` /
`to` are plain frame numbers because `compileScene` resolves every
`Beat()` mark BEFORE invariants run. Arithmetic such as
`t.to <= frames` is therefore always sound; never read marks off the
raw authoring contract inside a check.

## Properties

### check

> `readonly` **check**: (`scene`) => `boolean`

Defined in: [scene/src/contract.ts:129](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L129)

#### Parameters

##### scene

[`ResolvedSceneContract`](../type-aliases/ResolvedSceneContract.md)

#### Returns

`boolean`

***

### message

> `readonly` **message**: `string`

Defined in: [scene/src/contract.ts:130](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L130)

***

### name

> `readonly` **name**: `string`

Defined in: [scene/src/contract.ts:128](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L128)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SceneContract

# Interface: SceneContract\<M\>

Defined in: [scene/src/contract.ts:128](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L128)

Top-level scene contract — typed declaration shape for an entire composition.

## Type Parameters

### M

`M` *extends* [`FrameMark`](../type-aliases/FrameMark.md) = [`FrameMark`](../type-aliases/FrameMark.md)

## Properties

### beats?

> `readonly` `optional` **beats?**: readonly `BeatComponent`[]

Defined in: [scene/src/contract.ts:144](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L144)

Optional pre-resolved beat markers. When present, the scene
compiler propagates them onto the [CompiledScene](CompiledScene.md) and the
runtime spawns one Beat entity per marker before systems are
registered. SyncSystem queries the world for `Beat` components
each tick to compute beat-decay intensity.

***

### bpm

> `readonly` **bpm**: `number`

Defined in: [scene/src/contract.ts:132](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L132)

***

### budgets

> `readonly` **budgets**: `object`

Defined in: [scene/src/contract.ts:135](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L135)

#### memoryMb?

> `readonly` `optional` **memoryMb?**: `number`

#### p95FrameMs

> `readonly` **p95FrameMs**: `number`

***

### duration

> `readonly` **duration**: `number`

Defined in: [scene/src/contract.ts:130](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L130)

***

### fps

> `readonly` **fps**: `number`

Defined in: [scene/src/contract.ts:131](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L131)

***

### invariants

> `readonly` **invariants**: readonly [`SceneInvariant`](SceneInvariant.md)[]

Defined in: [scene/src/contract.ts:134](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L134)

***

### name

> `readonly` **name**: `string`

Defined in: [scene/src/contract.ts:129](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L129)

***

### site

> `readonly` **site**: readonly `Site`[]

Defined in: [scene/src/contract.ts:136](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L136)

***

### tracks

> `readonly` **tracks**: readonly `Track`\<`M`\>[]

Defined in: [scene/src/contract.ts:133](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L133)

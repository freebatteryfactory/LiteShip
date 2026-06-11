[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SceneContract

# Interface: SceneContract

Defined in: [scene/src/contract.ts:91](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L91)

Top-level scene contract — typed declaration shape for an entire composition.

## Properties

### beats?

> `readonly` `optional` **beats?**: readonly `BeatComponent`[]

Defined in: [scene/src/contract.ts:107](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L107)

Optional pre-resolved beat markers. When present, the scene
compiler propagates them onto the [CompiledScene](CompiledScene.md) and the
runtime spawns one Beat entity per marker before systems are
registered. SyncSystem queries the world for `Beat` components
each tick to compute beat-decay intensity.

***

### bpm

> `readonly` **bpm**: `number`

Defined in: [scene/src/contract.ts:95](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L95)

***

### budgets

> `readonly` **budgets**: `object`

Defined in: [scene/src/contract.ts:98](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L98)

#### memoryMb?

> `readonly` `optional` **memoryMb?**: `number`

#### p95FrameMs

> `readonly` **p95FrameMs**: `number`

***

### duration

> `readonly` **duration**: `number`

Defined in: [scene/src/contract.ts:93](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L93)

***

### fps

> `readonly` **fps**: `number`

Defined in: [scene/src/contract.ts:94](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L94)

***

### invariants

> `readonly` **invariants**: readonly [`SceneInvariant`](SceneInvariant.md)[]

Defined in: [scene/src/contract.ts:97](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L97)

***

### name

> `readonly` **name**: `string`

Defined in: [scene/src/contract.ts:92](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L92)

***

### site

> `readonly` **site**: readonly `Site`[]

Defined in: [scene/src/contract.ts:99](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L99)

***

### tracks

> `readonly` **tracks**: readonly `Track`[]

Defined in: [scene/src/contract.ts:96](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L96)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SceneContract

# Interface: SceneContract\<M\>

Defined in: [scene/src/contract.ts:147](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L147)

Top-level scene contract — typed declaration shape for an entire
composition. Only `name`, `fps`, `bpm`, and `tracks` are required;
`compileScene` fills the documented defaults for the rest, so a
hello-world scene never declares layer-4 audit/ship concepts.

## Type Parameters

### M

`M` *extends* [`FrameMark`](../type-aliases/FrameMark.md) = [`FrameMark`](../type-aliases/FrameMark.md)

## Properties

### beats?

> `readonly` `optional` **beats?**: readonly `BeatComponent`[]

Defined in: [scene/src/contract.ts:174](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L174)

Optional pre-resolved beat markers. When present, the scene
compiler propagates them onto the [CompiledScene](CompiledScene.md) and the
runtime spawns one Beat entity per marker before systems are
registered. SyncSystem queries the world for `Beat` components
each tick to compute beat-decay intensity.

***

### bpm

> `readonly` **bpm**: `number`

Defined in: [scene/src/contract.ts:155](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L155)

***

### budgets?

> `readonly` `optional` **budgets?**: `object`

Defined in: [scene/src/contract.ts:164](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L164)

Performance budgets.

#### memoryMb?

> `readonly` `optional` **memoryMb?**: `number`

#### p95FrameMs

> `readonly` **p95FrameMs**: `number`

#### Default Value

```ts
{ p95FrameMs: 1000 / fps } (one frame budget)
```

***

### duration?

> `readonly` `optional` **duration?**: `number`

Defined in: [scene/src/contract.ts:153](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L153)

Scene duration in milliseconds.

#### Default Value

derived from the tracks — max resolved `to` / fps * 1000

***

### fps

> `readonly` **fps**: `number`

Defined in: [scene/src/contract.ts:154](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L154)

***

### height?

> `readonly` `optional` **height?**: `number`

Defined in: [scene/src/contract.ts:159](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L159)

Optional render height in pixels. Render hosts fall back to 720 when absent.

***

### invariants?

> `readonly` `optional` **invariants?**: readonly [`SceneInvariant`](SceneInvariant.md)[]

Defined in: [scene/src/contract.ts:162](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L162)

Compile-time checks.

#### Default Value

```ts
[] (no declared checks)
```

***

### name

> `readonly` **name**: `string`

Defined in: [scene/src/contract.ts:148](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L148)

***

### site?

> `readonly` `optional` **site?**: readonly `Site`[]

Defined in: [scene/src/contract.ts:166](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L166)

Deployment sites the scene targets.

#### Default Value

```ts
['node', 'browser']
```

***

### tracks

> `readonly` **tracks**: readonly `Track`\<`M`\>[]

Defined in: [scene/src/contract.ts:160](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L160)

***

### width?

> `readonly` `optional` **width?**: `number`

Defined in: [scene/src/contract.ts:157](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L157)

Optional render width in pixels. Render hosts fall back to 1280 when absent.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SceneContract

# Interface: SceneContract\<M\>

Defined in: [scene/src/contract.ts:150](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L150)

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

Defined in: [scene/src/contract.ts:177](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L177)

Optional pre-resolved beat markers. When present, the scene
compiler propagates them onto the [CompiledScene](CompiledScene.md) and the
runtime spawns one Beat entity per marker before systems are
registered. SyncSystem queries the world for `Beat` components
each tick to compute beat-decay intensity.

***

### bpm

> `readonly` **bpm**: `number`

Defined in: [scene/src/contract.ts:158](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L158)

***

### budgets?

> `readonly` `optional` **budgets?**: `object`

Defined in: [scene/src/contract.ts:167](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L167)

Performance budgets.

#### memoryMb?

> `readonly` `optional` **memoryMb?**: `number`

#### p95FrameMs

> `readonly` **p95FrameMs**: `number`

#### Default

```ts
{ p95FrameMs: 1000 / fps } (one frame budget)
```

***

### duration?

> `readonly` `optional` **duration?**: `number`

Defined in: [scene/src/contract.ts:156](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L156)

Scene duration in milliseconds.

#### Default

derived from the tracks — max resolved `to` / fps * 1000

***

### fps

> `readonly` **fps**: `number`

Defined in: [scene/src/contract.ts:157](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L157)

***

### height?

> `readonly` `optional` **height?**: `number`

Defined in: [scene/src/contract.ts:162](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L162)

Optional render height in pixels. Render hosts fall back to 720 when absent.

***

### invariants?

> `readonly` `optional` **invariants?**: readonly [`SceneInvariant`](SceneInvariant.md)[]

Defined in: [scene/src/contract.ts:165](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L165)

Compile-time checks.

#### Default

```ts
[] (no declared checks)
```

***

### name

> `readonly` **name**: `string`

Defined in: [scene/src/contract.ts:151](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L151)

***

### site?

> `readonly` `optional` **site?**: readonly `Site`[]

Defined in: [scene/src/contract.ts:169](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L169)

Deployment sites the scene targets.

#### Default

```ts
['node', 'browser']
```

***

### tracks

> `readonly` **tracks**: readonly `Track`\<`M`\>[]

Defined in: [scene/src/contract.ts:163](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L163)

***

### width?

> `readonly` `optional` **width?**: `number`

Defined in: [scene/src/contract.ts:160](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L160)

Optional render width in pixels. Render hosts fall back to 1280 when absent.

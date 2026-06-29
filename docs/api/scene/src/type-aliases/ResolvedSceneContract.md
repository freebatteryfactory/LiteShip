[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / ResolvedSceneContract

# Type Alias: ResolvedSceneContract

> **ResolvedSceneContract** = [`SceneContract`](../interfaces/SceneContract.md)\<`number`\> & `object`

Defined in: [scene/src/contract.ts:186](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L186)

A scene contract whose timeline marks have all been resolved to
numeric frame indices — what `compileScene` hands to every declared
[SceneInvariant](../interfaces/SceneInvariant.md) (and what `componentsFromTrack` reads when
emitting `FrameRange` components). The optional authoring fields are
required here: `compileScene` fills their documented defaults before
invariants run, so checks like `t.to <= (s.duration / 1000) * s.fps`
never see `undefined`.

## Type Declaration

### budgets

> `readonly` **budgets**: `object`

#### budgets.memoryMb?

> `readonly` `optional` **memoryMb?**: `number`

#### budgets.p95FrameMs

> `readonly` **p95FrameMs**: `number`

### duration

> `readonly` **duration**: `number`

### invariants

> `readonly` **invariants**: readonly [`SceneInvariant`](../interfaces/SceneInvariant.md)[]

### site

> `readonly` **site**: readonly `Site`[]

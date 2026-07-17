[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / Scene

# Variable: Scene

> `const` **Scene**: `object`

Defined in: [scene/src/include.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/include.ts#L24)

Scene composition helpers.

## Type Declaration

### runtime

> `readonly` **runtime**: (`compiled`, `opts`) => `Promise`\<[`SceneRuntimeHandle`](../interfaces/SceneRuntimeHandle.md)\> = `SceneRuntime.build`

Build a live, tickable runtime handle from a compiled scene.
Sugar over [SceneRuntime.build](SceneRuntime.md#build) — see `./runtime.ts`.

Build a live SceneRuntime handle from a [CompiledScene](../interfaces/CompiledScene.md).

Holds the world's [WorldNS.Handle](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts) lifetime so the caller
controls when finalizers run. Systems are registered in the
canonical topological order — this matches ADR-0009's
ECS-as-scene-substrate discipline.

#### Parameters

##### compiled

[`CompiledScene`](../interfaces/CompiledScene.md)

##### opts?

[`SceneRuntimeOptions`](../interfaces/SceneRuntimeOptions.md) = `{}`

#### Returns

`Promise`\<[`SceneRuntimeHandle`](../interfaces/SceneRuntimeHandle.md)\>

### include()

> `readonly` **include**(`sub`, `opts`): readonly `Track`[]

Include a sub-scene's tracks with the given offset and id prefix.

The offset accepts any [FrameMark](../type-aliases/FrameMark.md) — Spec 1 §5.3:
`Scene.include(subScene, { offset: Beat(8) })`. Beat offsets stay
deferred (the sub-scene "shares the outer world's BPM/fps", which
`include` does not know); `compileScene` resolves them against the
PARENT scene's bpm/fps when the combined contract compiles.

#### Parameters

##### sub

[`SceneContract`](../interfaces/SceneContract.md)

##### opts

###### offset

`FrameMark`

#### Returns

readonly `Track`[]

### subscene()

> `readonly` **subscene**(`parent`, `partial`): [`SceneContract`](../interfaces/SceneContract.md)

Author a sub-scene that inherits `bpm` / `fps` from its parent.

Spec §5.4 promised compositional inheritance: when authoring a
child scene that's included into a parent, the BPM/fps should
default to the parent's so authors don't have to repeat them
(and risk drift). This helper fills the missing fields from the
parent contract; explicit fields on `partial` win.

Lightweight — no Effect Context.Tag is introduced. If/when more
threaded state appears, the merged shape is the seam to promote.

#### Parameters

##### parent

###### bpm

`number`

###### fps

`number`

##### partial

[`SceneSubscenePartial`](../type-aliases/SceneSubscenePartial.md)

#### Returns

[`SceneContract`](../interfaces/SceneContract.md)

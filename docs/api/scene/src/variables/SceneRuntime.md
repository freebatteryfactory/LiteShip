[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SceneRuntime

# Variable: SceneRuntime

> `const` **SceneRuntime**: `object`

Defined in: [scene/src/runtime.ts:268](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L268)

SceneRuntime namespace — build a live, tickable handle from a
compiled scene. The companion type namespace exposes
`SceneRuntime.Handle` and `SceneRuntime.Options`.

## Type Declaration

### build

> **build**: (`compiled`, `opts`) => `Promise`\<[`SceneRuntimeHandle`](../interfaces/SceneRuntimeHandle.md)\>

Build a live runtime handle.

Build a live SceneRuntime handle from a [CompiledScene](../interfaces/CompiledScene.md).

Holds an explicit [Scope](https://effect.website/docs) for the world's lifetime so the
caller controls when finalizers run. Systems are registered in the
canonical topological order — this matches ADR-0009's
ECS-as-scene-substrate discipline.

#### Parameters

##### compiled

[`CompiledScene`](../interfaces/CompiledScene.md)

##### opts?

[`SceneRuntimeOptions`](../interfaces/SceneRuntimeOptions.md) = `{}`

#### Returns

`Promise`\<[`SceneRuntimeHandle`](../interfaces/SceneRuntimeHandle.md)\>

### systemCount

> `readonly` **systemCount**: `7` = `CANONICAL_SYSTEM_COUNT`

Number of canonical scene systems the runtime always registers.

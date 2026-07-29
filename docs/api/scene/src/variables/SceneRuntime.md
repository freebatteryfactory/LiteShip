[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [scene/src](../README.md) / SceneRuntime

# Variable: SceneRuntime

> `const` **SceneRuntime**: `object`

Defined in: [scene/src/runtime.ts:294](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L294)

SceneRuntime namespace — build a live, tickable handle from a
compiled scene. The companion type namespace exposes
`SceneRuntime.Handle` and `SceneRuntime.Options`.

## Type Declaration

### build

> **build**: (`compiled`, `opts`) => `Promise`\<[`SceneRuntimeHandle`](../interfaces/SceneRuntimeHandle.md)\>

Build a live runtime handle.

Build a live SceneRuntime handle from a [CompiledScene](../interfaces/CompiledScene.md).

Holds the world (which owns its own teardown) so the caller
controls when finalizers run. Systems are registered in the
canonical topological order, per the ECS-as-scene-substrate
discipline.

#### Parameters

##### compiled

[`CompiledScene`](../interfaces/CompiledScene.md)

##### opts?

[`SceneRuntimeOptions`](../interfaces/SceneRuntimeOptions.md) = `{}`

#### Returns

`Promise`\<[`SceneRuntimeHandle`](../interfaces/SceneRuntimeHandle.md)\>

### systemCount

> `readonly` **systemCount**: `8` = `CANONICAL_SYSTEM_COUNT`

Number of canonical scene systems the runtime always registers.

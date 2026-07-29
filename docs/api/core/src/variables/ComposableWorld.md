[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / ComposableWorld

# Variable: ComposableWorld

> `const` **ComposableWorld**: `object`

Defined in: [core/src/authoring/composable.ts:294](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/composable.ts#L294)

Bridge between a raw ECS `World` from `@liteship/core/ecs` and typed [ComposableEntity](../interfaces/ComposableEntity.md)
operations (`spawn`, `query`, `evaluate`) plus a thin dense-store integration.

## Type Declaration

### dense

> **dense**: (`world`) => `ComposableDenseStore` = `makeComposableDenseStore`

Build a dense-store bridge over an `@liteship/core/ecs` `World` for per-entity numeric data.

#### Parameters

##### world

`World`

#### Returns

`ComposableDenseStore`

### make

> **make**: \<`Schema`\>(`world`) => `TypedComposableWorld`\<`Schema`\> = `makeComposableWorld`

Wrap an `@liteship/core/ecs` `World` with the typed composable-entity API.

#### Type Parameters

##### Schema

`Schema` *extends* [`EntityComponents`](../interfaces/EntityComponents.md) = [`EntityComponents`](../interfaces/EntityComponents.md)

#### Parameters

##### world

`World`

#### Returns

`TypedComposableWorld`\<`Schema`\>

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ComposableWorld

# Variable: ComposableWorld

> `const` **ComposableWorld**: `object`

Defined in: [core/src/authoring/composable.ts:282](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/composable.ts#L282)

Bridge between a raw ECS [World](../interfaces/World.md) and typed [ComposableEntity](../interfaces/ComposableEntity.md)
operations (`spawn`, `query`, `evaluate`) plus a thin dense-store integration.

## Type Declaration

### dense

> **dense**: (`world`) => `ComposableDenseStore` = `makeComposableDenseStore`

Build a dense-store bridge over a [World](../interfaces/World.md) for per-entity numeric data.

#### Parameters

##### world

[`World`](../interfaces/World.md)

#### Returns

`ComposableDenseStore`

### make

> **make**: \<`Schema`\>(`world`) => `TypedComposableWorld`\<`Schema`\> = `makeComposableWorld`

Wrap a [World](../interfaces/World.md) with the typed composable-entity API.

#### Type Parameters

##### Schema

`Schema` *extends* [`EntityComponents`](../interfaces/EntityComponents.md) = [`EntityComponents`](../interfaces/EntityComponents.md)

#### Parameters

##### world

[`World`](../interfaces/World.md)

#### Returns

`TypedComposableWorld`\<`Schema`\>

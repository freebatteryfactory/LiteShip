[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ComposableWorld

# Variable: ComposableWorld

> `const` **ComposableWorld**: `object`

Defined in: [core/src/authoring/composable.ts:281](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/composable.ts#L281)

Bridge between a raw ECS [World](../type-aliases/World.md) and typed [ComposableEntity](../interfaces/ComposableEntity.md)
operations (`spawn`, `query`, `evaluate`) plus a thin dense-store integration.

## Type Declaration

### dense

> **dense**: (`world`) => `ComposableDenseStore` = `makeComposableDenseStore`

Build a dense-store bridge over a [World](../type-aliases/World.md) for per-entity numeric data.

#### Parameters

##### world

`WorldShape`

#### Returns

`ComposableDenseStore`

### make

> **make**: \<`Schema`\>(`world`) => [`ComposableWorldShape`](../interfaces/ComposableWorldShape.md)\<`Schema`\> = `makeComposableWorld`

Wrap a [World](../type-aliases/World.md) with the typed composable-entity API.

#### Type Parameters

##### Schema

`Schema` *extends* [`EntityComponents`](../interfaces/EntityComponents.md) = [`EntityComponents`](../interfaces/EntityComponents.md)

#### Parameters

##### world

`WorldShape`

#### Returns

[`ComposableWorldShape`](../interfaces/ComposableWorldShape.md)\<`Schema`\>

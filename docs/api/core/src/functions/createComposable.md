[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / createComposable

# Function: createComposable()

> **createComposable**\<`T`\>(`components`): [`ComposableEntity`](../interfaces/ComposableEntity.md)\<`T`\>

Defined in: [core/src/authoring/composable.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/composable.ts#L68)

Content-address a component bag into a [ComposableEntity](../interfaces/ComposableEntity.md). Two entities
with structurally-equal components share the same content address (verb grammar,
ADR-0046 — `create` allocates a content-addressed unit).

## Type Parameters

### T

`T` *extends* [`EntityComponents`](../interfaces/EntityComponents.md)

## Parameters

### components

`T`

## Returns

[`ComposableEntity`](../interfaces/ComposableEntity.md)\<`T`\>

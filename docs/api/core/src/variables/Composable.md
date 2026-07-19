[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Composable

# Variable: Composable

> `const` **Composable**: `ComposableFactory`

Defined in: [core/src/composable.ts:265](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/composable.ts#L265)

Composable — content-addressed entity algebra over liteship primitives.

Build entities from a bag of components (boundaries, tokens, styles, …),
merge them associatively via `Composable.compose` / `Composable.merge`, and
rely on the content address to deduplicate structurally-equal entities.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Composable

# Variable: Composable

> `const` **Composable**: `ComposableFactory`

Defined in: [core/src/authoring/composable.ts:270](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/composable.ts#L270)

Composable — content-addressed entity algebra over liteship primitives.

Build entities from a bag of components with the standalone [createComposable](../functions/createComposable.md)
(verb grammar, ADR-0046), then merge them associatively via `Composable.compose` /
`Composable.merge`, relying on the content address to deduplicate
structurally-equal entities.

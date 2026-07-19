[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / BoundaryAttribute

# Variable: BoundaryAttribute

> `const` **BoundaryAttribute**: `object`

Defined in: [core/src/authoring/boundary-attribute.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/boundary-attribute.ts#L24)

Shared boundary-attribute policy (ADR-0001 namespace-object style).

## Type Declaration

### isAllowedKey

> **isAllowedKey**: (`key`) => `boolean`

Whether an attribute key may cross the boundary projection seam: any `aria-*`
attribute, or the exact `role` key. Case-sensitive, matching the HTML
attribute namespace it gates — `ARIA-LABEL` and `roles` are not allowed.

#### Parameters

##### key

`string`

#### Returns

`boolean`

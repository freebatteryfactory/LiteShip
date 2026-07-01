[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [genui/src](../README.md) / RenderFromCatalogResult

# Type Alias: RenderFromCatalogResult

> **RenderFromCatalogResult** = \{ `ok`: `true`; \} \| \{ `error`: [`GeneratedUIValidationError`](GeneratedUIValidationError.md); `ok`: `false`; \}

Defined in: [genui/src/render.ts:133](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/genui/src/render.ts#L133)

Result of [renderFromCatalog](../functions/renderFromCatalog.md) — mirrors `ValidateGeneratedUIResult` so a
rejected render surfaces WHY (the validation error) instead of a bare `false`.

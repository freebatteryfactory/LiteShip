[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/genui](../README.md) / RenderFromCatalogResult

# Type Alias: RenderFromCatalogResult

> **RenderFromCatalogResult** = \{ `ok`: `true`; \} \| \{ `error`: [`GeneratedUIValidationError`](GeneratedUIValidationError.md); `ok`: `false`; \}

Defined in: genui/dist/render.d.ts:26

Result of [renderFromCatalog](../functions/renderFromCatalog.md) — mirrors `ValidateGeneratedUIResult` so a
rejected render surfaces WHY (the validation error) instead of a bare `false`.

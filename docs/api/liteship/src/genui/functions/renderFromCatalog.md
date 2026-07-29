[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/genui](../README.md) / renderFromCatalog

# Function: renderFromCatalog()

> **renderFromCatalog**(`node`, `options`): [`RenderFromCatalogResult`](../type-aliases/RenderFromCatalogResult.md)

Defined in: genui/dist/render.d.ts:37

Validate and render a generated UI tree into `target`.
Returns `{ ok: false, error }` when validation fails (target left unchanged
unless `clear` already ran), `{ ok: true }` on success.

## Parameters

### node

[`GeneratedUINode`](../../../../spine/interfaces/GeneratedUINode.md)

### options

[`RenderFromCatalogOptions`](../interfaces/RenderFromCatalogOptions.md)

## Returns

[`RenderFromCatalogResult`](../type-aliases/RenderFromCatalogResult.md)

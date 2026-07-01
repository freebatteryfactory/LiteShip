[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [genui/src](../README.md) / renderFromCatalog

# Function: renderFromCatalog()

> **renderFromCatalog**(`node`, `options`): [`RenderFromCatalogResult`](../type-aliases/RenderFromCatalogResult.md)

Defined in: [genui/src/render.ts:141](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/genui/src/render.ts#L141)

Validate and render a generated UI tree into `target`.
Returns `{ ok: false, error }` when validation fails (target left unchanged
unless `clear` already ran), `{ ok: true }` on success.

## Parameters

### node

[`GeneratedUINode`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/genui.d.ts)

### options

[`RenderFromCatalogOptions`](../interfaces/RenderFromCatalogOptions.md)

## Returns

[`RenderFromCatalogResult`](../type-aliases/RenderFromCatalogResult.md)

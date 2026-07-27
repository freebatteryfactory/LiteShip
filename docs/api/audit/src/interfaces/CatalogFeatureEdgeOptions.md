[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / CatalogFeatureEdgeOptions

# Interface: CatalogFeatureEdgeOptions

Defined in: [audit/src/catalog-feature-edge-census.ts:153](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/catalog-feature-edge-census.ts#L153)

Complete owner catalogs and executable sites for one feature-edge family.

## Properties

### consumers?

> `readonly` `optional` **consumers?**: readonly [`CatalogFeatureEdgeSite`](CatalogFeatureEdgeSite.md)[]

Defined in: [audit/src/catalog-feature-edge-census.ts:160](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/catalog-feature-edge-census.ts#L160)

Additional real lookup/advertisement sites governed by the same declarations.

***

### declarations

> `readonly` **declarations**: readonly [`CatalogFeatureEdgeSite`](CatalogFeatureEdgeSite.md)[]

Defined in: [audit/src/catalog-feature-edge-census.ts:156](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/catalog-feature-edge-census.ts#L156)

Canonical owner rows. Every row is a consumer claim that needs a producer.

***

### family

> `readonly` **family**: `"lsp-method"` \| `"mcp-method"` \| `"command-capability"` \| `"command"` \| `"mcp-resource"` \| `"mcp-prompt"` \| `"capsule-kind"` \| `"fleet-event"`

Defined in: [audit/src/catalog-feature-edge-census.ts:154](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/catalog-feature-edge-census.ts#L154)

***

### opaqueSites?

> `readonly` `optional` **opaqueSites?**: readonly `Omit`\<`OpaqueFeatureEdgeSite`, `"family"`\>[]

Defined in: [audit/src/catalog-feature-edge-census.ts:162](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/catalog-feature-edge-census.ts#L162)

Dynamic sites are explicit unknown coverage, never silently omitted.

***

### producers

> `readonly` **producers**: readonly [`CatalogFeatureEdgeSite`](CatalogFeatureEdgeSite.md)[]

Defined in: [audit/src/catalog-feature-edge-census.ts:158](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/catalog-feature-edge-census.ts#L158)

Actual handlers/providers/readers/compilers behind the declared rows.

***

### sourceImage?

> `readonly` `optional` **sourceImage?**: readonly `object`[]

Defined in: [audit/src/catalog-feature-edge-census.ts:164](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/catalog-feature-edge-census.ts#L164)

Optional canonical owner images included in the integrity receipt.

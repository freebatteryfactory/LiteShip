[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/astro](../README.md) / ServerIslandContext

# Interface: ServerIslandContext

Defined in: astro/dist/quantize.d.ts:15

Server-only context that [resolveInitialState](../functions/resolveInitialState.md) consumes. Astro
builds this from the incoming request (user agent + Client Hints)
and the tier detected by the edge middleware.

## Properties

### clientHints?

> `readonly` `optional` **clientHints?**: `Record`\<`string`, `string`\>

Defined in: astro/dist/quantize.d.ts:19

Flat Client Hints header map (default `{}`). Build from `Astro.request.headers`.

***

### detectedCapTier?

> `readonly` `optional` **detectedCapTier?**: [`CapTier`](../../evidence/type-aliases/CapTier.md)

Defined in: astro/dist/quantize.d.ts:21

Tier detected by `@liteship/edge` (default `'reactive'` → synthetic 960px).

***

### userAgent?

> `readonly` `optional` **userAgent?**: `string`

Defined in: astro/dist/quantize.d.ts:17

Raw `User-Agent` header (default `''`).

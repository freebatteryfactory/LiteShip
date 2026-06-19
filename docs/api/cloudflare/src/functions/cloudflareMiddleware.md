[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [cloudflare/src](../README.md) / cloudflareMiddleware

# Function: cloudflareMiddleware()

> **cloudflareMiddleware**(`config`): (`context`, `next`) => `Promise`\<`Response`\>

Defined in: [cloudflare/src/middleware.ts:213](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L213)

Astro middleware factory wired for Cloudflare Workers KV boundary caching.

Boundary identities and precompiled outputs come from the
build-derived manifest (`virtual:czap/boundaries`), so no id is ever
hand-typed. Every manifest boundary is served by default (each under
its own content-addressed cache key); pass `boundary` to narrow.
`boundaryId` + `compile` remain as an escape hatch for custom hosts.

## Parameters

### config

[`CloudflareMiddlewareConfig`](../interfaces/CloudflareMiddlewareConfig.md)

## Returns

(`context`, `next`) => `Promise`\<`Response`\>

## Example

```ts
// src/middleware.ts
import { cloudflareMiddleware } from '@czap/cloudflare';
import { boundaries } from 'virtual:czap/boundaries';

export const onRequest = cloudflareMiddleware({
  binding: 'CZAP_BOUNDARY_CACHE',
  manifest: boundaries, // serves every boundary; `boundary: 'viewport'` narrows
});
```

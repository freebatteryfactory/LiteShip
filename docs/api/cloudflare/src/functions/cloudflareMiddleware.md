[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [cloudflare/src](../README.md) / cloudflareMiddleware

# Function: cloudflareMiddleware()

> **cloudflareMiddleware**(`config`): (`context`, `next`) => `Promise`\<`Response`\>

Defined in: [cloudflare/src/middleware.ts:89](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L89)

Astro middleware factory wired for Cloudflare Workers KV boundary caching.

## Parameters

### config

[`CloudflareMiddlewareConfig`](../interfaces/CloudflareMiddlewareConfig.md)

## Returns

(`context`, `next`) => `Promise`\<`Response`\>

## Example

```ts
// src/middleware.ts
import { cloudflareMiddleware } from '@czap/cloudflare';
export const onRequest = cloudflareMiddleware({
  binding: 'CZAP_BOUNDARY_CACHE',
  boundaryId: 'sha256:…',
  compile: async () => ({ css: '', propertyRegistrations: [], containerQueries: [] }),
});
```

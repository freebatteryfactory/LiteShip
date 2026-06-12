[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [cloudflare/src](../README.md) / cloudflareMiddleware

# Function: cloudflareMiddleware()

> **cloudflareMiddleware**(`config`): (`context`, `next`) => `Promise`\<`Response`\>

Defined in: [cloudflare/src/middleware.ts:185](https://github.com/heyoub/LiteShip/blob/main/packages/cloudflare/src/middleware.ts#L185)

Astro middleware factory wired for Cloudflare Workers KV boundary caching.

The boundary identity and precompiled outputs come from the
build-derived manifest (`virtual:czap/boundaries`), so no id is ever
hand-typed; `boundaryId` + `compile` remain as an escape hatch for
custom hosts.

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
  manifest: boundaries,
  boundary: 'viewport',
});
```

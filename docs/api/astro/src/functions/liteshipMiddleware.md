[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / liteshipMiddleware

# Function: liteshipMiddleware()

> **liteshipMiddleware**(`config?`): (`context`, `next`) => `Promise`\<`Response`\>

Defined in: [astro/src/middleware.ts:131](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/middleware.ts#L131)

Create the liteship edge middleware.

Parses Client Hints from request headers, computes tier detection,
injects results into `context.locals.liteship`, and sets Client Hints
response headers (`Accept-CH`, `Critical-CH`).

## Parameters

### config?

[`LiteshipMiddlewareConfig`](../interfaces/LiteshipMiddlewareConfig.md)

## Returns

(`context`, `next`) => `Promise`\<`Response`\>

## Example

```ts
// Astro middleware (src/middleware.ts)
import { liteshipMiddleware } from '@liteship/astro';
export const onRequest = liteshipMiddleware();
```

/**
 * @liteship/cloudflare — Cloudflare Workers siteAdapter and Astro middleware glue.
 *
 * @module
 */

export {
  createCloudflareEdgeCache,
  resolveKvBinding,
  type CloudflareCacheApi,
  type CloudflareEdgeCacheOptions,
  type CloudflareWorkersEnv,
} from './edge-cache.js';

export { cloudflareMiddleware, type CloudflareMiddlewareConfig } from './middleware.js';

export { cloudflareAdapterCapsule } from './capsules/cloudflare-adapter.js';

// Test-only env mutators (`setWorkersEnvForTesting` / `resetWorkersEnvForTesting` /
// `getDefaultWorkersEnv`) live behind `@liteship/cloudflare/testing` (see ./testing.ts) so
// they stay off the front-door surface. Inject env in production via the `env` option
// on `CloudflareMiddlewareConfig`.

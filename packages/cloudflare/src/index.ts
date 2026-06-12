/**
 * @czap/cloudflare — Cloudflare Workers siteAdapter and Astro middleware glue.
 *
 * @module
 */

export {
  createCloudflareEdgeCache,
  resolveKvBinding,
  type CloudflareEdgeCacheOptions,
  type CloudflareWorkersEnv,
} from './edge-cache.js';

export { cloudflareMiddleware, type CloudflareMiddlewareConfig } from './middleware.js';

export { cloudflareAdapterCapsule } from './capsules/cloudflare-adapter.js';

// --- testing ---

/** @group Testing */
export { getDefaultWorkersEnv, resetWorkersEnvForTesting, setWorkersEnvForTesting } from './middleware.js';

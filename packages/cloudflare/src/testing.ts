/**
 * Test-only entrypoint for `@czap/cloudflare`. Imported as `@czap/cloudflare/testing`.
 *
 * `setWorkersEnvForTesting` / `resetWorkersEnvForTesting` mutate the module-level
 * Workers-env cache and are a footgun in production code paths; `getDefaultWorkersEnv`
 * inspects that same cache. They are intentionally partitioned off the main package
 * entry so a consumer cannot reach them by importing `@czap/cloudflare` directly — the
 * documented way to inject env is the `env` option on {@link CloudflareMiddlewareConfig}.
 *
 * @module
 */

export { getDefaultWorkersEnv, resetWorkersEnvForTesting, setWorkersEnvForTesting } from './middleware.js';

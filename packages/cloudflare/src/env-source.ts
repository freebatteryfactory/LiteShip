/**
 * Owner of the Cloudflare Workers env source shared by the two edge seams
 * (`middleware.ts` + `cache-provider.ts`): the module-level env cache, its
 * workerd runtime priming helper, and the function/value/default resolver.
 *
 * @module
 */

import { Diagnostics } from '@czap/core';
import type { CloudflareWorkersEnv } from './edge-cache.js';

/**
 * The `env` override carried by both edge seams. A function is used as-is (a
 * per-request getter so workerd env timing is respected); a value is wrapped
 * in a getter; omitting it falls back to the runtime-primed
 * {@link getDefaultWorkersEnv}.
 */
export interface EnvSourceConfig {
  readonly env?: CloudflareWorkersEnv | (() => CloudflareWorkersEnv);
}

let cachedWorkersEnv: CloudflareWorkersEnv | undefined;

/** Read the workerd execution env captured by {@link loadWorkersEnvFromRuntime} or seeded for tests. Returns `{}` until one of those has run. */
export function getDefaultWorkersEnv(): CloudflareWorkersEnv {
  return cachedWorkersEnv ?? {};
}

/**
 * Seed the default Workers env (for unit tests or custom hosts).
 */
export function setWorkersEnvForTesting(env: CloudflareWorkersEnv): void {
  cachedWorkersEnv = env;
}

/**
 * Reset cached env between tests.
 */
export function resetWorkersEnvForTesting(): void {
  cachedWorkersEnv = undefined;
}

/** Load env from the workerd runtime module when available. */
export async function loadWorkersEnvFromRuntime(): Promise<CloudflareWorkersEnv> {
  if (cachedWorkersEnv) return cachedWorkersEnv;
  try {
    const mod = await import('cloudflare:workers');
    cachedWorkersEnv = mod.env as CloudflareWorkersEnv;
    return cachedWorkersEnv;
  } catch {
    Diagnostics.warnOnce({
      source: 'czap/cloudflare.middleware',
      code: 'workers-env-unavailable',
      message:
        'cloudflare:workers is unavailable (not running on workerd), so Workers env bindings cannot be read from the runtime module. ' +
        'Fix: pass the env option to cloudflareMiddleware in tests or custom hosts.',
    });
    return getDefaultWorkersEnv();
  }
}

/**
 * Resolve the Workers env getter from a config's `env` option: a function is
 * returned as-is, a value is wrapped in a getter, and an omitted option falls
 * back to the runtime-primed {@link getDefaultWorkersEnv}.
 */
export function resolveEnvSource(config: EnvSourceConfig): () => CloudflareWorkersEnv {
  if (typeof config.env === 'function') return config.env;
  if (config.env) return () => config.env as CloudflareWorkersEnv;
  return () => getDefaultWorkersEnv();
}

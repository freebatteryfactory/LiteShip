/**
 * Shared child-process env for the Cloudflare integration scripts — ONE copy of the
 * workerd/wrangler sandbox isolation, shared by test-cloudflare-astro.ts (build path)
 * and test-cloudflare-dev.ts (dev path) so a change to the isolation root or env keys
 * fixes both jobs at once.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/** Writable XDG config root so workerd/wrangler never touch ~/.config in CI sandboxes. */
export const WRANGLER_CONFIG_HOME = resolve(import.meta.dirname, '..', '..', '.czap', 'wrangler-test');

/**
 * Build the child env: XDG isolation + stable (uncolored) output. Callers merge their
 * additions via `overrides` (e.g. the dev harness adds telemetry-off and a PATH prefix).
 */
export function cloudflareChildEnv(overrides: Record<string, string> = {}): Record<string, string> {
  mkdirSync(WRANGLER_CONFIG_HOME, { recursive: true });
  return { FORCE_COLOR: '0', XDG_CONFIG_HOME: WRANGLER_CONFIG_HOME, ...overrides };
}

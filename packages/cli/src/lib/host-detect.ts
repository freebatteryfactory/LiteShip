/**
 * host-detect — recognize a LiteShip consumer app's host framework.
 *
 * A consumer app delegates its real work (build / dev) to the host framework
 * whose config sits beside `liteship.config.ts`: an Astro app (`astro.config.*`)
 * or a Vite app (`vite.config.*`). This module is the single source for that
 * detection so `liteship build` and `liteship dev` recognize hosts identically.
 *
 * @module
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** The recognized consumer-app host build backends. */
export type BuildHost = 'astro' | 'vite';

/** Config-file basenames that identify each host, in detection order. */
export const HOST_CONFIGS: ReadonlyArray<{ readonly host: BuildHost; readonly bases: readonly string[] }> = [
  { host: 'astro', bases: ['astro.config.ts', 'astro.config.mts', 'astro.config.mjs', 'astro.config.js'] },
  { host: 'vite', bases: ['vite.config.ts', 'vite.config.mts', 'vite.config.mjs', 'vite.config.js'] },
];

/** Detect the consumer app's host build backend from the config files beside `liteship.config.ts`. */
export function detectHost(cwd: string): BuildHost | null {
  for (const { host, bases } of HOST_CONFIGS) {
    if (bases.some((base) => existsSync(resolve(cwd, base)))) return host;
  }
  return null;
}

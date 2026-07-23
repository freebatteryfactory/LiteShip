/**
 * Project-config loading for the Vite/Astro composition root.
 *
 * `liteship.config.ts` is authored TypeScript, so Vite's own config loader is
 * the one execution authority. The loaded value is then re-addressed through
 * `defineConfig` before any host projection may consume it: a hand-written
 * lookalike or stale/tampered id is rejected loudly rather than silently
 * widening into plugin defaults.
 *
 * @module
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Config, defineConfig, type Config as LiteshipConfig } from '@liteship/core';
import { ValidationError } from '@liteship/error';
import { loadConfigFromFile, type ConfigEnv } from 'vite';
import type { PluginConfig } from './plugin.js';

/** The one project config filename LiteShip hosts load. */
export const PROJECT_CONFIG_FILE = 'liteship.config.ts';

/** Loaded config plus the host projections derived from that exact value. */
export interface LoadedProjectConfig {
  readonly path: string;
  readonly config: LiteshipConfig;
  readonly vite: PluginConfig;
  readonly astro: ReturnType<typeof Config.toAstroConfig>;
}

/** Narrow Vite's loader behind a testable capability without mocking a module. */
export type ProjectConfigLoader = typeof loadConfigFromFile;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate both the public shape and the content identity minted by defineConfig.
 * Re-addressing is stronger than tag-only duck typing and remains coupled to the
 * canonical Config owner rather than duplicating its hashing law here.
 */
export function validateProjectConfig(value: unknown, source: string): LiteshipConfig {
  if (
    !isRecord(value) ||
    value['_tag'] !== 'ConfigDef' ||
    typeof value['id'] !== 'string' ||
    !isRecord(value['boundaries']) ||
    !isRecord(value['tokens']) ||
    !isRecord(value['themes']) ||
    !isRecord(value['styles']) ||
    (value['vite'] !== undefined && !isRecord(value['vite'])) ||
    (value['astro'] !== undefined && !isRecord(value['astro']))
  ) {
    throw ValidationError(
      'vite-project-config',
      `${source} must default-export the Config returned by defineConfig({ ... }).`,
    );
  }

  const candidate = value as unknown as LiteshipConfig;
  const readdressed = defineConfig({
    boundaries: candidate.boundaries,
    tokens: candidate.tokens,
    themes: candidate.themes,
    styles: candidate.styles,
    ...(candidate.vite !== undefined ? { vite: candidate.vite } : {}),
    ...(candidate.astro !== undefined ? { astro: candidate.astro } : {}),
  });
  if (candidate.id !== readdressed.id) {
    throw ValidationError(
      'vite-project-config',
      `${source} carries config id ${candidate.id}, but its current contents address to ${readdressed.id}. ` +
        'Export defineConfig({ ... }) directly instead of mutating or copying a Config value.',
    );
  }
  return candidate;
}

/**
 * Load and validate `<root>/liteship.config.ts`. Absence is allowed for the
 * low-level convention-only Vite plugin; malformed or unevaluable presence is
 * never converted into an empty config.
 */
export async function loadProjectConfig(
  root: string,
  env: ConfigEnv,
  loader: ProjectConfigLoader = loadConfigFromFile,
): Promise<LoadedProjectConfig | null> {
  const path = resolve(root, PROJECT_CONFIG_FILE);
  if (!existsSync(path)) return null;

  const loaded = await loader(env, path, root);
  if (loaded === null) {
    throw ValidationError('vite-project-config', `Vite could not load the present project config at ${path}.`);
  }
  const config = validateProjectConfig(loaded.config, path);
  return {
    path,
    config,
    vite: Config.toViteConfig(config) as PluginConfig,
    astro: Config.toAstroConfig(config),
  };
}

/** Root project config first; explicit host options win at their authored keys. */
export function mergePluginConfig(project: PluginConfig | undefined, explicit: PluginConfig | undefined): PluginConfig {
  return {
    ...(project ?? {}),
    ...(explicit ?? {}),
    ...((project?.dirs !== undefined || explicit?.dirs !== undefined) && {
      dirs: { ...(project?.dirs ?? {}), ...(explicit?.dirs ?? {}) },
    }),
    ...((project?.quantize !== undefined || explicit?.quantize !== undefined) && {
      quantize: { ...(project?.quantize ?? {}), ...(explicit?.quantize ?? {}) },
    }),
  };
}

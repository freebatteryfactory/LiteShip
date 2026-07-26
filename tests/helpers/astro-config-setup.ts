import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { integration } from '@liteship/astro';

type LiteShipAstroIntegration = ReturnType<typeof integration>;
type ConfigSetupHook = NonNullable<LiteShipAstroIntegration['hooks']['astro:config:setup']>;
type ConfigSetupOptions = Parameters<ConfigSetupHook>[0];

/**
 * Run a synthetic Astro config setup against an empty isolated project root.
 *
 * Synthetic hook tests must neither discover the repository's real
 * `liteship.config.ts` nor observe the async-capable hook before it settles.
 * Tests that exercise a real root config deliberately use their own planted
 * project roots instead of this helper.
 */
export async function runIsolatedAstroConfigSetup(
  astroIntegration: LiteShipAstroIntegration,
  overrides: Partial<ConfigSetupOptions> = {},
): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'liteship-astro-setup-'));
  const srcDir = join(root, 'src');
  mkdirSync(srcDir, { recursive: true });

  try {
    const overrideConfig = (overrides.config ?? {}) as ConfigSetupOptions['config'];
    const setup = astroIntegration.hooks['astro:config:setup'];
    if (setup === undefined) throw new Error(`${astroIntegration.name} does not expose astro:config:setup`);
    const result = setup({
      ...overrides,
      config: {
        ...overrideConfig,
        root: pathToFileURL(`${root}/`),
        srcDir: pathToFileURL(`${srcDir}/`),
      },
    } as ConfigSetupOptions);
    await Promise.resolve(result);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

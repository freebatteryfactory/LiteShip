/** Root liteship.config.ts loading, validation, and virtual projection. */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineBoundary, defineConfig } from '@liteship/core';
import { plugin } from '../../../packages/vite/src/plugin.js';
import { loadProjectConfig, validateProjectConfig } from '../../../packages/vite/src/project-config.js';

const roots: string[] = [];
const ENV = { command: 'build' as const, mode: 'production' };

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-project-config-'));
  roots.push(root);
  writeFileSync(join(root, 'liteship.config.ts'), '// loader seam owns evaluation in this unit proof\n');
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('liteship.config.ts host composition', () => {
  it('keeps Vite config evaluation behind a type-only/lazy runtime boundary', () => {
    const source = readFileSync(join(import.meta.dirname, '../../../packages/vite/src/project-config.ts'), 'utf8');
    expect(source).not.toMatch(/import\s*\{[^}]*loadConfigFromFile[^}]*\}\s*from\s*['"]vite['"]/);
    expect(source).toContain("const viteModule = 'vite'");
  });

  it('loads one validated Config and derives its Vite/Astro projections', async () => {
    const root = fixture();
    const boundary = defineBoundary({
      input: 'viewport.width',
      at: [
        [0, 'small'],
        [900, 'large'],
      ],
    });
    const config = defineConfig({
      boundaries: { layout: boundary },
      vite: { hmr: false, environments: ['server'] },
      astro: { adaptive: true },
    });
    const loader = vi.fn(async () => ({ path: join(root, 'liteship.config.ts'), config, dependencies: [] }));

    const loaded = await loadProjectConfig(root, ENV, loader);
    expect(loader).toHaveBeenCalledWith(ENV, join(root, 'liteship.config.ts'), root);
    expect(loaded).toMatchObject({
      path: join(root, 'liteship.config.ts'),
      config,
      vite: { hmr: false, environments: ['server'] },
      astro: { adaptive: true },
    });
  });

  it('rejects a lookalike whose id does not address its current contents', () => {
    const valid = defineConfig({});
    expect(() => validateProjectConfig({ ...valid, id: 'fnv1a:00000000' }, 'fixture/liteship.config.ts')).toThrow(
      /current contents address/,
    );
    expect(() => validateProjectConfig({}, 'fixture/liteship.config.ts')).toThrow(/must default-export/);
  });

  it('returns the immutable re-addressed snapshot, never the mutable admitted candidate', async () => {
    const root = fixture();
    const authored = defineConfig({
      vite: { hmr: false, environments: ['server'] },
      astro: { adaptive: true, edgeRuntime: false },
    });
    const mutableVite = { hmr: false, environments: ['server'] };
    const mutableAstro = { adaptive: true, edgeRuntime: false };
    const candidate = { ...authored, vite: mutableVite, astro: mutableAstro };

    const accepted = validateProjectConfig(candidate, 'fixture/liteship.config.ts');
    expect(accepted).not.toBe(candidate);
    expect(Object.isFrozen(accepted)).toBe(true);
    expect(Object.isFrozen(accepted.vite)).toBe(true);
    expect(Object.isFrozen(accepted.astro)).toBe(true);

    const loader = vi.fn(async () => ({ path: join(root, 'liteship.config.ts'), config: candidate, dependencies: [] }));
    const loaded = await loadProjectConfig(root, ENV, loader);
    expect(loaded?.config).not.toBe(candidate);

    const vitePlugin = plugin(undefined, () => null, loader);
    const configHook = vitePlugin.config as (user: { root: string }, env: typeof ENV) => unknown;
    await configHook({ root }, ENV);
    const loadHook = vitePlugin.load as (id: string) => unknown;
    const virtualSource = await loadHook('\0virtual:liteship/config');
    expect(virtualSource).toContain('"hmr":false');
    expect(virtualSource).toContain('"adaptive":true');

    mutableVite.hmr = true;
    mutableVite.environments.push('client');
    mutableAstro.adaptive = false;
    mutableAstro.edgeRuntime = true;

    expect(accepted.vite).toEqual({ hmr: false, environments: ['server'] });
    expect(accepted.astro).toEqual({ adaptive: true, edgeRuntime: false });
    expect(loaded?.vite).toEqual({ hmr: false, environments: ['server'] });
    expect(loaded?.astro).toEqual({ adaptive: true, edgeRuntime: false });
    expect(await loadHook('\0virtual:liteship/config')).toBe(virtualSource);
  });

  it('threads the loaded Config through the Vite plugin and virtual module; explicit host options win', async () => {
    const root = fixture();
    const config = defineConfig({ vite: { hmr: false, environments: ['server'] }, astro: { edgeRuntime: true } });
    const loader = vi.fn(async () => ({ path: join(root, 'liteship.config.ts'), config, dependencies: [] }));
    const vitePlugin = plugin({ hmr: true }, () => null, loader);
    const configHook = vitePlugin.config as (user: { root: string }, env: typeof ENV) => unknown;
    const projected = await configHook({ root }, ENV);
    expect(projected).toMatchObject({ environments: { server: expect.any(Object) } });
    expect(vitePlugin.transformIndexHtml?.()).toEqual([
      expect.objectContaining({ children: "import 'virtual:liteship/hmr-client';" }),
    ]);

    const loadHook = vitePlugin.load as (id: string) => unknown;
    const source = await loadHook('\0virtual:liteship/config');
    expect(source).toContain(config.id);
    expect(source).toContain('"edgeRuntime":true');
    expect(source).not.toContain('config = null');
  });
});

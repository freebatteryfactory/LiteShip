/** Root liteship.config.ts loading, validation, and virtual projection. */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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

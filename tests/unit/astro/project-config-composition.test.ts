/** Astro's Vite composition loads the same validated root LiteShip config. */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Plugin } from 'vite';
import { defineConfig } from '@liteship/core';
import { integration } from '@liteship/astro';

describe('Astro project-config composition', () => {
  it('the integration-installed Vite plugin loads the root liteship.config.ts projection', async () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-astro-project-config-'));
    try {
      const authored = defineConfig({
        vite: { environments: ['server'] },
        astro: { adaptive: false, edgeRuntime: true },
      });
      writeFileSync(join(root, 'liteship.config.ts'), `export default ${JSON.stringify(authored)};\n`);

      let vitePlugin: Plugin | undefined;
      const directives: string[] = [];
      const middleware: unknown[] = [];
      await integration().hooks['astro:config:setup']({
        updateConfig(update: { vite?: { plugins?: Plugin[] } }) {
          vitePlugin = update.vite?.plugins?.[0];
        },
        addClientDirective(value: { name: string }) {
          directives.push(value.name);
        },
        addMiddleware(value: unknown) {
          middleware.push(value);
        },
        injectScript() {},
        logger: { info() {} },
        command: 'build',
        config: { root: pathToFileURL(`${root}/`), srcDir: pathToFileURL(`${root}/src/`) },
      } as never);

      expect(vitePlugin?.name).toBe('@liteship/vite');
      expect(directives).not.toContain('adaptive');
      expect(middleware).toHaveLength(1);
      const hook = vitePlugin!.config as (config: { root: string }, env: { command: 'build'; mode: string }) => unknown;
      const projected = await hook({ root }, { command: 'build', mode: 'production' });
      expect(projected).toMatchObject({ environments: { server: expect.any(Object) } });

      const load = vitePlugin!.load as (id: string) => unknown;
      expect(await load('\0virtual:liteship/config')).toContain(authored.id);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('explicit integration options override the root Astro projection', async () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-astro-project-config-explicit-'));
    try {
      const authored = defineConfig({ astro: { adaptive: false, edgeRuntime: true } });
      writeFileSync(join(root, 'liteship.config.ts'), `export default ${JSON.stringify(authored)};\n`);
      const directives: string[] = [];
      const middleware: unknown[] = [];
      await integration({ adaptive: true, middleware: false }).hooks['astro:config:setup']({
        updateConfig() {},
        addClientDirective(value: { name: string }) {
          directives.push(value.name);
        },
        addMiddleware(value: unknown) {
          middleware.push(value);
        },
        injectScript() {},
        logger: { info() {} },
        command: 'build',
        config: { root: pathToFileURL(`${root}/`), srcDir: pathToFileURL(`${root}/src/`) },
      } as never);
      expect(directives).toContain('adaptive');
      expect(middleware).toHaveLength(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

/** Astro's Vite composition loads the same validated root LiteShip config. */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Plugin } from 'vite';
import { defineConfig } from '@liteship/core';
import { integration } from '@liteship/astro';

describe('Astro project-config composition', () => {
  it('the integration-installed Vite plugin loads the root liteship.config.ts projection', async () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-astro-project-config-'));
    try {
      const authored = defineConfig({ vite: { environments: ['server'] }, astro: { adaptive: true } });
      writeFileSync(join(root, 'liteship.config.ts'), `export default ${JSON.stringify(authored)};\n`);

      let vitePlugin: Plugin | undefined;
      integration().hooks['astro:config:setup']({
        updateConfig(update: { vite?: { plugins?: Plugin[] } }) {
          vitePlugin = update.vite?.plugins?.[0];
        },
        addClientDirective() {},
        injectScript() {},
        logger: { info() {} },
      } as never);

      expect(vitePlugin?.name).toBe('@liteship/vite');
      const hook = vitePlugin!.config as (config: { root: string }, env: { command: 'build'; mode: string }) => unknown;
      const projected = await hook({ root }, { command: 'build', mode: 'production' });
      expect(projected).toMatchObject({ environments: { server: expect.any(Object) } });

      const load = vitePlugin!.load as (id: string) => unknown;
      expect(await load('\0virtual:liteship/config')).toContain(authored.id);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

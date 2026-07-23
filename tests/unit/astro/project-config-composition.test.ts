/** Astro's Vite composition loads the same validated root LiteShip config. */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Plugin } from 'vite';
import { defineBoundary, defineConfig, defineToken } from '@liteship/core';
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

  it('shares merged project and explicit primitive dirs across watcher and nested Vite plugin', async () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-astro-project-dirs-'));
    const externalRoot = mkdtempSync(join(tmpdir(), 'liteship-astro-external-dirs-'));
    const projectBoundaryDir = join(externalRoot, 'project-boundaries');
    const explicitBoundaryDir = join(root, 'explicit-boundaries');
    const tokenDir = join(externalRoot, 'tokens');
    const themeDir = join(root, 'project-themes');
    const styleDir = join(root, 'project-styles');
    const srcDir = join(root, 'src');
    for (const dir of [projectBoundaryDir, explicitBoundaryDir, tokenDir, themeDir, styleDir, srcDir]) {
      mkdirSync(dir, { recursive: true });
    }

    const projectBoundary = defineBoundary({ input: 'viewport.width', at: [[0, 'project']] });
    const explicitBoundary = defineBoundary({ input: 'viewport.width', at: [[0, 'explicit']] });
    const token = defineToken({ name: 'projectToken', category: 'color', value: '#123456' });
    const boundaryModule = (name: string, boundary: typeof projectBoundary) =>
      `export const ${name} = ${JSON.stringify(boundary)};\n`;
    writeFileSync(join(projectBoundaryDir, 'boundaries.ts'), boundaryModule('projectBoundary', projectBoundary));
    writeFileSync(join(explicitBoundaryDir, 'boundaries.ts'), boundaryModule('explicitBoundary', explicitBoundary));
    writeFileSync(join(tokenDir, 'tokens.ts'), `export const projectToken = ${JSON.stringify(token)};\n`);
    writeFileSync(join(themeDir, 'themes.ts'), 'export const projectTheme = {};\n');
    writeFileSync(join(styleDir, 'styles.ts'), 'export const projectStyle = {};\n');

    try {
      const authored = defineConfig({
        vite: {
          dirs: {
            boundary: projectBoundaryDir,
            token: tokenDir,
            theme: themeDir,
            style: styleDir,
          },
        },
      });
      writeFileSync(join(root, 'liteship.config.ts'), `export default ${JSON.stringify(authored)};\n`);

      const watched: string[] = [];
      let vitePlugin: Plugin | undefined;
      await integration({ vite: { dirs: { boundary: explicitBoundaryDir } } }).hooks['astro:config:setup']({
        updateConfig(update: { vite?: { plugins?: Plugin[] } }) {
          vitePlugin = update.vite?.plugins?.[0];
        },
        addClientDirective() {},
        addWatchFile(file: string) {
          watched.push(file);
        },
        injectScript() {},
        logger: { info() {} },
        command: 'build',
        config: { root: pathToFileURL(`${root}/`), srcDir: pathToFileURL(`${srcDir}/`) },
      } as never);

      expect(watched).toContain(join(explicitBoundaryDir, 'boundaries.ts'));
      expect(watched).not.toContain(join(projectBoundaryDir, 'boundaries.ts'));
      expect(watched).toEqual(
        expect.arrayContaining([join(tokenDir, 'tokens.ts'), join(themeDir, 'themes.ts'), join(styleDir, 'styles.ts')]),
      );

      const configHook = vitePlugin!.config as (
        config: { root: string },
        env: { command: 'build'; mode: string },
      ) => Promise<unknown>;
      await configHook({ root }, { command: 'build', mode: 'production' });
      vitePlugin!.configResolved?.({ root, command: 'build' } as never);

      const load = vitePlugin!.load as (id: string) => Promise<string | undefined>;
      const boundaries = await load.call(undefined as never, '\0virtual:liteship/boundaries');
      const tokens = await load.call(undefined as never, '\0virtual:liteship/tokens');
      expect(boundaries).toContain('explicitBoundary');
      expect(boundaries).not.toContain('projectBoundary');
      expect(tokens).toContain(token.id);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(externalRoot, { recursive: true, force: true });
    }
  });
});

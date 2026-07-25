/**
 * Astro host composition laws that sit above the directive runtime suites.
 *
 * These properties prove configuration precedence and directive registration;
 * directive behavior and its fault schedules remain owned by the focused Astro
 * directive tests rather than being duplicated here.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { defineConfig, type Config } from '@liteship/core';
import { integration, type IntegrationConfig } from '@liteship/astro';
import type { PluginConfig } from '@liteship/vite';
import { mergePluginConfig, validateProjectConfig } from '../../packages/vite/src/project-config.js';
import { runIsolatedAstroConfigSetup } from '../helpers/astro-config-setup.js';

const optionalBoolean = fc.option(fc.boolean(), { nil: undefined });
const optionalPath = fc.option(fc.stringMatching(/^[a-z][a-z0-9-]{0,12}$/), { nil: undefined });

function maybe<K extends string, V>(key: K, value: V | undefined): Partial<Record<K, V>> {
  return (value === undefined ? {} : { [key]: value }) as Partial<Record<K, V>>;
}

function mutableConfigCopy(config: Config): Record<string, unknown> {
  return {
    ...config,
    boundaries: { ...config.boundaries },
    tokens: { ...config.tokens },
    themes: { ...config.themes },
    styles: { ...config.styles },
    ...(config.vite === undefined ? {} : { vite: { ...config.vite, dirs: { ...config.vite.dirs } } }),
    ...(config.astro === undefined ? {} : { astro: { ...config.astro } }),
  };
}

describe('Astro host contract properties', () => {
  it('merges project config with explicit top-level and nested precedence without mutating either input', () => {
    fc.assert(
      fc.property(
        fc.record({
          projectHmr: optionalBoolean,
          explicitHmr: optionalBoolean,
          projectBoundary: optionalPath,
          explicitBoundary: optionalPath,
          projectToken: optionalPath,
          explicitContainer: optionalPath,
          projectContainer: optionalPath,
        }),
        (sample) => {
          const project: PluginConfig = {
            ...maybe('hmr', sample.projectHmr),
            dirs: {
              ...maybe('boundary', sample.projectBoundary),
              ...maybe('token', sample.projectToken),
            },
            quantize: { ...maybe('container', sample.projectContainer) },
          };
          const explicit: PluginConfig = {
            ...maybe('hmr', sample.explicitHmr),
            dirs: {
              ...maybe('boundary', sample.explicitBoundary),
            },
            quantize: { ...maybe('container', sample.explicitContainer) },
          };
          const beforeProject = structuredClone(project);
          const beforeExplicit = structuredClone(explicit);

          const merged = mergePluginConfig(project, explicit);

          expect(project).toEqual(beforeProject);
          expect(explicit).toEqual(beforeExplicit);
          expect(merged.hmr).toBe(sample.explicitHmr ?? sample.projectHmr);
          expect(merged.dirs?.boundary).toBe(sample.explicitBoundary ?? sample.projectBoundary);
          expect(merged.dirs?.token).toBe(sample.projectToken);
          expect(merged.quantize?.container).toBe(sample.explicitContainer ?? sample.projectContainer);
        },
      ),
      { numRuns: 64 },
    );
  });

  it('admits an immutable re-addressed project config and rejects stale nested mutations', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), optionalPath, (hmr, adaptive, boundaryDir) => {
        const authored = defineConfig({
          vite: { hmr, dirs: { ...maybe('boundary', boundaryDir) } },
          astro: { adaptive, edgeRuntime: !adaptive },
        });
        const mutable = mutableConfigCopy(authored);
        const admitted = validateProjectConfig(mutable, '/fixture/liteship.config.ts');

        expect(admitted.id).toBe(authored.id);
        expect(Object.isFrozen(admitted)).toBe(true);
        expect(Object.isFrozen(admitted.vite)).toBe(true);
        expect(Object.isFrozen(admitted.astro)).toBe(true);

        (mutable['vite'] as { hmr: boolean }).hmr = !hmr;
        expect(admitted.vite?.hmr).toBe(hmr);

        const stale = mutableConfigCopy(authored);
        (stale['astro'] as { adaptive: boolean }).adaptive = !adaptive;
        expect(() => validateProjectConfig(stale, '/fixture/liteship.config.ts')).toThrow(/current contents address/);
      }),
      { numRuns: 48 },
    );
  });

  it('registers exactly the directive set selected by every feature toggle', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          adaptive: fc.boolean(),
          stream: fc.boolean(),
          llm: fc.boolean(),
          worker: fc.boolean(),
          gpu: fc.boolean(),
          wasm: fc.boolean(),
          motion: fc.boolean(),
        }),
        async (toggles) => {
          const options: IntegrationConfig = {
            adaptive: toggles.adaptive,
            stream: { enabled: toggles.stream },
            llm: { enabled: toggles.llm },
            workers: { enabled: toggles.worker },
            gpu: { enabled: toggles.gpu },
            wasm: { enabled: toggles.wasm },
            motion: { enabled: toggles.motion },
          };
          const registered: string[] = [];
          await runIsolatedAstroConfigSetup(integration(options), {
            updateConfig() {},
            addClientDirective(value) {
              registered.push(value.name);
            },
            injectScript() {},
            logger: { info() {} } as never,
            command: 'build',
          });

          expect(registered).toEqual([
            ...(toggles.adaptive ? ['adaptive'] : []),
            'graph',
            ...(toggles.stream ? ['stream'] : []),
            ...(toggles.llm ? ['llm'] : []),
            ...(toggles.worker ? ['worker'] : []),
            ...(toggles.gpu ? ['gpu'] : []),
            ...(toggles.wasm ? ['wasm'] : []),
            ...(toggles.motion ? ['motion'] : []),
            'svg',
          ]);
        },
      ),
      { numRuns: 32 },
    );
  });
});

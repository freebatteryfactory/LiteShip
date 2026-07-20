/**
 * defineConfig() — content addressing, projections, freezing.
 */

import { describe, test, expect } from 'vitest';
import { defineBoundary } from '@liteship/core';
import { Config, defineConfig } from '@liteship/core';

const boundary = defineBoundary({
  input: 'viewport.width',
  at: [[0, 'mobile'], [768, 'desktop']] as const,
});

describe('defineConfig()', () => {
  test('returns a frozen object with _tag ConfigDef', () => {
    const cfg = defineConfig({ boundaries: { viewport: boundary } });
    expect(cfg._tag).toBe('ConfigDef');
    expect(Object.isFrozen(cfg)).toBe(true);
  });

  test('id is a ContentAddress (fnv1a: prefix)', () => {
    const cfg = defineConfig({ boundaries: { viewport: boundary } });
    expect(cfg.id).toMatch(/^fnv1a:[0-9a-f]{8}$/);
  });

  test('same input → same id (determinism)', () => {
    const input = { boundaries: { viewport: boundary } };
    const c1 = defineConfig(input);
    const c2 = defineConfig(input);
    expect(c1.id).toBe(c2.id);
  });

  test('different input → different id', () => {
    const c1 = defineConfig({ boundaries: { a: boundary } });
    const c2 = defineConfig({ boundaries: { b: boundary } });
    expect(c1.id).not.toBe(c2.id);
  });

  test('empty input defaults all collections to {}', () => {
    const cfg = defineConfig({});
    expect(cfg.boundaries).toEqual({});
    expect(cfg.tokens).toEqual({});
    expect(cfg.themes).toEqual({});
    expect(cfg.styles).toEqual({});
  });

  test('defineConfig() is an alias for defineConfig()', () => {
    const input = { boundaries: { viewport: boundary } };
    const cfg1 = defineConfig(input);
    const cfg2 = defineConfig(input);
    expect(cfg1.id).toBe(cfg2.id);
  });
});

describe('Config.toViteConfig()', () => {
  test('maps dirs from vite.dirs', () => {
    const cfg = defineConfig({ vite: { dirs: { boundary: '/custom/path' } } });
    const vite = Config.toViteConfig(cfg);
    expect(vite.dirs?.boundary).toBe('/custom/path');
  });

  test('returns PluginConfig without dirs when not set', () => {
    const cfg = defineConfig({});
    const vite = Config.toViteConfig(cfg);
    expect(vite.dirs).toBeUndefined();
  });

  test('maps hmr, environments, and wasm when present', () => {
    const cfg = defineConfig({
      vite: { hmr: false, environments: ['browser', 'server'], wasm: { enabled: true, path: '/wasm' } },
    });
    const vite = Config.toViteConfig(cfg);
    expect(vite.hmr).toBe(false);
    expect(vite.environments).toEqual(['browser', 'server']);
    expect(vite.wasm).toEqual({ enabled: true, path: '/wasm' });
  });

  test('omits undefined vite fields', () => {
    const cfg = defineConfig({ vite: { hmr: true } });
    const vite = Config.toViteConfig(cfg);
    expect(vite.dirs).toBeUndefined();
    expect(vite.environments).toBeUndefined();
    expect(vite.wasm).toBeUndefined();
  });
});

describe('Config.toAstroConfig()', () => {
  test('maps satellite field', () => {
    const cfg = defineConfig({ astro: { satellite: true } });
    const astro = Config.toAstroConfig(cfg);
    expect(astro.satellite).toBe(true);
  });

  test('maps edgeRuntime when present', () => {
    const cfg = defineConfig({ astro: { edgeRuntime: true } });
    expect(Config.toAstroConfig(cfg).edgeRuntime).toBe(true);
  });

  test('omits undefined astro fields', () => {
    const cfg = defineConfig({ astro: { satellite: false } });
    expect(Config.toAstroConfig(cfg).edgeRuntime).toBeUndefined();
  });
});

describe('Config.toTestAliases()', () => {
  test('returns @liteship/core alias pointing to packages/core', () => {
    const cfg = defineConfig({});
    const aliases = Config.toTestAliases(cfg, '/repo');
    expect(aliases['@liteship/core']).toContain('packages/core');
  });

  test('returns @liteship/vite alias pointing to packages/vite', () => {
    const cfg = defineConfig({});
    const aliases = Config.toTestAliases(cfg, '/repo');
    expect(aliases['@liteship/vite']).toContain('packages/vite');
  });

  test('includes @liteship/_spine alias', () => {
    const cfg = defineConfig({});
    const aliases = Config.toTestAliases(cfg, '/repo');
    expect(aliases['@liteship/_spine']).toContain('packages/_spine');
  });

  test('includes @liteship/canonical and @liteship/genui aliases', () => {
    const cfg = defineConfig({});
    const aliases = Config.toTestAliases(cfg, '/repo');
    expect(aliases['@liteship/canonical']).toContain('packages/canonical');
    expect(aliases['@liteship/genui']).toContain('packages/genui');
  });
});

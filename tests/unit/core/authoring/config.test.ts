/**
 * defineConfig() — content addressing, projections, freezing.
 */

import { describe, test, expect } from 'vitest';
import { defineBoundary } from '@liteship/core';
import { Config, defineConfig } from '@liteship/core';

const boundary = defineBoundary({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'desktop'],
  ] as const,
});

function assertConfigSnapshotTypesAreReadonly(): void {
  const cfg = defineConfig({
    boundaries: { viewport: boundary },
    vite: { dirs: { boundary: '/src' }, environments: ['browser'] },
  });
  // @ts-expect-error Config snapshot maps are immutable after definition.
  cfg.boundaries.extra = boundary;
  // @ts-expect-error Nested Config snapshot records are immutable after definition.
  cfg.vite!.dirs!.boundary = '/other';
  // @ts-expect-error Nested Config snapshot arrays expose no mutating methods.
  cfg.vite!.environments!.push('server');
}
void assertConfigSnapshotTypesAreReadonly;

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

  test('snapshots and recursively freezes authored data before identity and storage', () => {
    const authoredBoundary = defineBoundary({
      input: 'snapshot.width',
      at: [
        [0, 'compact'],
        [900, 'wide'],
      ] as const,
    });
    const authored = {
      boundaries: { viewport: authoredBoundary },
      vite: {
        dirs: { boundary: '/before' },
        environments: ['browser', 'server'] as ('browser' | 'server' | 'shader')[],
        wasm: { enabled: true, path: '/before.wasm' },
      },
    };
    const cfg = defineConfig(authored);
    const id = cfg.id;

    authored.vite.dirs.boundary = '/after';
    authored.vite.environments.push('shader');
    authored.vite.wasm.path = '/after.wasm';
    (authoredBoundary.thresholds as number[])[1] = 1200;

    expect(cfg.id).toBe(id);
    expect(cfg.vite).toEqual({
      dirs: { boundary: '/before' },
      environments: ['browser', 'server'],
      wasm: { enabled: true, path: '/before.wasm' },
    });
    expect(cfg.boundaries['viewport']?.thresholds).toEqual([0, 900]);
    expect(Object.isFrozen(cfg.boundaries)).toBe(true);
    expect(Object.isFrozen(cfg.boundaries['viewport'])).toBe(true);
    expect(Object.isFrozen(cfg.boundaries['viewport']?.thresholds)).toBe(true);
    expect(Object.isFrozen(cfg.vite)).toBe(true);
    expect(Object.isFrozen(cfg.vite?.dirs)).toBe(true);
    expect(Object.isFrozen(cfg.vite?.environments)).toBe(true);
    expect(Object.isFrozen(cfg.vite?.wasm)).toBe(true);
    expect(() => ((cfg.vite!.dirs as Record<string, string>).boundary = '/poison')).toThrow();

    const equivalent = defineConfig({
      boundaries: {
        viewport: defineBoundary({
          input: 'snapshot.width',
          at: [
            [0, 'compact'],
            [900, 'wide'],
          ] as const,
        }),
      },
      vite: {
        dirs: { boundary: '/before' },
        environments: ['browser', 'server'],
        wasm: { enabled: true, path: '/before.wasm' },
      },
    });
    expect(equivalent.id).toBe(id);
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
  test('maps adaptive field', () => {
    const cfg = defineConfig({ astro: { adaptive: true } });
    const astro = Config.toAstroConfig(cfg);
    expect(astro.adaptive).toBe(true);
  });

  test('maps edgeRuntime when present', () => {
    const cfg = defineConfig({ astro: { edgeRuntime: true } });
    expect(Config.toAstroConfig(cfg).edgeRuntime).toBe(true);
  });

  test('omits undefined astro fields', () => {
    const cfg = defineConfig({ astro: { adaptive: false } });
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

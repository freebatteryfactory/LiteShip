/**
 * defineConfig() — content addressing, projections, freezing.
 */

import { describe, test, expect } from 'vitest';
import { defineBoundary, defineStyle } from '@liteship/core';
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
    expect(() => ((authoredBoundary.thresholds as number[])[1] = 1200)).toThrow();

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

  test('preserves host-only boundary filters without making callback identity part of Config identity', () => {
    const firstFilter = (capabilities: Record<string, unknown>) => capabilities['webgpu'] === true;
    const secondFilter = (capabilities: Record<string, unknown>) => capabilities['webgpu'] === true;
    const firstBoundary = defineBoundary({
      input: 'device.width',
      at: [
        [0, 'off'],
        [800, 'on'],
      ] as const,
      spec: { experimentId: 'gpu-layout', deviceFilter: firstFilter },
    });
    const secondBoundary = defineBoundary({
      input: 'device.width',
      at: [
        [0, 'off'],
        [800, 'on'],
      ] as const,
      spec: { experimentId: 'gpu-layout', deviceFilter: secondFilter },
    });

    const sourceRegistry = { gated: firstBoundary };
    const first = defineConfig({ boundaries: sourceRegistry });
    const second = defineConfig({ boundaries: { gated: secondBoundary } });

    sourceRegistry.gated = boundary;
    expect(() => ((firstBoundary.thresholds as number[])[1] = 1200)).toThrow();

    expect(first.id).toBe(second.id);
    expect(first.boundaries['gated']).not.toBe(firstBoundary);
    expect(first.boundaries['gated']?.thresholds).toEqual([0, 800]);
    expect(first.boundaries['gated']?.spec?.deviceFilter).toBe(firstFilter);
    expect(first.boundaries['gated']?.spec?.deviceFilter?.({ webgpu: true })).toBe(true);
    expect(Object.isFrozen(first.boundaries)).toBe(true);
    expect(Object.isFrozen(first.boundaries['gated'])).toBe(true);
    expect(Object.isFrozen(first.boundaries['gated']?.spec)).toBe(true);
  });

  test('preserves host-only filters on boundaries embedded in configured styles', () => {
    const firstFilter = (capabilities: Record<string, unknown>) => capabilities['webgpu'] === true;
    const secondFilter = (capabilities: Record<string, unknown>) => capabilities['webgpu'] === true;
    const firstBoundary = defineBoundary({
      input: 'device.width',
      at: [
        [0, 'off'],
        [800, 'on'],
      ] as const,
      spec: { experimentId: 'gpu-style', deviceFilter: firstFilter },
    });
    const secondBoundary = defineBoundary({
      input: 'device.width',
      at: [
        [0, 'off'],
        [800, 'on'],
      ] as const,
      spec: { experimentId: 'gpu-style', deviceFilter: secondFilter },
    });
    const firstStyle = defineStyle({
      boundary: firstBoundary,
      base: { properties: { display: 'block' } },
      states: { on: { properties: { display: 'grid' } } },
    });
    const secondStyle = defineStyle({
      boundary: secondBoundary,
      base: { properties: { display: 'block' } },
      states: { on: { properties: { display: 'grid' } } },
    });

    const sourceRegistry = { responsive: firstStyle };
    const first = defineConfig({ styles: sourceRegistry });
    const second = defineConfig({ styles: { responsive: secondStyle } });
    const firstId = first.id;

    sourceRegistry.responsive = defineStyle({ base: { properties: { display: 'none' } } });
    expect(() => (firstStyle.base.properties['display'] = 'flex')).toThrow();
    expect(() => ((firstBoundary.thresholds as number[])[1] = 1200)).toThrow();

    expect(first.id).toBe(firstId);
    expect(first.id).toBe(second.id);
    expect(first.styles['responsive']).not.toBe(firstStyle);
    expect(first.styles['responsive']?.base.properties['display']).toBe('block');
    expect(first.styles['responsive']?.boundary?.thresholds).toEqual([0, 800]);
    expect(first.styles['responsive']?.boundary?.spec?.deviceFilter).toBe(firstFilter);
    expect(first.styles['responsive']?.boundary?.spec?.deviceFilter?.({ webgpu: true })).toBe(true);
    expect(Object.isFrozen(first.styles)).toBe(true);
    expect(Object.isFrozen(first.styles['responsive'])).toBe(true);
    expect(Object.isFrozen(first.styles['responsive']?.base)).toBe(true);
    expect(Object.isFrozen(first.styles['responsive']?.base.properties)).toBe(true);
    expect(Object.isFrozen(first.styles['responsive']?.boundary)).toBe(true);
    expect(Object.isFrozen(first.styles['responsive']?.boundary?.spec)).toBe(true);

    const changedPortableSpec = defineConfig({
      styles: {
        responsive: defineStyle({
          boundary: defineBoundary({
            input: 'device.width',
            at: [
              [0, 'off'],
              [800, 'on'],
            ] as const,
            spec: { experimentId: 'other-experiment', deviceFilter: firstFilter },
          }),
          base: { properties: { display: 'block' } },
          states: { on: { properties: { display: 'grid' } } },
        }),
      },
    });
    expect(changedPortableSpec.id).not.toBe(first.id);
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

  test('covers every curated @liteship/core export subpath before the root prefix', () => {
    const cfg = defineConfig({});
    const aliases = Config.toTestAliases(cfg, '/repo');
    const keys = Object.keys(aliases);
    const rootIndex = keys.indexOf('@liteship/core');
    const expected = [
      'authoring',
      'reactive',
      'motion',
      'graph',
      'evidence',
      'schema',
      'media',
      'clock',
      'wasm',
      'testing',
      'harness',
      'simulation',
      'fs-walk',
    ];

    expect(rootIndex).toBeGreaterThan(0);
    for (const subpath of expected) {
      const specifier = `@liteship/core/${subpath}`;
      expect(aliases[specifier], specifier).toContain(`packages/core/src/${subpath}`);
      expect(keys.indexOf(specifier), `${specifier} must precede the root prefix`).toBeLessThan(rootIndex);
    }
  });
});

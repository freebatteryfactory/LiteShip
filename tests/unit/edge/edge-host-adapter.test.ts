import { afterEach, describe, expect, test, vi } from 'vitest';
import { Boundary } from '@czap/core';
import { createEdgeHostAdapter, ClientHints, enumerateTierKeys } from '@czap/edge';
import * as ThemeCompiler from '../../../packages/edge/src/theme-compiler.js';
import { captureDiagnosticsAsync } from '../../helpers/diagnostics.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function makeHeaders(overrides: Record<string, string> = {}): Headers {
  return new Headers({
    'sec-ch-viewport-width': '1280',
    'sec-ch-device-memory': '8',
    ...overrides,
  });
}

/** Real minted address -- the KV keyspace is content-addressed (ADR-0003). */
const testBoundary = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'compact'],
    [768, 'wide'],
  ],
});

function makeKV() {
  const store = new Map<string, string>();
  return {
    store,
    kv: {
      async get(key: string) {
        return store.get(key) ?? null;
      },
      async put(key: string, value: string) {
        store.set(key, value);
      },
    },
  };
}

describe('createEdgeHostAdapter', () => {
  test('resolve parses Client Hints once per request', async () => {
    const parseSpy = vi.spyOn(ClientHints, 'parseClientHints');
    const adapter = createEdgeHostAdapter();
    await adapter.resolve(makeHeaders());
    expect(parseSpy).toHaveBeenCalledTimes(1);
  });

  test('resolves client hints and response headers without optional features', async () => {
    const adapter = createEdgeHostAdapter();
    const result = await adapter.resolve(makeHeaders());

    expect(result.capabilities.viewportWidth).toBe(1280);
    expect(result.tier.capTier).toBeDefined();
    expect(result.htmlAttributes).toContain('data-czap-tier=');
    expect(result.responseHeaders.acceptCH).toContain('Sec-CH-Viewport-Width');
    expect(result.cacheStatus).toBe('disabled');
  });

  test('compiles theme config from a host callback', async () => {
    const adapter = createEdgeHostAdapter({
      theme: ({ tier }) => ({
        prefix: 'brand',
        tokens: {
          'color.primary': tier.designTier,
          'space.base': 16,
        },
      }),
    });

    const result = await adapter.resolve(makeHeaders());
    expect(result.theme?.css).toContain('--brand-color-primary');
    expect(result.theme?.inlineStyle).toContain('--brand-space-base:16');
  });

  test('precompiles static themes once and reuses response headers across resolves', async () => {
    const compileSpy = vi.spyOn(ThemeCompiler, 'compileTheme');
    const adapter = createEdgeHostAdapter({
      theme: {
        prefix: 'brand',
        tokens: {
          'color.primary': '#00e5ff',
          'space.base': 16,
        },
      },
    });

    const first = await adapter.resolve(makeHeaders());
    const second = await adapter.resolve(makeHeaders({ 'sec-ch-device-memory': '4' }));

    expect(compileSpy).toHaveBeenCalledTimes(1);
    expect(second.theme).toEqual(first.theme);
    expect(second.responseHeaders).toBe(first.responseHeaders);
  });

  test('skips theme compilation when the host callback returns null', async () => {
    const compileSpy = vi.spyOn(ThemeCompiler, 'compileTheme');
    compileSpy.mockClear();
    const adapter = createEdgeHostAdapter({
      theme: () => null,
    });

    const result = await adapter.resolve(makeHeaders());

    expect(result.theme).toBeUndefined();
    expect(compileSpy).not.toHaveBeenCalled();
  });

  test('skips theme compilation when the host callback returns undefined', async () => {
    const compileSpy = vi.spyOn(ThemeCompiler, 'compileTheme');
    const adapter = createEdgeHostAdapter({
      theme: () => undefined,
    });

    const result = await adapter.resolve(makeHeaders());

    expect(result.theme).toBeUndefined();
    expect(compileSpy).not.toHaveBeenCalled();
  });

  test('fills boundary cache on miss and reuses it on hit', async () => {
    const { kv, store } = makeKV();
    let compileCalls = 0;
    const adapter = createEdgeHostAdapter({
      cache: {
        kv,
        boundaryId: testBoundary.id,
        compile: ({ tier }) => {
          compileCalls++;
          return {
            css: `.${tier.designTier}{color:red;}`,
            propertyRegistrations: '@property --x {}',
            containerQueries: '@container size {}',
          };
        },
      },
    });

    const first = await adapter.resolve(makeHeaders());
    const second = await adapter.resolve(makeHeaders());

    expect(first.cacheStatus).toBe('miss');
    expect(second.cacheStatus).toBe('hit');
    expect(first.compiledOutputs?.css).toContain('color:red');
    expect(second.compiledOutputs).toEqual(first.compiledOutputs);
    expect(compileCalls).toBe(1);
    expect(store.size).toBe(1);
  });

  test('passes compiled static theme through the cache compile context on misses', async () => {
    const { kv } = makeKV();
    const compile = vi.fn(({ theme }) => ({
      css: theme?.css ?? '',
      propertyRegistrations: '',
      containerQueries: '',
    }));
    const adapter = createEdgeHostAdapter({
      theme: {
        prefix: 'brand',
        tokens: {
          'color.primary': '#00e5ff',
        },
      },
      cache: {
        kv,
        boundaryId: testBoundary.id,
        compile,
      },
    });

    const result = await adapter.resolve(makeHeaders());

    expect(compile).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: expect.objectContaining({
          css: expect.stringContaining('--brand-color-primary'),
        }),
      }),
    );
    expect(result.cacheStatus).toBe('miss');
  });

  test('serves precompiled manifest outputs without touching KV', async () => {
    const { kv, store } = makeKV();
    const boundary = Boundary.make({
      input: 'viewport.width',
      at: [
        [0, 'compact'],
        [768, 'wide'],
      ],
    });
    const outputs = {
      css: '@container viewport-width (width >= 768px) {.czap-boundary {--gap: 24px;}}',
      propertyRegistrations: '',
      containerQueries: '@container viewport-width (width >= 768px) {.czap-boundary {--gap: 24px;}}',
    };
    const precompiled = Object.fromEntries(enumerateTierKeys().map((key) => [key, outputs]));
    const getSpy = vi.spyOn(kv, 'get');
    const adapter = createEdgeHostAdapter({
      cache: {
        kv,
        boundaryId: boundary.id,
        precompiled,
      },
    });

    const result = await adapter.resolve(makeHeaders());

    expect(result.cacheStatus).toBe('precompiled');
    expect(result.compiledOutputs).toEqual(outputs);
    expect(getSpy).not.toHaveBeenCalled();
    expect(store.size).toBe(0);
  });

  test('falls back to compile (and KV write-back) when the manifest does not cover the tier', async () => {
    const { kv, store } = makeKV();
    const boundary = Boundary.make({
      input: 'viewport.width',
      at: [
        [0, 'compact'],
        [768, 'wide'],
      ],
    });
    let compileCalls = 0;
    const adapter = createEdgeHostAdapter({
      cache: {
        kv,
        boundaryId: boundary.id,
        precompiled: {},
        compile: () => {
          compileCalls++;
          return { css: '.fallback{}', propertyRegistrations: '', containerQueries: '' };
        },
      },
    });

    const first = await adapter.resolve(makeHeaders());
    const second = await adapter.resolve(makeHeaders());

    expect(first.cacheStatus).toBe('miss');
    expect(first.compiledOutputs?.css).toBe('.fallback{}');
    expect(second.cacheStatus).toBe('hit');
    expect(compileCalls).toBe(1);
    expect(store.size).toBe(1);
  });

  test('manifest tier gap without a compile fallback warns once and yields no outputs', async () => {
    const { kv } = makeKV();
    const boundary = Boundary.make({
      input: 'viewport.width',
      at: [
        [0, 'compact'],
        [768, 'wide'],
      ],
    });
    // The helper resets the global Diagnostics sink in a finally, so a
    // failing assertion cannot leak the capture sink into later tests.
    await captureDiagnosticsAsync(async ({ events }) => {
      const adapter = createEdgeHostAdapter({
        cache: {
          kv,
          boundaryId: boundary.id,
          precompiled: {},
        },
      });

      const result = await adapter.resolve(makeHeaders());

      expect(result.compiledOutputs).toBeUndefined();
      expect(result.cacheStatus).toBe('miss');
      expect(events.map((event) => event.code)).toContain('manifest-tier-gap');
    });
  });

  test('cache config with neither precompiled nor compile fails fast with a teaching error', () => {
    const { kv } = makeKV();
    const boundary = Boundary.make({
      input: 'viewport.width',
      at: [
        [0, 'compact'],
        [768, 'wide'],
      ],
    });

    expect(() =>
      createEdgeHostAdapter({
        cache: { kv, boundaryId: boundary.id },
      }),
    ).toThrowError(/precompiled.*compile|compile.*precompiled/s);
  });
});

describe('createEdgeHostAdapter (multi-boundary)', () => {
  /** Distinct content -> distinct content addresses (ADR-0003). */
  const heroBoundary = Boundary.make({
    input: 'viewport.width',
    at: [
      [0, 'compact'],
      [768, 'wide'],
    ],
  });
  const sidebarBoundary = Boundary.make({
    input: 'viewport.width',
    at: [
      [0, 'collapsed'],
      [1024, 'expanded'],
    ],
  });

  function fullGrid(css: string) {
    const outputs = { css, propertyRegistrations: '', containerQueries: '' };
    return Object.fromEntries(enumerateTierKeys().map((key) => [key, outputs]));
  }

  test('each boundary resolves its own CSS at the same tier -- no cross-boundary bleed', async () => {
    const { kv } = makeKV();
    const adapter = createEdgeHostAdapter({
      cache: {
        kv,
        boundaries: {
          hero: { boundaryId: heroBoundary.id, precompiled: fullGrid('.hero{--gap:24px;}') },
          sidebar: { boundaryId: sidebarBoundary.id, precompiled: fullGrid('.sidebar{--gap:8px;}') },
        },
      },
    });

    const result = await adapter.resolve(makeHeaders());

    expect(result.boundaries?.hero?.compiledOutputs?.css).toBe('.hero{--gap:24px;}');
    expect(result.boundaries?.sidebar?.compiledOutputs?.css).toBe('.sidebar{--gap:8px;}');
    expect(result.boundaries?.hero?.boundaryId).toBe(heroBoundary.id);
    expect(result.boundaries?.sidebar?.boundaryId).toBe(sidebarBoundary.id);
    expect(result.boundaries?.hero?.cacheStatus).toBe('precompiled');
    expect(result.boundaries?.sidebar?.cacheStatus).toBe('precompiled');
    expect(result.cacheStatus).toBe('precompiled');
    // With multiple boundaries there is no "the" output; consumers read `boundaries`.
    expect(result.compiledOutputs).toBeUndefined();
  });

  test('compile fallback caches under each boundary identity -- distinct KV keys', async () => {
    const { kv, store } = makeKV();
    const compile = ({ boundaryName }: { boundaryName?: string }) => ({
      css: `.${boundaryName}{}`,
      propertyRegistrations: '',
      containerQueries: '',
    });
    const adapter = createEdgeHostAdapter({
      cache: {
        kv,
        boundaries: {
          hero: { boundaryId: heroBoundary.id, compile },
          sidebar: { boundaryId: sidebarBoundary.id, compile },
        },
      },
    });

    const first = await adapter.resolve(makeHeaders());
    const second = await adapter.resolve(makeHeaders());

    expect(first.boundaries?.hero?.compiledOutputs?.css).toBe('.hero{}');
    expect(first.boundaries?.sidebar?.compiledOutputs?.css).toBe('.sidebar{}');
    // One key per boundary, each carrying that boundary's content address.
    expect(store.size).toBe(2);
    const keys = [...store.keys()];
    expect(keys.some((key) => key.includes(heroBoundary.id))).toBe(true);
    expect(keys.some((key) => key.includes(sidebarBoundary.id))).toBe(true);
    expect(second.boundaries?.hero?.cacheStatus).toBe('hit');
    expect(second.boundaries?.sidebar?.cacheStatus).toBe('hit');
    expect(second.boundaries?.hero?.compiledOutputs?.css).toBe('.hero{}');
    expect(second.boundaries?.sidebar?.compiledOutputs?.css).toBe('.sidebar{}');
  });

  test('two names sharing one ContentAddress cache separately -- same definition, different CSS (Codex P1)', async () => {
    // The id comes from Boundary.make's content address; two NAMES can
    // reference the same definition while their @quantize CSS differs.
    // id+tier-only keys would let hero's compile result serve sidebar.
    const { kv, store } = makeKV();
    const compile = ({ boundaryName }: { boundaryName?: string }) => ({
      css: `.${boundaryName}{}`,
      propertyRegistrations: '',
      containerQueries: '',
    });
    const adapter = createEdgeHostAdapter({
      cache: {
        kv,
        boundaries: {
          hero: { boundaryId: heroBoundary.id, compile },
          sidebar: { boundaryId: heroBoundary.id, compile },
        },
      },
    });

    const first = await adapter.resolve(makeHeaders());
    const second = await adapter.resolve(makeHeaders());

    expect(first.boundaries?.hero?.compiledOutputs?.css).toBe('.hero{}');
    expect(first.boundaries?.sidebar?.compiledOutputs?.css).toBe('.sidebar{}');
    // One KV key per NAME even though the content address is shared.
    expect(store.size).toBe(2);
    expect(second.boundaries?.hero?.compiledOutputs?.css).toBe('.hero{}');
    expect(second.boundaries?.sidebar?.compiledOutputs?.css).toBe('.sidebar{}');
    expect(second.boundaries?.hero?.cacheStatus).toBe('hit');
    expect(second.boundaries?.sidebar?.cacheStatus).toBe('hit');
  });

  test('compile context carries the boundary identity', async () => {
    const { kv } = makeKV();
    const compile = vi.fn(() => ({ css: '', propertyRegistrations: '', containerQueries: '' }));
    const adapter = createEdgeHostAdapter({
      cache: {
        kv,
        boundaries: { hero: { boundaryId: heroBoundary.id, compile } },
      },
    });

    await adapter.resolve(makeHeaders());

    expect(compile).toHaveBeenCalledWith(
      expect.objectContaining({ boundaryId: heroBoundary.id, boundaryName: 'hero' }),
    );
  });

  test('a sole boundaries entry still populates the top-level compiledOutputs', async () => {
    const { kv } = makeKV();
    const adapter = createEdgeHostAdapter({
      cache: {
        kv,
        boundaries: { hero: { boundaryId: heroBoundary.id, precompiled: fullGrid('.hero{}') } },
      },
    });

    const result = await adapter.resolve(makeHeaders());

    expect(result.compiledOutputs?.css).toBe('.hero{}');
    expect(result.boundaries?.hero?.compiledOutputs?.css).toBe('.hero{}');
  });

  test('top-level cacheStatus aggregates worst case across boundaries', async () => {
    const { kv } = makeKV();
    const adapter = createEdgeHostAdapter({
      cache: {
        kv,
        boundaries: {
          hero: { boundaryId: heroBoundary.id, precompiled: fullGrid('.hero{}') },
          sidebar: {
            boundaryId: sidebarBoundary.id,
            compile: () => ({ css: '.sidebar{}', propertyRegistrations: '', containerQueries: '' }),
          },
        },
      },
    });

    const result = await adapter.resolve(makeHeaders());

    expect(result.boundaries?.hero?.cacheStatus).toBe('precompiled');
    expect(result.boundaries?.sidebar?.cacheStatus).toBe('miss');
    expect(result.cacheStatus).toBe('miss');
  });

  test('empty boundaries record fails fast with a teaching error', () => {
    const { kv } = makeKV();
    expect(() => createEdgeHostAdapter({ cache: { kv, boundaries: {} } })).toThrowError(/empty `boundaries`/);
  });

  test('boundaries entry with no outputs source fails fast naming the entry', () => {
    const { kv } = makeKV();
    expect(() =>
      createEdgeHostAdapter({
        cache: { kv, boundaries: { hero: { boundaryId: heroBoundary.id } } },
      }),
    ).toThrowError(/"hero".*precompiled.*compile/s);
  });

  test('mixing boundaries with the single-boundary fields fails fast', () => {
    const { kv } = makeKV();
    expect(() =>
      createEdgeHostAdapter({
        cache: {
          kv,
          boundaryId: heroBoundary.id,
          boundaries: { hero: { boundaryId: heroBoundary.id, precompiled: fullGrid('.hero{}') } },
        },
      }),
    ).toThrowError(/mixes/);
  });

  test('cache config identifying no boundary at all fails fast', () => {
    const { kv } = makeKV();
    expect(() =>
      createEdgeHostAdapter({
        cache: { kv, compile: () => ({ css: '', propertyRegistrations: '', containerQueries: '' }) },
      }),
    ).toThrowError(/boundaryId.*boundaries|boundaries.*boundaryId/s);
  });
});

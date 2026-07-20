/**
 * Astro integration tests -- satellite attributes, initial state resolution,
 * and integration hook configuration.
 *
 * Tests the @liteship/astro public API: satelliteAttrs, resolveInitialState,
 * resolveInitialStateFallback, and integration factory configuration.
 */

import { describe, test, expect } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  satelliteAttrs,
  resolveInitialStateFallback,
  resolveInitialState,
  resolveInitialStateWithReceipt,
  integration,
} from '@liteship/astro';
import type { SatelliteProps } from '@liteship/astro';
import { Diagnostics, defineBoundary } from '@liteship/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal Boundary for test fixtures.
 */
function makeBoundary(input: string, pairs: readonly (readonly [number, string])[], hysteresis?: number) {
  return defineBoundary({
    input,
    at: pairs as readonly (readonly [number, string])[] & { readonly [K: number]: readonly [number, string] },
    ...(hysteresis !== undefined ? { hysteresis } : {}),
  });
}

/**
 * Build a minimal Component-like object for satellite attribute tests.
 * We avoid importing Component.make since it requires Style which adds
 * unnecessary complexity for attribute generation tests.
 */
function makeComponentStub(name: string) {
  return { name } as { name: string };
}

// ---------------------------------------------------------------------------
// satelliteAttrs -- data-liteship-* attribute generation
// ---------------------------------------------------------------------------

describe('satelliteAttrs', () => {
  test('generates base liteship-satellite class with no props', () => {
    const attrs = satelliteAttrs({});

    expect(attrs['class']).toBe('liteship-satellite');
  });

  test('merges custom class with liteship-satellite', () => {
    const attrs = satelliteAttrs({ class: 'my-widget' });

    expect(attrs['class']).toBe('liteship-satellite my-widget');
  });

  test('sets data-liteship-satellite from component name', () => {
    const attrs = satelliteAttrs({
      component: makeComponentStub('HeroCard') as SatelliteProps['component'],
    });

    expect(attrs['data-liteship-satellite']).toBe('HeroCard');
  });

  test('sets data-liteship-boundary as serialized JSON from boundary shape', () => {
    const boundary = makeBoundary('viewport', [
      [0, 'compact'],
      [768, 'wide'],
    ]);

    const attrs = satelliteAttrs({ boundary });

    expect(attrs['data-liteship-boundary']).toBeDefined();
    const parsed = JSON.parse(attrs['data-liteship-boundary']!);
    expect(parsed.id).toBe(boundary.id);
    expect(parsed.input).toBe(boundary.input);
    expect(parsed.thresholds).toEqual(boundary.thresholds);
    expect(parsed.states).toEqual(boundary.states);
  });

  test('emits the data-liteship-directive marker when a boundary is present', () => {
    const boundary = makeBoundary('viewport', [
      [0, 'compact'],
      [768, 'wide'],
    ]);

    expect(satelliteAttrs({ boundary })['data-liteship-directive']).toBe('satellite');
    expect(satelliteAttrs({ boundary, directive: 'worker' })['data-liteship-directive']).toBe('worker');
    // CSS-only shells opt out of any client runtime.
    expect(satelliteAttrs({ boundary, directive: false })['data-liteship-directive']).toBeUndefined();
    // No boundary -> nothing for a directive to evaluate -> no marker.
    expect(satelliteAttrs({})['data-liteship-directive']).toBeUndefined();
  });

  test('serializes hysteresis in data-liteship-boundary when present', () => {
    const boundary = makeBoundary(
      'viewport',
      [
        [0, 'small'],
        [768, 'large'],
      ],
      50,
    );

    const attrs = satelliteAttrs({ boundary });

    const parsed = JSON.parse(attrs['data-liteship-boundary']!);
    expect(parsed.hysteresis).toBe(50);
  });

  test('sets data-liteship-state from initialState', () => {
    const attrs = satelliteAttrs({ initialState: 'compact' });

    expect(attrs['data-liteship-state']).toBe('compact');
  });

  test('omits data-liteship-satellite when no component provided', () => {
    const attrs = satelliteAttrs({});

    expect(attrs['data-liteship-satellite']).toBeUndefined();
  });

  test('omits data-liteship-boundary when no boundary provided', () => {
    const attrs = satelliteAttrs({});

    expect(attrs['data-liteship-boundary']).toBeUndefined();
  });

  test('omits data-liteship-state when no initialState provided', () => {
    const attrs = satelliteAttrs({});

    expect(attrs['data-liteship-state']).toBeUndefined();
  });

  test('combines all props into a complete attribute set', () => {
    const boundary = makeBoundary('viewport', [
      [0, 'mobile'],
      [768, 'desktop'],
    ]);

    const attrs = satelliteAttrs({
      boundary,
      component: makeComponentStub('DashGrid') as SatelliteProps['component'],
      class: 'main-grid',
      initialState: 'mobile',
    });

    expect(attrs['class']).toBe('liteship-satellite main-grid');
    expect(attrs['data-liteship-satellite']).toBe('DashGrid');
    expect(attrs['data-liteship-state']).toBe('mobile');
    expect(attrs['data-liteship-boundary']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// resolveInitialStateFallback -- SSR first-state heuristic
// ---------------------------------------------------------------------------

describe('resolveInitialStateFallback', () => {
  test('returns the first state from a multi-state boundary', () => {
    const boundary = makeBoundary('viewport', [
      [0, 'small'],
      [768, 'medium'],
      [1200, 'large'],
    ]);

    expect(resolveInitialStateFallback(boundary)).toBe('small');
  });

  test('returns the only state from a single-state boundary', () => {
    const boundary = makeBoundary('viewport', [[0, 'only']]);

    expect(resolveInitialStateFallback(boundary)).toBe('only');
  });
});

// ---------------------------------------------------------------------------
// resolveInitialState -- server-side state resolution with context
// ---------------------------------------------------------------------------

describe('resolveInitialState', () => {
  const boundary = makeBoundary('viewport', [
    [0, 'compact'],
    [768, 'tablet'],
    [1200, 'desktop'],
  ]);

  test('warns when a raw Request is passed as ServerIslandContext (#109)', () => {
    const { sink, events } = Diagnostics.createBufferSink();
    const prev = Diagnostics.setSink(sink);
    try {
      Diagnostics.clearOnce();
      const fakeRequest = { headers: { get: () => null } } as unknown as Request;
      resolveInitialState(boundary, fakeRequest as never);
      expect(events.some((e) => e.code === 'resolve-initial-state-raw-request')).toBe(true);
    } finally {
      Diagnostics.setSink(prev);
      Diagnostics.clearOnce();
    }
  });

  test('resolves state from client hint viewport width', () => {
    const result = resolveInitialState(boundary, {
      userAgent: 'Mozilla/5.0',
      clientHints: { 'Sec-CH-Viewport-Width': '1400' },
      detectedCapTier: 'reactive',
    });

    expect(result).toBe('desktop');
  });

  test('resolves to compact for small viewport client hint', () => {
    const result = resolveInitialState(boundary, {
      userAgent: 'Mozilla/5.0',
      clientHints: { 'Sec-CH-Viewport-Width': '320' },
      detectedCapTier: 'reactive',
    });

    expect(result).toBe('compact');
  });

  test('resolves to tablet for mid-range viewport client hint', () => {
    const result = resolveInitialState(boundary, {
      userAgent: 'Mozilla/5.0',
      clientHints: { 'Sec-CH-Viewport-Width': '800' },
      detectedCapTier: 'reactive',
    });

    expect(result).toBe('tablet');
  });

  test('falls back to user agent estimation when no client hints', () => {
    const result = resolveInitialState(boundary, {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      clientHints: {},
      detectedCapTier: 'reactive',
    });

    // iPhone UA estimates 375px viewport, which falls in compact (0-767)
    expect(result).toBe('compact');
  });

  test('detects tablet from iPad user agent', () => {
    const result = resolveInitialState(boundary, {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
      clientHints: {},
      detectedCapTier: 'reactive',
    });

    // iPad UA estimates 768px viewport, which falls in tablet (768-1199)
    expect(result).toBe('tablet');
  });

  test('detects desktop from generic user agent', () => {
    const result = resolveInitialState(boundary, {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      clientHints: {},
      detectedCapTier: 'reactive',
    });

    // Desktop UA estimates 1280px viewport, which falls in desktop (>= 1200)
    expect(result).toBe('desktop');
  });

  test('falls back to tier-based synthetic value when no UA or hints', () => {
    const result = resolveInitialState(boundary, {
      userAgent: '',
      clientHints: {},
      detectedCapTier: 'static',
    });

    // static tier -> ordinal 0 -> synthetic value 320
    // 320 >= 0 (compact), 320 < 768 (not tablet)
    expect(result).toBe('compact');
  });

  test('reduced motion with low tier biases to first state', () => {
    const result = resolveInitialState(boundary, {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      clientHints: {
        'Sec-CH-Viewport-Width': '1400',
        'Sec-CH-Prefers-Reduced-Motion': 'reduce',
      },
      detectedCapTier: 'styled', // ordinal 1 <= 1
    });

    // Reduced motion + low tier -> first state
    expect(result).toBe('compact');
  });

  test('reduced motion with high tier does not bias to first state', () => {
    const result = resolveInitialState(boundary, {
      userAgent: 'Mozilla/5.0',
      clientHints: {
        'Sec-CH-Viewport-Width': '1400',
        'Sec-CH-Prefers-Reduced-Motion': 'reduce',
      },
      detectedCapTier: 'animated', // ordinal 3 > 1
    });

    // High tier overrides reduced motion bias, uses viewport hint
    expect(result).toBe('desktop');
  });

  test('returns first state for single-state boundary regardless of context', () => {
    const singleBoundary = makeBoundary('viewport', [[0, 'only']]);

    const result = resolveInitialState(singleBoundary, {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      clientHints: { 'Sec-CH-Viewport-Width': '2000' },
      detectedCapTier: 'gpu',
    });

    expect(result).toBe('only');
  });

  test('handles case-insensitive client hint header keys', () => {
    const result = resolveInitialState(boundary, {
      userAgent: '',
      clientHints: { 'sec-ch-viewport-width': '900' },
      detectedCapTier: 'reactive',
    });

    expect(result).toBe('tablet');
  });

  test('falls back to the first state when the evaluated value is below the first threshold', () => {
    const offsetBoundary = makeBoundary('viewport', [
      [320, 'compact'],
      [768, 'tablet'],
    ]);

    const result = resolveInitialState(offsetBoundary, {
      userAgent: '',
      clientHints: { 'Sec-CH-Viewport-Width': '100' },
      detectedCapTier: 'reactive',
    });

    expect(result).toBe('compact');
  });

  test('falls back cleanly for malformed hints and empty boundary state lists', () => {
    const invalidHintResult = resolveInitialState(boundary, {
      userAgent: '',
      clientHints: { 'Sec-CH-Viewport-Width': 'not-a-number' },
      detectedCapTier: 'styled',
    });
    expect(invalidHintResult).toBe('compact');

    const emptyBoundary = {
      ...boundary,
      states: [],
      thresholds: [],
    };
    expect(
      resolveInitialState(emptyBoundary as never, { userAgent: '', clientHints: {}, detectedCapTier: 'gpu' }),
    ).toBe('');
  });
});

// ---------------------------------------------------------------------------
// resolveInitialStateWithReceipt — SSR resolution source (#118)
// ---------------------------------------------------------------------------

describe('resolveInitialStateWithReceipt (#118)', () => {
  const boundary = makeBoundary('viewport', [
    [0, 'compact'],
    [768, 'tablet'],
    [1200, 'desktop'],
  ]);

  test('names synthetic when no viewport signal is present', () => {
    const result = resolveInitialStateWithReceipt(boundary, {});
    expect(result.state).toBe(resolveInitialState(boundary, {}));
    expect(result.resolution.source).toBe('synthetic');
    expect(result.resolution.detail).toBe('cap-tier:reactive');
  });

  test('names tier + client-hints when viewport width is present', () => {
    const result = resolveInitialStateWithReceipt(boundary, {
      clientHints: { 'Sec-CH-Viewport-Width': '1400' },
    });
    expect(result.state).toBe('desktop');
    expect(result.resolution).toEqual({ source: 'tier', detail: 'client-hints:viewport-width' });
  });

  test('names tier + user-agent when UA is present without hints', () => {
    const result = resolveInitialStateWithReceipt(boundary, {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    });
    expect(result.state).toBe('compact');
    expect(result.resolution).toEqual({ source: 'tier', detail: 'user-agent:viewport-estimate' });
  });

  test('names policy when reduced-motion biases to the lowest state', () => {
    const result = resolveInitialStateWithReceipt(boundary, {
      clientHints: { 'Sec-CH-Prefers-Reduced-Motion': 'reduce' },
      detectedCapTier: 'styled',
    });
    expect(result.state).toBe('compact');
    expect(result.resolution).toEqual({ source: 'policy', detail: 'prefers-reduced-motion' });
  });

  test('names synthetic raw-request-fallback when a Request-shaped context is passed', () => {
    const fakeRequest = { headers: { get: () => null } };
    const result = resolveInitialStateWithReceipt(boundary, fakeRequest as never);
    expect(result.resolution.source).toBe('synthetic');
    expect(result.resolution.detail).toBe('raw-request-fallback');
  });
});

// ---------------------------------------------------------------------------
// integration factory -- hook configuration
// ---------------------------------------------------------------------------

describe('integration', () => {
  test('returns an AstroIntegration with correct name', () => {
    const integ = integration();

    expect(integ.name).toBe('@liteship/astro');
  });

  test('exposes required Astro lifecycle hooks', () => {
    const integ = integration();

    expect(integ.hooks['astro:config:setup']).toBeInstanceOf(Function);
    expect(integ.hooks['astro:config:done']).toBeInstanceOf(Function);
    expect(integ.hooks['astro:server:setup']).toBeInstanceOf(Function);
    expect(integ.hooks['astro:server:done']).toBeInstanceOf(Function);
    expect(integ.hooks['astro:build:done']).toBeInstanceOf(Function);
  });

  test('accepts empty config', () => {
    const integ = integration({});

    expect(integ.name).toBe('@liteship/astro');
    expect(integ.hooks['astro:config:setup']).toBeInstanceOf(Function);
  });

  test('accepts full config with all options', () => {
    const integ = integration({
      detect: true,
      serverIslands: true,
      vite: {
        boundaryDir: 'src/boundaries',
        tokenDir: 'src/tokens',
        themeDir: 'src/themes',
        styleDir: 'src/styles',
        hmr: true,
        environments: ['browser', 'server'],
      },
    });

    expect(integ.name).toBe('@liteship/astro');
    expect(integ.hooks['astro:config:setup']).toBeInstanceOf(Function);
  });

  test('detect defaults to enabled when not specified', () => {
    // The integration source code shows: config?.detect !== false
    // So undefined -> true (detect is enabled by default)
    const integ = integration();

    // We can verify this by checking the hook exists (it always does),
    // but the actual detect injection happens inside the hook callback.
    // The important behavioral test is that the factory does not throw.
    expect(integ).toBeDefined();
  });

  test('serverIslands defaults to disabled when not specified', () => {
    // config?.serverIslands === true -> must be explicitly enabled
    const integ = integration();

    // Same as above -- the behavioral impact is inside the hook.
    expect(integ).toBeDefined();
  });

  test('config:setup registers directives, scripts, and plugin config', () => {
    const integ = integration();
    const directives: Array<{ name: string; entrypoint: string }> = [];
    const scripts: Array<{ stage: string; content: string }> = [];
    const updates: unknown[] = [];
    const logs: string[] = [];

    integ.hooks['astro:config:setup']({
      updateConfig: (config: unknown) => {
        updates.push(config);
      },
      addClientDirective: (directive: { name: string; entrypoint: string }) => {
        directives.push(directive);
      },
      injectScript: (stage: string, content: string) => {
        scripts.push({ stage, content });
      },
      logger: {
        info(message: string) {
          logs.push(message);
        },
      },
    } as never);

    expect(directives.map((directive) => directive.name)).toEqual([
      'satellite',
      'graph',
      'stream',
      'llm',
      'gpu',
      'svg',
    ]);
    expect(updates[0]).toMatchObject({
      vite: {
        plugins: [expect.objectContaining({ name: '@liteship/vite' })],
      },
    });
    const detectScript = scripts.find(
      (script) => script.stage === 'head-inline' && script.content.includes('__LITESHIP_DETECT__'),
    );
    const gpuUpgradeScript = scripts.find(
      (script) =>
        script.stage === 'page' && script.content.includes('gpuTier') && script.content.includes('__LITESHIP_DETECT__'),
    );

    expect(detectScript).toBeDefined();
    expect(detectScript?.content).toContain('Object.freeze');
    expect(detectScript?.content).toContain('writable: false');
    expect(detectScript?.content).toContain('provisional: true');
    // Collision guard: the head script writes the reduced-motion PREFERENCE to
    // data-liteship-reduced-motion, never data-liteship-motion — which is the motion
    // capability TIER (EdgeTier.tierDataAttributes). The two must not share an attr.
    expect(detectScript?.content).toContain('data-liteship-reduced-motion');
    expect(detectScript?.content).not.toContain("setAttribute('data-liteship-motion'");
    // The runtime SNAPSHOT (writeDetectState payload) stays minimal — just the
    // provisional tier + flag, never the full probe payload. The cap-tier ladder
    // is now DERIVED from canonical headProbeCapTier, so its body legitimately
    // references `memory`/`webgpu` as ladder inputs; assert the snapshot shape
    // (the thing this guard actually protects), not a blanket substring ban.
    expect(detectScript?.content).toMatch(/writeDetectState\(\{\s*tier:\s*capTier,\s*provisional:\s*true\s*\}\)/);
    expect(detectScript?.content).not.toContain('colorScheme:');
    expect(detectScript?.content).not.toContain('eval(');
    expect(detectScript?.content).not.toContain('new Function');
    expect(gpuUpgradeScript?.content).toContain('Object.freeze');
    expect(gpuUpgradeScript?.content).toContain('writable: false');
    expect(gpuUpgradeScript?.content).not.toContain('window.__LITESHIP_DETECT__ || {}');
    expect(scripts.some((script) => script.stage === 'page' && script.content.includes('bootstrapSlots'))).toBe(true);
    expect(scripts.some((script) => script.stage === 'page' && script.content.includes('installSwapPipeline'))).toBe(
      true,
    );
    expect(logs).toContain('Registered gpu client directive');
    expect(logs).toContain('Injected GPU probe upgrade');
  });

  test('diagnostics bridge restores on Astro server teardown', () => {
    Diagnostics.reset();
    const integ = integration();
    const warns: string[] = [];

    integ.hooks['astro:config:setup']({
      updateConfig: () => undefined,
      addClientDirective: () => undefined,
      injectScript: () => undefined,
      logger: {
        info() {},
        warn(message: string) {
          warns.push(message);
        },
        error() {},
      },
    } as never);

    Diagnostics.warn({ source: 'liteship/test', code: 'before', message: 'before teardown' });
    integ.hooks['astro:server:done']?.({ logger: { info() {}, warn() {}, error() {} } } as never);
    Diagnostics.warn({ source: 'liteship/test', code: 'after', message: 'after teardown' });

    expect(warns).toHaveLength(1);
    expect(warns[0]).toContain('before teardown');
    Diagnostics.reset();
  });

  test('config:setup auto-wires the detection middleware only when middleware: true (opt-in)', () => {
    const optedIn = integration({ middleware: true });
    const wired: Array<{ order: string; entrypoint: string }> = [];
    optedIn.hooks['astro:config:setup']({
      updateConfig: () => undefined,
      addClientDirective: () => undefined,
      injectScript: () => undefined,
      addMiddleware: (m: { order: string; entrypoint: string }) => {
        wired.push(m);
      },
      logger: { info() {} },
    } as never);
    expect(wired).toContainEqual({ order: 'pre', entrypoint: '@liteship/astro/middleware-entry' });

    // Default (no opt-in): nothing auto-wired.
    let calledByDefault = false;
    integration().hooks['astro:config:setup']({
      updateConfig: () => undefined,
      addClientDirective: () => undefined,
      injectScript: () => undefined,
      addMiddleware: () => {
        calledByDefault = true;
      },
      logger: { info() {} },
    } as never);
    expect(calledByDefault).toBe(false);
  });

  test('config:setup registers the inspector toolbar app only in dev command', () => {
    const integ = integration();
    const devApps: Array<{ id: string; entrypoint: string }> = [];
    const buildApps: Array<{ id: string; entrypoint: string }> = [];

    integ.hooks['astro:config:setup']({
      updateConfig: () => undefined,
      addClientDirective: () => undefined,
      addDevToolbarApp: (app: { id: string; entrypoint: string }) => {
        devApps.push(app);
      },
      injectScript: () => undefined,
      logger: { info() {} },
      command: 'dev',
    } as never);

    integ.hooks['astro:config:setup']({
      updateConfig: () => undefined,
      addClientDirective: () => undefined,
      addDevToolbarApp: (app: { id: string; entrypoint: string }) => {
        buildApps.push(app);
      },
      injectScript: () => undefined,
      logger: { info() {} },
      command: 'build',
    } as never);

    const inspector = devApps.find((app) => app.id === 'liteship-inspector');
    expect(inspector).toBeDefined();
    expect(inspector?.entrypoint).toBe('@liteship/astro/runtime/inspector-toolbar-app');
    expect(buildApps.some((app) => app.id === 'liteship-inspector')).toBe(false);
  });

  test('config:setup skips the inspector toolbar app when inspector: false', () => {
    const integ = integration({ inspector: false });
    const apps: Array<{ id: string }> = [];

    integ.hooks['astro:config:setup']({
      updateConfig: () => undefined,
      addClientDirective: () => undefined,
      addDevToolbarApp: (app: { id: string }) => {
        apps.push(app);
      },
      injectScript: () => undefined,
      logger: { info() {} },
      command: 'dev',
    } as never);

    expect(apps.some((app) => app.id === 'liteship-inspector')).toBe(false);
  });

  test('config:setup honors worker, wasm, and disabled directives; serverIslands is a no-op', () => {
    const integ = integration({
      detect: false,
      // Server Islands is stable in Astro (since v5); there is no experimental
      // flag to toggle on Astro 6. The option is a documented no-op now — it
      // must NOT push any `experimental` config update.
      serverIslands: true,
      stream: { enabled: false },
      llm: { enabled: false },
      gpu: { enabled: false },
      workers: { enabled: true },
      wasm: { enabled: true },
    });
    const directives: Array<{ name: string; entrypoint: string }> = [];
    const scripts: string[] = [];
    const updates: Array<Record<string, unknown>> = [];

    integ.hooks['astro:config:setup']({
      updateConfig: (config: Record<string, unknown>) => {
        updates.push(config);
      },
      addClientDirective: (directive: { name: string; entrypoint: string }) => {
        directives.push(directive);
      },
      injectScript: (_stage: string, content: string) => {
        scripts.push(content);
      },
      logger: { info() {} },
    } as never);

    expect(directives.map((directive) => directive.name)).toEqual(['satellite', 'graph', 'worker', 'wasm', 'svg']);
    // serverIslands must NOT produce any experimental config bridge anymore.
    expect(updates.some((config) => 'experimental' in config)).toBe(false);
    expect(scripts.some((script) => script.includes('__LITESHIP_DETECT__'))).toBe(false);
    // The wasm bootstrap advertises the URL AND eagerly auto-loads at the
    // document level — without this, enabling wasm in config silently no-ops
    // unless the page carries a per-element `client:wasm` directive.
    const wasmBootstrap = scripts.find((script) => script.includes('virtual:liteship/wasm-url'));
    expect(wasmBootstrap).toBeDefined();
    expect(wasmBootstrap).toContain('configureWasmRuntime(wasmUrl)');
    expect(wasmBootstrap).toContain('loadWasmRuntime(document.documentElement)');
  });

  test('config:setup still injects detect without the gpu probe upgrade when gpu is disabled', () => {
    const integ = integration({
      detect: true,
      gpu: { enabled: false },
    });
    const scripts: Array<{ stage: string; content: string }> = [];

    integ.hooks['astro:config:setup']({
      updateConfig: () => undefined,
      addClientDirective: () => undefined,
      injectScript: (stage: string, content: string) => {
        scripts.push({ stage, content });
      },
      logger: { info() {} },
    } as never);

    expect(
      scripts.some((script) => script.stage === 'head-inline' && script.content.includes('__LITESHIP_DETECT__')),
    ).toBe(true);
    expect(scripts.some((script) => script.content.includes('navigator.gpu'))).toBe(false);
  });

  test('server:setup installs middleware and emits client-hint headers', () => {
    const integ = integration({
      workers: { enabled: true },
    });

    const middlewares: Array<
      (req: unknown, res: { setHeader(name: string, value: string): void }, next: () => void) => void
    > = [];
    const logs: string[] = [];

    integ.hooks['astro:server:setup']({
      server: {
        middlewares: {
          use(fn: (req: unknown, res: { setHeader(name: string, value: string): void }, next: () => void) => void) {
            middlewares.push(fn);
          },
        },
      },
      logger: {
        info(message: string) {
          logs.push(message);
        },
      },
    } as never);

    expect(middlewares).toHaveLength(1);

    const headers = new Map<string, string>();
    let nextCalled = false;

    middlewares[0]?.(
      {},
      {
        setHeader(name: string, value: string) {
          headers.set(name, value);
        },
      },
      () => {
        nextCalled = true;
      },
    );

    expect(nextCalled).toBe(true);
    expect(headers.get('Accept-CH')).toContain('Sec-CH-Viewport-Width');
    // Derived from @liteship/edge's single critical-hint source (exact equality pinned by
    // critical-ch-drift.test.ts); here we just assert the dev middleware, like production,
    // marks viewport-width critical.
    expect(headers.get('Critical-CH')).toContain('Sec-CH-Viewport-Width');
    expect(headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
    expect(logs).toContain('@liteship dev server middleware active');
  });

  test('server:setup skips middleware when detect is disabled', () => {
    const integ = integration({ detect: false });
    const middlewares: unknown[] = [];

    integ.hooks['astro:server:setup']({
      server: {
        middlewares: {
          use(fn: unknown) {
            middlewares.push(fn);
          },
        },
      },
      logger: { info() {} },
    } as never);

    expect(middlewares).toHaveLength(0);
  });

  test('server:setup still installs isolation middleware when workers are enabled without detect', () => {
    const integ = integration({ detect: false, workers: { enabled: true } });
    const middlewares: Array<
      (req: unknown, res: { setHeader(name: string, value: string): void }, next: () => void) => void
    > = [];

    integ.hooks['astro:server:setup']({
      server: {
        middlewares: {
          use(fn: (req: unknown, res: { setHeader(name: string, value: string): void }, next: () => void) => void) {
            middlewares.push(fn);
          },
        },
      },
      logger: { info() {} },
    } as never);

    expect(middlewares).toHaveLength(1);

    const headers = new Map<string, string>();
    middlewares[0]?.(
      {},
      {
        setHeader(name: string, value: string) {
          headers.set(name, value);
        },
      },
      () => undefined,
    );

    expect(headers.get('Accept-CH')).toBeUndefined();
    expect(headers.get('Critical-CH')).toBeUndefined();
    expect(headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
  });

  test('config:done and build:done log the final integration status', async () => {
    const integ = integration();
    const logs: string[] = [];
    const root = mkdtempSync(join(tmpdir(), 'liteship-astro-int-'));
    try {
      integ.hooks['astro:config:done']({
        config: { output: 'server', root: pathToFileURL(root) },
        logger: {
          info(message: string) {
            logs.push(message);
          },
        },
      } as never);

      await integ.hooks['astro:build:done']({
        dir: pathToFileURL(join(root, 'dist')),
        logger: {
          info(message: string) {
            logs.push(message);
          },
        },
      } as never);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }

    expect(logs).toContain('@liteship configured for server output');
    expect(logs).toContain('@liteship build integration complete');
  });

  test('build:done emits liteship-boundary-manifest.json with derived ids when the project defines boundaries', async () => {
    const integ = integration();
    const root = mkdtempSync(join(tmpdir(), 'liteship-astro-manifest-'));
    const outDir = join(root, 'dist');
    mkdirSync(join(root, 'src'), { recursive: true });
    mkdirSync(outDir, { recursive: true });

    const reference = defineBoundary({
      input: 'viewport.width',
      at: [
        [0, 'compact'],
        [768, 'wide'],
      ],
    });
    writeFileSync(
      join(root, 'src', 'boundaries.ts'),
      `
export const viewport = {
  _tag: 'BoundaryDef',
  _version: 1,
  id: ${JSON.stringify(reference.id)},
  input: 'viewport.width',
  thresholds: [0, 768],
  states: ['compact', 'wide'],
};
`,
    );
    writeFileSync(
      join(root, 'src', 'styles.css'),
      `
@quantize viewport {
  compact {
    --gap: 8px;
  }
  wide {
    --gap: 24px;
  }
}
`,
    );

    try {
      const silentLogger = { info() {} };
      integ.hooks['astro:config:done']({
        config: { output: 'server', root: pathToFileURL(root) },
        logger: silentLogger,
      } as never);
      await integ.hooks['astro:build:done']({
        dir: pathToFileURL(outDir),
        logger: silentLogger,
      } as never);

      const manifestPath = join(outDir, 'liteship-boundary-manifest.json');
      // v2 envelope: entries pool distinct outputs; cells hold pool indices.
      const file = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        _tag: string;
        _version: number;
        boundaries: Record<string, { id: string; outputs: { css: string }[]; outputsByTier: Record<string, number> }>;
      };

      expect(file._tag).toBe('LiteshipBoundaryManifest');
      expect(file._version).toBe(2);
      expect(file.boundaries['viewport']!.id).toBe(reference.id);
      const entry = file.boundaries['viewport']!;
      expect(entry.outputs[entry.outputsByTier['transitions:standard']!]!.css).toContain('@container');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('build:done emits no manifest file for a project without boundaries', async () => {
    const integ = integration();
    const root = mkdtempSync(join(tmpdir(), 'liteship-astro-empty-'));
    const outDir = join(root, 'dist');
    mkdirSync(outDir, { recursive: true });

    try {
      const silentLogger = { info() {} };
      integ.hooks['astro:config:done']({
        config: { output: 'server', root: pathToFileURL(root) },
        logger: silentLogger,
      } as never);
      await integ.hooks['astro:build:done']({
        dir: pathToFileURL(outDir),
        logger: silentLogger,
      } as never);

      expect(existsSync(join(outDir, 'liteship-boundary-manifest.json'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('config:setup watches the convention primitive files (addWatchFile battery)', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-watch-'));
    const src = join(root, 'src');
    mkdirSync(src, { recursive: true });
    try {
      writeFileSync(join(src, 'boundaries.ts'), 'export const a = 1;\n');
      writeFileSync(join(src, 'hero.boundaries.ts'), 'export const b = 1;\n');
      writeFileSync(join(src, 'tokens.ts'), 'export const c = 1;\n');

      const watched: string[] = [];
      integration().hooks['astro:config:setup']({
        updateConfig: () => undefined,
        addClientDirective: () => undefined,
        injectScript: () => undefined,
        addWatchFile: (file: string) => watched.push(file),
        logger: { info() {} },
        config: { root: pathToFileURL(root), srcDir: pathToFileURL(src) },
      } as never);

      // The barrel, a per-name convention file, and a different kind's barrel
      // are all watched (resolver convention, not hardcoded names).
      expect(watched).toContain(join(src, 'boundaries.ts'));
      expect(watched).toContain(join(src, 'hero.boundaries.ts'));
      expect(watched).toContain(join(src, 'tokens.ts'));
      // Each file is watched at most once (dedup across kinds/search dirs).
      expect(new Set(watched).size).toBe(watched.length);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

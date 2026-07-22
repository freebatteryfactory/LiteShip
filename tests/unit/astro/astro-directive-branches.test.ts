// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Diagnostics, GenFrame } from '@liteship/core';
import { WorkerHost } from '@liteship/worker';
import { Resumption } from '@liteship/web';
import adaptiveDirective from '../../../packages/astro/src/client-directives/adaptive.js';
import llmDirective from '../../../packages/astro/src/client-directives/llm.js';
import gpuDirective from '../../../packages/astro/src/client-directives/gpu.js';
import streamDirective from '../../../packages/astro/src/client-directives/stream.js';
import workerDirective from '../../../packages/astro/src/client-directives/worker.js';
import { configureRuntimePolicy, _resetRuntimePolicyForTests } from '../../../packages/astro/src/runtime/policy.js';
import { driveUniformFromSignal } from '../../../packages/astro/src/runtime/uniform-signal.js';
import { isSameOriginRuntimeUrl } from '../../../packages/astro/src/runtime/url-policy.js';
import { MockEventSource } from '../../helpers/mock-event-source.js';
import { MockWorker } from '../../helpers/mock-worker.js';
import { createStubRegistry } from '../../helpers/define-property-stub.js';
import { captureDiagnosticsAsync } from '../../helpers/diagnostics.js';

function makeEl(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  document.body.appendChild(el);
  return el;
}

describe('astro directive branch coverage', () => {
  const stubs = createStubRegistry();
  let cleanupEventSource: (() => void) | null = null;
  let restoreWorker: (() => void) | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.setAttribute('data-liteship-tier', 'reactive');
    _resetRuntimePolicyForTests();
    configureRuntimePolicy();
  });

  afterEach(() => {
    cleanupEventSource?.();
    cleanupEventSource = null;
    restoreWorker?.();
    restoreWorker = null;
    document.querySelectorAll<HTMLElement>('*').forEach((element) => {
      element.dispatchEvent(new CustomEvent('liteship:teardown'));
    });
    Diagnostics.reset();
    stubs.restoreAll();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-liteship-tier');
    // True isolation: clear the module-private policy store rather than
    // re-configuring a default (which would leave a stale policy live for
    // any suite that expects unconfigured state).
    _resetRuntimePolicyForTests();
  });

  test('adaptive ignores invalid boundaries, unsupported inputs, and invalid reinit payloads gracefully', () => {
    const load = vi.fn(async () => {});
    const invalid = makeEl('div', { 'data-liteship-boundary': '{not-json' });
    adaptiveDirective(load, {}, invalid);
    expect(load).not.toHaveBeenCalled();
    expect(invalid.getAttribute('data-liteship-state')).toBeNull();

    const unsupported = makeEl('div', {
      'data-liteship-boundary': JSON.stringify({
        input: 'scroll.depth',
        thresholds: [0, 100],
        states: ['near', 'far'],
      }),
      'data-liteship-state': 'near',
    });
    adaptiveDirective(load, {}, unsupported);
    expect(load).toHaveBeenCalledOnce();
    expect(unsupported.getAttribute('data-liteship-state')).toBe('near');

    unsupported.setAttribute('data-liteship-boundary', '{broken-again');
    unsupported.dispatchEvent(new CustomEvent('liteship:reinit'));
    expect(unsupported.getAttribute('data-liteship-state')).toBe('near');
  });

  test('llm directive supports morph mode, target selectors, plain-text fallback, and static-tier suppression', async () => {
    cleanupEventSource = MockEventSource.install();
    const load = vi.fn(async () => {});

    const el = makeEl('div', {
      'data-liteship-llm-url': '/api/chat',
      'data-liteship-llm-mode': 'morph',
      'data-liteship-llm-target': '.content',
    });
    el.innerHTML = '<div class="content"></div>';

    const llmStartEvents: Event[] = [];
    el.addEventListener('liteship:llm-start', (event) => llmStartEvents.push(event));

    llmDirective(load, {}, el);
    const source = MockEventSource.instances[0]!;
    source.simulateOpen();
    source.simulateMessage('Hello ');
    source.simulateMessage(JSON.stringify({ type: 'text', content: 'world' }));
    await Promise.resolve();

    expect(llmStartEvents).toHaveLength(1);
    expect(el.querySelector('.content')?.innerHTML).toBe('Hello world');
    expect(load).toHaveBeenCalledOnce();

    source.simulateMessage(JSON.stringify({ type: 'text', content: '<img src=x onerror=alert(1)>' }));
    await Promise.resolve();
    await Promise.resolve();
    expect(el.querySelector('.content')?.textContent).toBe('Hello world<img src=x onerror=alert(1)>');
    expect(el.querySelector('.content img')).toBeNull();

    document.documentElement.setAttribute('data-liteship-tier', 'static');
    const staticHost = makeEl('div', {
      'data-liteship-llm-url': '/api/static',
      'data-liteship-llm-mode': 'append',
    });
    llmDirective(async () => {}, {}, staticHost);
    MockEventSource.instances[1]!.simulateMessage(JSON.stringify({ type: 'text', content: 'hidden' }));
    await Promise.resolve();
    expect(staticHost.textContent).toBe('');
  });

  test('llm directive emits error events, connection failures, and reconnects on reinit', () => {
    cleanupEventSource = MockEventSource.install();
    const el = makeEl('div', {
      'data-liteship-llm-url': '/api/chat',
    });

    const errors: unknown[] = [];
    el.addEventListener('liteship:llm-error', ((event: CustomEvent) => errors.push(event.detail)) as EventListener);

    llmDirective(async () => {}, {}, el);
    const firstSource = MockEventSource.instances[0]!;
    firstSource.simulateMessage(JSON.stringify({ type: 'error', content: 'boom' }));
    firstSource.simulateError();

    expect(errors).toEqual([{ message: 'boom' }]);

    el.dispatchEvent(new CustomEvent('liteship:reinit'));
    expect(MockEventSource.instances).toHaveLength(2);
    expect(MockEventSource.instances[1]).not.toBe(firstSource);
  });

  test('llm directive handles missing urls, selector fallback, alternate error payloads, and init failures', async () => {
    cleanupEventSource = MockEventSource.install();
    const load = vi.fn(async () => {});

    const missingUrl = makeEl('div');
    llmDirective(load, {}, missingUrl);
    expect(load).not.toHaveBeenCalled();
    expect(MockEventSource.instances).toHaveLength(0);

    const host = makeEl('div', {
      'data-liteship-llm-url': '/api/chat',
      'data-liteship-llm-target': '.missing-target',
      'data-liteship-llm-mode': 'replace',
    });
    host.innerHTML = '<div class="other">ignored</div>';

    const errors: unknown[] = [];
    host.addEventListener('liteship:llm-error', ((event: CustomEvent) => errors.push(event.detail)) as EventListener);

    llmDirective(load, {}, host);
    const source = MockEventSource.instances.at(-1)!;
    source.simulateMessage(JSON.stringify({ type: 'error', message: 'message branch' }));
    expect(errors).toContainEqual({ message: 'message branch' });

    host.dispatchEvent(new CustomEvent('liteship:reinit'));
    const secondSource = MockEventSource.instances.at(-1)!;
    secondSource.simulateMessage(JSON.stringify({ type: 'error' }));
    expect(errors).toContainEqual({ message: 'unknown error' });

    host.dispatchEvent(new CustomEvent('liteship:reinit'));
    const thirdSource = MockEventSource.instances.at(-1)!;
    thirdSource.simulateMessage(JSON.stringify({ type: 'receipt', data: { hash: 123 } }));
    thirdSource.simulateMessage(JSON.stringify({ type: 'text', content: 'selector fallback' }));
    thirdSource.simulateError();

    expect(host.textContent).toBe('selector fallback');
    expect(errors).toContainEqual({ reason: 'connection-error', strategy: 're-request' });

    const unsafeTargetHost = makeEl('div', {
      'data-liteship-llm-url': '/api/chat',
      'data-liteship-llm-target': 'div > .unsafe',
      'data-liteship-llm-mode': 'append',
    });
    unsafeTargetHost.innerHTML = '<div class="unsafe">ignored</div>';

    llmDirective(load, {}, unsafeTargetHost);
    const unsafeSource = MockEventSource.instances.at(-1)!;
    unsafeSource.simulateMessage(JSON.stringify({ type: 'text', content: 'host fallback' }));
    await Promise.resolve();
    await Promise.resolve();

    expect(unsafeTargetHost.textContent).toContain('host fallback');

    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    vi.stubGlobal(
      'EventSource',
      class ThrowingEventSource {
        constructor() {
          throw new Error('init boom');
        }
      } as never,
    );

    const broken = makeEl('div', { 'data-liteship-llm-url': '/api/broken' });
    llmDirective(async () => {}, {}, broken);

    expect(events).toContainEqual(
      expect.objectContaining({
        level: 'error',
        source: 'liteship/astro.llm',
        code: 'astro/llm/llm-runtime-init-failed',
        detail: 'init boom',
      }),
    );
  });

  test('llm directive falls back to the host element when a safe target selector throws during resolution', async () => {
    cleanupEventSource = MockEventSource.install();

    const host = makeEl('div', {
      'data-liteship-llm-url': '/api/chat',
      'data-liteship-llm-target': '#target',
      'data-liteship-llm-mode': 'append',
    });
    host.innerHTML = '<div id="target">ignored</div>';

    const querySelectorSpy = vi.spyOn(host, 'querySelector').mockImplementation(() => {
      throw new Error('selector blocked');
    });

    llmDirective(async () => {}, {}, host);
    querySelectorSpy.mockRestore();

    const source = MockEventSource.instances.at(-1)!;
    source.simulateMessage(JSON.stringify({ type: 'text', content: 'host fallback' }));
    await Promise.resolve();
    await Promise.resolve();

    expect(host.textContent).toContain('host fallback');
  });

  test('llm directive suppresses connection-error events when receipt history enables replay recovery', async () => {
    cleanupEventSource = MockEventSource.install();
    const host = makeEl('div', {
      'data-liteship-llm-url': '/api/chat',
      'data-liteship-llm-mode': 'append',
    });

    const errors: unknown[] = [];
    host.addEventListener('liteship:llm-error', ((event: CustomEvent) => errors.push(event.detail)) as EventListener);
    vi.spyOn(GenFrame, 'resolveGap').mockReturnValue({
      type: 'replay',
      frames: [],
    } as ReturnType<typeof GenFrame.resolveGap>);

    llmDirective(async () => {}, {}, host);
    const source = MockEventSource.instances.at(-1)!;
    source.simulateMessage(
      JSON.stringify({
        type: 'receipt',
        data: { hash: 'r2', previous: 'r1' },
      }),
    );
    source.simulateError();

    expect(errors).toEqual([]);
  });

  test('llm and stream directives reject cross-origin runtime URLs by default', async () => {
    cleanupEventSource = MockEventSource.install();
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    const llmHost = makeEl('div', {
      'data-liteship-llm-url': 'https://evil.example/chat',
    });
    llmDirective(async () => {}, {}, llmHost);

    const streamHost = makeEl('div', {
      'data-liteship-stream-url': 'https://evil.example/feed',
      'data-liteship-snapshot-url': 'https://evil.example/snapshot',
      'data-liteship-replay-url': 'https://evil.example/replay',
    });
    streamDirective(async () => {}, {}, streamHost);

    expect(MockEventSource.instances).toHaveLength(0);
    expect(events).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        source: 'liteship/astro.llm',
        code: 'astro/llm/llm-cross-origin-url-rejected',
      }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        source: 'liteship/astro.stream',
        code: 'astro/stream/stream-cross-origin-url-rejected',
      }),
    );
  });

  test('runtime policy allowlists permit explicit cross-origin endpoints by kind', async () => {
    cleanupEventSource = MockEventSource.install();
    configureRuntimePolicy({
      endpointPolicy: {
        mode: 'allowlist',
        byKind: {
          llm: ['https://trusted.example'],
          stream: ['https://trusted.example'],
        },
      },
    });

    const llmHost = makeEl('div', {
      'data-liteship-llm-url': 'https://trusted.example/chat',
    });
    llmDirective(async () => {}, {}, llmHost);

    const streamHost = makeEl('div', {
      'data-liteship-stream-url': 'https://trusted.example/feed',
    });
    streamDirective(async () => {}, {}, streamHost);

    expect(MockEventSource.instances).toHaveLength(2);
    expect(MockEventSource.instances[0]?.url).toBe('https://trusted.example/chat');
    expect(MockEventSource.instances[1]?.url).toContain('https://trusted.example/feed');
  });

  test('llm html policy stays text-safe by default and allows sanitized html when configured', async () => {
    cleanupEventSource = MockEventSource.install();

    const defaultHost = makeEl('div', {
      'data-liteship-llm-url': '/api/chat',
      'data-liteship-llm-mode': 'morph',
    });

    llmDirective(async () => {}, {}, defaultHost);
    MockEventSource.instances[0]!.simulateMessage(JSON.stringify({ type: 'text', content: '<b>safe?</b>' }));
    await Promise.resolve();
    await Promise.resolve();

    expect(defaultHost.querySelector('b')).toBeNull();
    expect(defaultHost.textContent).toBe('<b>safe?</b>');

    configureRuntimePolicy({
      htmlPolicy: {
        llmDefault: 'sanitized-html',
      },
    });

    const sanitizedHost = makeEl('div', {
      'data-liteship-llm-url': '/api/chat-2',
      'data-liteship-llm-mode': 'morph',
    });

    llmDirective(async () => {}, {}, sanitizedHost);
    MockEventSource.instances[1]!.simulateMessage(
      JSON.stringify({ type: 'text', content: '<b>allowed</b><script>bad()</script><img src="x" onerror="alert(1)">' }),
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(sanitizedHost.querySelector('b')?.textContent).toBe('allowed');
    expect(sanitizedHost.querySelector('script')).toBeNull();
    expect(sanitizedHost.querySelector('img')?.getAttribute('onerror')).toBeNull();
  });

  test('llm directive maps additional device tiers and ignores malformed chunk payloads', async () => {
    cleanupEventSource = MockEventSource.install();

    const styledHost = makeEl('div', {
      'data-liteship-llm-url': '/api/styled',
      'data-liteship-llm-mode': 'append',
    });

    document.documentElement.setAttribute('data-liteship-tier', 'styled');
    llmDirective(async () => {}, {}, styledHost);
    MockEventSource.instances.at(-1)!.simulateMessage('{bad-json');
    MockEventSource.instances.at(-1)!.simulateMessage(JSON.stringify({ type: 'text', content: 'styled tier' }));
    await Promise.resolve();
    await Promise.resolve();
    expect(styledHost.textContent).toBe('styled tier');

    const animatedHost = makeEl('div', {
      'data-liteship-llm-url': '/api/animated',
      'data-liteship-llm-mode': 'append',
    });
    document.documentElement.setAttribute('data-liteship-tier', 'animated');
    llmDirective(async () => {}, {}, animatedHost);
    MockEventSource.instances.at(-1)!.simulateMessage(JSON.stringify({ type: 'text', content: 'animated tier' }));
    await Promise.resolve();
    await Promise.resolve();
    expect(animatedHost.textContent).toBe('animated tier');

    const gpuHost = makeEl('div', {
      'data-liteship-llm-url': '/api/gpu',
      'data-liteship-llm-mode': 'append',
    });
    document.documentElement.setAttribute('data-liteship-tier', 'gpu');
    llmDirective(async () => {}, {}, gpuHost);
    MockEventSource.instances.at(-1)!.simulateMessage(JSON.stringify({ type: 'text', content: 'gpu tier' }));
    await Promise.resolve();
    await Promise.resolve();
    expect(gpuHost.textContent).toBe('gpu tier');
  });

  test('llm directive reports non-Error init failures with string details', () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    vi.stubGlobal(
      'EventSource',
      class ThrowingEventSource {
        constructor() {
          throw 'string boom';
        }
      } as never,
    );

    const broken = makeEl('div', { 'data-liteship-llm-url': '/api/string-broken' });
    llmDirective(async () => {}, {}, broken);

    expect(events).toContainEqual(
      expect.objectContaining({
        level: 'error',
        source: 'liteship/astro.llm',
        code: 'astro/llm/llm-runtime-init-failed',
        detail: 'string boom',
      }),
    );
  });

  test('same-origin runtime URL checks allow relative paths on opaque harness origins', () => {
    vi.stubGlobal('location', { origin: 'null' } as Location);

    expect(isSameOriginRuntimeUrl('/llm')).toBe(true);
    expect(isSameOriginRuntimeUrl('http://%')).toBe(false);
    expect(isSameOriginRuntimeUrl('https://evil.example/chat')).toBe(false);
  });

  test('gpu directive falls back without WebGL2 and reports shader fetch failures', async () => {
    const load = vi.fn(async () => {});
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);

    const host = makeEl('div');
    gpuDirective(load, {}, host);
    expect(host.querySelector('canvas')).not.toBeNull();
    expect(load).toHaveBeenCalledOnce();
    expect(events).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        source: 'liteship/astro.gpu',
        code: 'astro/gpu/webgl2-unavailable',
        message: 'WebGL2 is unavailable; falling back to CSS rendering.',
      }),
    );

    const gl = {
      COMPILE_STATUS: 1,
      LINK_STATUS: 2,
      VERTEX_SHADER: 3,
      FRAGMENT_SHADER: 4,
      createShader: vi.fn(() => ({})),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      getShaderInfoLog: vi.fn(() => ''),
      deleteShader: vi.fn(),
      createProgram: vi.fn(() => ({})),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn((_: unknown, key: number) => key !== 2 || true),
      getProgramInfoLog: vi.fn(() => ''),
      deleteProgram: vi.fn(),
      useProgram: vi.fn(),
      createVertexArray: vi.fn(() => ({})),
      bindVertexArray: vi.fn(),
      createBuffer: vi.fn(() => ({})),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      getAttribLocation: vi.fn(() => 0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      getActiveUniform: vi.fn(() => null),
      getUniformLocation: vi.fn(() => null),
      uniform1f: vi.fn(),
      uniform2f: vi.fn(),
      viewport: vi.fn(),
      drawArrays: vi.fn(),
      ARRAY_BUFFER: 5,
      STATIC_DRAW: 6,
      FLOAT: 7,
      TRIANGLES: 8,
      createShaderProgram: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (gl as never) : null,
    );
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, statusText: 'Not Found' })) as never);

    const canvas = makeEl('canvas', {
      'data-liteship-shader-src': '/shader.frag',
    }) as HTMLCanvasElement;
    gpuDirective(async () => {}, {}, canvas);
    await Promise.resolve();
    await Promise.resolve();

    expect(events).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        source: 'liteship/astro.gpu',
        code: 'astro/gpu/shader-fetch-failed',
        message: 'Failed to fetch shader source.',
        detail: 'Not Found',
      }),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network boom');
      }) as never,
    );
    // A fresh host: re-booting the SAME element is now an idempotent no-op
    // (bootDirectiveEntry guards double-boot), so the throw path needs an unbound
    // canvas to activate.
    const throwingCanvas = makeEl('canvas', {
      'data-liteship-shader-src': '/shader.frag',
    }) as HTMLCanvasElement;
    gpuDirective(async () => {}, {}, throwingCanvas);
    await Promise.resolve();
    await Promise.resolve();

    expect(events).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        source: 'liteship/astro.gpu',
        code: 'astro/gpu/shader-fetch-threw',
        message: 'Fetching shader source threw an error.',
        cause: expect.any(Error),
      }),
    );
  });

  test('gpu directive force escape hatch boots below the tier gate (headless/CI)', () => {
    // A low/headless tier normally no-ops the directive BEFORE it ever probes
    // WebGL2 — so SwiftShader (gpuTier 0, WebGL2 fine) can't boot. The force
    // hatch must bypass the heuristic gate while the real getContext probe still
    // guards capability (here mocked absent → graceful CSS fallback, not a crash).
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    document.documentElement.setAttribute('data-liteship-tier', 'styled');

    // Baseline: no force at a styled tier → hard no-op, never touches a canvas.
    const gated = makeEl('div');
    const gatedLoad = vi.fn(async () => {});
    gpuDirective(gatedLoad, {}, gated);
    expect(gated.querySelector('canvas')).toBeNull();
    expect(getContext).not.toHaveBeenCalled();
    expect(gatedLoad).toHaveBeenCalledOnce();

    // Force via the directive value `client:gpu={{ force: true }}`. Astro passes
    // it as `{ name, value }`, NOT a top-level `force` — exercise that real shape.
    const forcedOpts = makeEl('div');
    const forcedOptsLoad = vi.fn(async () => {});
    gpuDirective(forcedOptsLoad, { name: 'gpu', value: { force: true } }, forcedOpts);
    expect(forcedOpts.querySelector('canvas')).not.toBeNull();
    expect(getContext).toHaveBeenCalled();
    expect(forcedOptsLoad).toHaveBeenCalledOnce();

    // Force via the `data-liteship-gpu-force` attribute (no directive value).
    const forcedAttr = makeEl('div', { 'data-liteship-gpu-force': '' });
    gpuDirective(async () => {}, {}, forcedAttr);
    expect(forcedAttr.querySelector('canvas')).not.toBeNull();
  });

  test('gpu force boots even after a prior scanner no-op already bound the host', () => {
    // The double-boot idempotence guard must NOT swallow the force hatch: the scanner
    // can bind gpu at a provisional tier (where it only defers to detect-ready), and a
    // later `client:gpu={{ force: true }}` has to upgrade that no-op, not be skipped.
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    document.documentElement.setAttribute('data-liteship-tier', 'styled');

    const el = makeEl('div');
    // Prior scanner pass: marks the host bound but only defers (no canvas yet).
    gpuDirective(async () => {}, {}, el);
    expect(el.querySelector('canvas'), 'scanner no-op at the provisional tier').toBeNull();
    expect(el.getAttribute('data-liteship-directive-bound')).toContain('gpu');

    // Astro then hydrates the same host with the force hatch.
    gpuDirective(async () => {}, { name: 'gpu', value: { force: true } }, el);
    expect(el.querySelector('canvas'), 'force upgrades the prior scanner bind').not.toBeNull();
    expect(getContext).toHaveBeenCalled();

    // The scanner's bail armed an onDetectReady retry. When the tier upgrades it must
    // NOT append a second canvas over the shader the force hatch already started.
    document.documentElement.setAttribute('data-liteship-tier', 'gpu');
    document.dispatchEvent(new Event('liteship:detect-ready'));
    expect(el.querySelectorAll('canvas'), 'the stale retry must not double-boot').toHaveLength(1);
  });

  test('gpu directive re-boots when the async probe upgrades the tier (liteship:detect-ready)', () => {
    // The fix for the force-hatch root cause: a directive that bails on the
    // conservative PROVISIONAL tier must re-boot when the GPU probe settles a
    // higher tier — no force needed in the capable-GPU case.
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    document.documentElement.setAttribute('data-liteship-tier', 'styled');

    const host = makeEl('div');
    gpuDirective(async () => {}, {}, host);
    expect(host.querySelector('canvas'), 'bails on the provisional tier').toBeNull();
    expect(getContext).not.toHaveBeenCalled();

    // Probe upgrades the tier and fires the settle signal → the directive re-boots.
    document.documentElement.setAttribute('data-liteship-tier', 'gpu');
    document.dispatchEvent(new Event('liteship:detect-ready'));
    expect(host.querySelector('canvas'), 'boots after the upgrade').not.toBeNull();
    expect(getContext).toHaveBeenCalled();
  });

  test('gpu directive stays dark if the probe settles a still-low tier', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    document.documentElement.setAttribute('data-liteship-tier', 'styled');
    const host = makeEl('div');
    gpuDirective(async () => {}, {}, host);

    // Probe ran but the device is genuinely low — tier stays styled → no boot.
    document.dispatchEvent(new Event('liteship:detect-ready'));
    expect(host.querySelector('canvas')).toBeNull();
  });

  test('gpu directive does not re-boot a DETACHED host when the probe settles', () => {
    // A host removed from the DOM before the probe settles (replaced by a VT
    // swap, torn down) must never re-init — that would allocate an orphan GPU
    // context on a node nobody can see. The el.isConnected guard enforces it.
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    document.documentElement.setAttribute('data-liteship-tier', 'styled');

    const host = makeEl('div');
    gpuDirective(async () => {}, {}, host);
    expect(host.querySelector('canvas')).toBeNull();

    host.remove(); // detached before the async probe settles

    document.documentElement.setAttribute('data-liteship-tier', 'gpu');
    document.dispatchEvent(new Event('liteship:detect-ready'));
    expect(host.querySelector('canvas'), 'no re-boot on a detached host').toBeNull();
    expect(getContext, 'no GPU context allocated on a detached node').not.toHaveBeenCalled();
  });

  test('gpu directive still re-boots a host that SURVIVES a live reinit before the probe settles', () => {
    // slots.ts dispatches liteship:reinit on still-connected roots on every VT
    // after-swap (the reinit step of the swap pipeline; teardown is a SEPARATE
    // event after F-2). A persisted (transition:persist) host that bailed on the
    // provisional tier must keep its deferred onDetectReady boot through that
    // reinit — the bail path has no liteship:reinit re-registration, so the deferred
    // listener (which only fires on detect-ready) must survive a stray reinit.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    document.documentElement.setAttribute('data-liteship-tier', 'styled');

    const host = makeEl('div');
    gpuDirective(async () => {}, {}, host);
    expect(host.querySelector('canvas')).toBeNull();

    // Live VT reinit lands before the probe settles; the host stays connected.
    host.dispatchEvent(new CustomEvent('liteship:reinit', { bubbles: true }));
    expect(host.isConnected).toBe(true);

    // Probe then settles a GPU-admitting tier → the survivor boots.
    document.documentElement.setAttribute('data-liteship-tier', 'gpu');
    document.dispatchEvent(new Event('liteship:detect-ready'));
    expect(host.querySelector('canvas'), 'boots after upgrade despite the reinit').not.toBeNull();
  });

  test('gpu directive handles document uniform updates and shader compile failures', async () => {
    const load = vi.fn(async () => {});
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1) as never);
    vi.stubGlobal('cancelAnimationFrame', vi.fn() as never);

    const uniformCalls: Array<[string, number]> = [];
    const gl = {
      COMPILE_STATUS: 1,
      LINK_STATUS: 2,
      ACTIVE_UNIFORMS: 3,
      TRIANGLES: 4,
      ARRAY_BUFFER: 5,
      STATIC_DRAW: 6,
      FLOAT: 7,
      VERTEX_SHADER: 8,
      FRAGMENT_SHADER: 9,
      createShader: vi.fn(() => ({})),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn((_: unknown, kind: number) => kind !== 1 || true),
      getShaderInfoLog: vi.fn(() => ''),
      deleteShader: vi.fn(),
      createProgram: vi.fn(() => ({})),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn((_: unknown, key: number) => (key === 3 ? 1 : true)),
      getProgramInfoLog: vi.fn(() => ''),
      deleteProgram: vi.fn(),
      useProgram: vi.fn(),
      createVertexArray: vi.fn(() => ({})),
      bindVertexArray: vi.fn(),
      createBuffer: vi.fn(() => ({})),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      getAttribLocation: vi.fn(() => 0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      getActiveUniform: vi.fn(() => ({ name: 'u_progress' })),
      getUniformLocation: vi.fn((_: unknown, name: string) => name),
      uniform1f: vi.fn((name: string, value: number) => {
        uniformCalls.push([name, value]);
      }),
      uniform2f: vi.fn(),
      viewport: vi.fn(),
      drawArrays: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (gl as never) : null,
    );

    const canvas = makeEl('canvas', {
      'data-liteship-boundary': JSON.stringify({ id: 'hero', states: ['compact', 'expanded'] }),
    }) as HTMLCanvasElement;
    stubs.define(canvas, 'clientWidth', { configurable: true, value: 320 });
    stubs.define(canvas, 'clientHeight', { configurable: true, value: 180 });

    gpuDirective(load, {}, canvas);
    await Promise.resolve();

    document.dispatchEvent(
      new CustomEvent('liteship:uniform-update', {
        detail: { uniform: 'u_progress', value: 0.75 },
      }),
    );
    expect(uniformCalls).toContainEqual(['u_progress', 0.75]);

    const brokenGl = {
      ...gl,
      getShaderParameter: vi.fn(() => false),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (brokenGl as never) : null,
    );

    const broken = makeEl('canvas');
    gpuDirective(async () => {}, {}, broken);
    await Promise.resolve();

    expect(events).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        source: 'liteship/astro.gpu',
        code: 'astro/gpu/shader-compile-failed',
        message: expect.stringContaining('Shader compilation failed for element'),
      }),
    );

    const linkBrokenGl = {
      ...gl,
      getProgramParameter: vi.fn((_: unknown, key: number) => (key === 3 ? 1 : key !== 2)),
      getProgramInfoLog: vi.fn(() => 'link failed'),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (linkBrokenGl as never) : null,
    );

    const linkBroken = makeEl('canvas');
    gpuDirective(async () => {}, {}, linkBroken);
    await Promise.resolve();

    expect(events).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        source: 'liteship/astro.gpu',
        code: 'astro/gpu/program-link-failed',
        message: 'Shader program linking failed.',
        detail: 'link failed',
      }),
    );

    const cleanupGl = {
      ...gl,
      deleteProgram: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (cleanupGl as never) : null,
    );
    const cleanupCanvas = makeEl('canvas') as HTMLCanvasElement;
    gpuDirective(async () => {}, {}, cleanupCanvas);
    await Promise.resolve();
    cleanupCanvas.dispatchEvent(new CustomEvent('liteship:reinit'));

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(cleanupGl.deleteProgram).toHaveBeenCalled();
  });

  test('gpu directive short-circuits for static tiers and wgsl directives without duplicating warnings', async () => {
    const load = vi.fn(async () => {});
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    document.documentElement.setAttribute('data-liteship-tier', 'static');
    const staticHost = makeEl('div');
    gpuDirective(load, {}, staticHost);
    expect(staticHost.querySelector('canvas')).toBeNull();

    document.documentElement.setAttribute('data-liteship-tier', 'reactive');
    const wgslHost = makeEl('div', {
      'data-liteship-shader-type': 'wgsl',
      'data-liteship-shader-src': '/shader.wgsl',
    });
    const secondWgslHost = makeEl('div', {
      'data-liteship-shader-type': 'wgsl',
      'data-liteship-shader-src': '/shader-2.wgsl',
    });

    gpuDirective(load, {}, wgslHost);
    gpuDirective(load, {}, secondWgslHost);
    await Promise.resolve();
    await Promise.resolve();

    expect(load).toHaveBeenCalledTimes(3);
    expect(events.filter((event) => event.code === 'astro/wgpu/webgpu-unavailable')).toHaveLength(1);
  });

  test('gpu directive ignores malformed boundary payloads and non-numeric css uniform updates', async () => {
    const uniformCalls: Array<[string, number]> = [];
    const gl = {
      COMPILE_STATUS: 1,
      LINK_STATUS: 2,
      ACTIVE_UNIFORMS: 3,
      TRIANGLES: 4,
      ARRAY_BUFFER: 5,
      STATIC_DRAW: 6,
      FLOAT: 7,
      VERTEX_SHADER: 8,
      FRAGMENT_SHADER: 9,
      createShader: vi.fn(() => ({})),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn((_: unknown, kind: number) => kind !== 1 || true),
      getShaderInfoLog: vi.fn(() => ''),
      deleteShader: vi.fn(),
      createProgram: vi.fn(() => ({})),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn((_: unknown, key: number) => (key === 3 ? 2 : true)),
      getProgramInfoLog: vi.fn(() => ''),
      deleteProgram: vi.fn(),
      useProgram: vi.fn(),
      createVertexArray: vi.fn(() => ({})),
      bindVertexArray: vi.fn(),
      createBuffer: vi.fn(() => ({})),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      getAttribLocation: vi.fn(() => 0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      getActiveUniform: vi.fn().mockReturnValueOnce({ name: 'u_state' }).mockReturnValueOnce({ name: 'u_gap' }),
      getUniformLocation: vi.fn((_: unknown, name: string) => name),
      uniform1f: vi.fn((name: string, value: number) => {
        uniformCalls.push([name, value]);
      }),
      uniform2f: vi.fn(),
      viewport: vi.fn(),
      drawArrays: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (gl as never) : null,
    );
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1) as never);

    const canvas = makeEl('canvas', {
      'data-liteship-boundary': '{broken',
    }) as HTMLCanvasElement;
    stubs.define(canvas, 'clientWidth', { configurable: true, value: 320 });
    stubs.define(canvas, 'clientHeight', { configurable: true, value: 180 });

    await captureDiagnosticsAsync(async ({ events }) => {
      gpuDirective(async () => {}, {}, canvas);
      await Promise.resolve();

      canvas.dispatchEvent(
        new CustomEvent('liteship:uniform-update', {
          detail: {
            discrete: { hero: 'desktop' },
            css: {
              '--liteship-gap': 'not-a-number',
              '--liteship-state': '0.5',
            },
          },
        }),
      );

      expect(uniformCalls).toContainEqual(['u_state', 0.5]);
      expect(uniformCalls.some(([name]) => name === 'u_gap')).toBe(false);
      expect(events).toContainEqual(
        expect.objectContaining({
          level: 'warn',
          source: 'liteship/astro.gpu',
          code: 'astro/gpu/uniform-update-parse-failed',
        }),
      );
    });
  });

  test('gpu directive defaults to reactive tier, tolerates null active uniforms, and skips missing discrete state uniforms', async () => {
    document.documentElement.removeAttribute('data-liteship-tier');
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1) as never);

    const uniformCalls: Array<[string, number]> = [];
    const gl = {
      COMPILE_STATUS: 1,
      LINK_STATUS: 2,
      ACTIVE_UNIFORMS: 3,
      TRIANGLES: 4,
      ARRAY_BUFFER: 5,
      STATIC_DRAW: 6,
      FLOAT: 7,
      VERTEX_SHADER: 8,
      FRAGMENT_SHADER: 9,
      createShader: vi.fn(() => ({})),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn((_: unknown, kind: number) => kind !== 1 || true),
      getShaderInfoLog: vi.fn(() => ''),
      deleteShader: vi.fn(),
      createProgram: vi.fn(() => ({})),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn((_: unknown, key: number) => (key === 3 ? 2 : true)),
      getProgramInfoLog: vi.fn(() => ''),
      deleteProgram: vi.fn(),
      useProgram: vi.fn(),
      createVertexArray: vi.fn(() => ({})),
      bindVertexArray: vi.fn(),
      createBuffer: vi.fn(() => ({})),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      getAttribLocation: vi.fn(() => 0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      getActiveUniform: vi.fn().mockReturnValueOnce(null).mockReturnValueOnce({ name: 'u_gap' }),
      getUniformLocation: vi.fn((_: unknown, name: string) => (name === 'u_gap' ? name : null)),
      uniform1f: vi.fn((name: string, value: number) => {
        uniformCalls.push([name, value]);
      }),
      uniform2f: vi.fn(),
      viewport: vi.fn(),
      drawArrays: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (gl as never) : null,
    );

    const canvas = makeEl('canvas', {
      'data-liteship-boundary': JSON.stringify({
        states: ['mobile', 'desktop'],
      }),
    }) as HTMLCanvasElement;
    stubs.define(canvas, 'clientWidth', { configurable: true, value: 320 });
    stubs.define(canvas, 'clientHeight', { configurable: true, value: 180 });

    gpuDirective(async () => {}, {}, canvas);
    await Promise.resolve();

    canvas.dispatchEvent(
      new CustomEvent('liteship:uniform-update', {
        detail: {
          css: {
            '--liteship-gap': '12',
          },
        },
      }),
    );
    canvas.dispatchEvent(
      new CustomEvent('liteship:uniform-update', {
        detail: {
          discrete: { default: 'missing' },
        },
      }),
    );

    expect(uniformCalls).toEqual([['u_gap', 12]]);
  });

  test('gpu directive exits cleanly when a program cannot be created after shader compilation succeeds', async () => {
    document.documentElement.removeAttribute('data-liteship-tier');
    const load = vi.fn(async () => {});
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1) as never);
    const gl = {
      COMPILE_STATUS: 1,
      LINK_STATUS: 2,
      ACTIVE_UNIFORMS: 3,
      TRIANGLES: 4,
      ARRAY_BUFFER: 5,
      STATIC_DRAW: 6,
      FLOAT: 7,
      VERTEX_SHADER: 8,
      FRAGMENT_SHADER: 9,
      createShader: vi.fn(() => ({})),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      getShaderInfoLog: vi.fn(() => ''),
      deleteShader: vi.fn(),
      createProgram: vi.fn(() => null),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      getProgramInfoLog: vi.fn(() => ''),
      deleteProgram: vi.fn(),
      useProgram: vi.fn(),
      createVertexArray: vi.fn(() => ({})),
      bindVertexArray: vi.fn(),
      createBuffer: vi.fn(() => ({})),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      getAttribLocation: vi.fn(() => 0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      getActiveUniform: vi.fn(() => null),
      getUniformLocation: vi.fn(() => null),
      uniform1f: vi.fn(),
      uniform2f: vi.fn(),
      viewport: vi.fn(),
      drawArrays: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (gl as never) : null,
    );

    const host = makeEl('canvas') as HTMLCanvasElement;
    gpuDirective(load, {}, host);
    await Promise.resolve();

    expect(load).toHaveBeenCalledOnce();
    expect(gl.useProgram).not.toHaveBeenCalled();
  });

  test('gpu directive accepts inline shader sources and drives default-id state plus resolution uniforms', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 7) as never);
    vi.stubGlobal('cancelAnimationFrame', vi.fn() as never);

    const uniform1f = vi.fn();
    const uniform2f = vi.fn();
    const gl = {
      COMPILE_STATUS: 1,
      LINK_STATUS: 2,
      ACTIVE_UNIFORMS: 3,
      TRIANGLES: 4,
      ARRAY_BUFFER: 5,
      STATIC_DRAW: 6,
      FLOAT: 7,
      VERTEX_SHADER: 8,
      FRAGMENT_SHADER: 9,
      createShader: vi.fn(() => ({})),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn((_: unknown, kind: number) => kind !== 1 || true),
      getShaderInfoLog: vi.fn(() => ''),
      deleteShader: vi.fn(),
      createProgram: vi.fn(() => ({})),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn((_: unknown, key: number) => (key === 3 ? 2 : true)),
      getProgramInfoLog: vi.fn(() => ''),
      deleteProgram: vi.fn(),
      useProgram: vi.fn(),
      createVertexArray: vi.fn(() => ({})),
      bindVertexArray: vi.fn(),
      createBuffer: vi.fn(() => ({})),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      getAttribLocation: vi.fn(() => 0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      getActiveUniform: vi
        .fn()
        .mockReturnValueOnce({ name: 'u_state' })
        .mockReturnValueOnce({ name: 'u_resolution' })
        .mockReturnValueOnce({ name: 'u_time' }),
      getProgramParameter: vi.fn((_: unknown, key: number) => (key === 3 ? 3 : true)),
      getUniformLocation: vi.fn((_: unknown, name: string) => name),
      uniform1f,
      uniform2f,
      viewport: vi.fn(),
      drawArrays: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (gl as never) : null,
    );

    const canvas = makeEl('canvas', {
      'data-liteship-shader-src':
        '#version 300 es\nprecision mediump float;\nout vec4 fragColor;\nvoid main(){ fragColor = vec4(1.0); }',
      'data-liteship-boundary': JSON.stringify({ states: ['idle', 'active'] }),
    }) as HTMLCanvasElement;
    stubs.define(canvas, 'clientWidth', { configurable: true, value: 300 });
    stubs.define(canvas, 'clientHeight', { configurable: true, value: 150 });

    gpuDirective(async () => {}, {}, canvas);
    await Promise.resolve();

    expect(uniform2f).toHaveBeenCalledWith('u_resolution', 300, 150);
    // With u_time registered, render() should feed the per-frame timestamp.
    expect(uniform1f).toHaveBeenCalledWith('u_time', expect.any(Number));

    canvas.dispatchEvent(new CustomEvent('liteship:uniform-update'));
    canvas.dispatchEvent(
      new CustomEvent('liteship:uniform-update', {
        detail: { discrete: { default: 'active' } },
      }),
    );

    expect(uniform1f).toHaveBeenCalledWith('u_state', 1);

    canvas.dispatchEvent(new CustomEvent('liteship:reinit'));
    expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
  });

  test('gpu directive rejects cross-origin shader URLs by default', async () => {
    const load = vi.fn(async () => {});
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    const host = makeEl('div', {
      'data-liteship-shader-src': 'https://evil.example/shader.frag',
    });
    gpuDirective(load, {}, host);
    await Promise.resolve();

    expect(events).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        source: 'liteship/astro.gpu',
        code: 'astro/gpu/shader-cross-origin-url-rejected',
      }),
    );
  });

  test('gpu directive tolerates missing shader/program handles and absent uniform locations', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 9) as never);
    vi.stubGlobal('cancelAnimationFrame', vi.fn() as never);

    const nullShaderGl = {
      createShader: vi.fn(() => null),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(),
      getShaderInfoLog: vi.fn(),
      deleteShader: vi.fn(),
      VERTEX_SHADER: 1,
      FRAGMENT_SHADER: 2,
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (nullShaderGl as never) : null,
    );

    const nullShaderHost = makeEl('canvas');
    gpuDirective(async () => {}, {}, nullShaderHost);
    await Promise.resolve();

    const uniform1f = vi.fn();
    const noUniformLocGl = {
      COMPILE_STATUS: 1,
      LINK_STATUS: 2,
      ACTIVE_UNIFORMS: 3,
      TRIANGLES: 4,
      ARRAY_BUFFER: 5,
      STATIC_DRAW: 6,
      FLOAT: 7,
      VERTEX_SHADER: 8,
      FRAGMENT_SHADER: 9,
      createShader: vi.fn(() => ({})),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn((_: unknown, kind: number) => kind !== 1 || true),
      getShaderInfoLog: vi.fn(() => ''),
      deleteShader: vi.fn(),
      createProgram: vi.fn(() => ({})),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn((_: unknown, key: number) => (key === 3 ? 1 : true)),
      getProgramInfoLog: vi.fn(() => ''),
      deleteProgram: vi.fn(),
      useProgram: vi.fn(),
      createVertexArray: vi.fn(() => ({})),
      bindVertexArray: vi.fn(),
      createBuffer: vi.fn(() => ({})),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      getAttribLocation: vi.fn(() => 0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      getActiveUniform: vi.fn(() => ({ name: 'u_state' })),
      getUniformLocation: vi.fn(() => null),
      uniform1f,
      uniform2f: vi.fn(),
      viewport: vi.fn(),
      drawArrays: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (noUniformLocGl as never) : null,
    );
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => 'void main(){}' })) as never);

    const host = makeEl('canvas', {
      'data-liteship-shader-src': '/shader.frag',
      'data-liteship-boundary': JSON.stringify({ id: 'hero', states: ['idle', 'active'] }),
    }) as HTMLCanvasElement;
    stubs.define(host, 'clientWidth', { configurable: true, value: 200 });
    stubs.define(host, 'clientHeight', { configurable: true, value: 100 });

    gpuDirective(async () => {}, {}, host);
    await Promise.resolve();
    await Promise.resolve();

    host.dispatchEvent(
      new CustomEvent('liteship:uniform-update', {
        detail: {
          discrete: { hero: 'active' },
          css: { '--liteship-state': '0.5' },
        },
      }),
    );
    document.dispatchEvent(new CustomEvent('liteship:uniform-update', { detail: { uniform: 'u_state', value: 1 } }));

    expect(uniform1f).not.toHaveBeenCalled();
  });

  test('stream directive handles snapshot patches, heartbeat noops, reinit, and reconnect exhaustion', async () => {
    cleanupEventSource = MockEventSource.install();
    vi.useFakeTimers();
    try {
      const el = makeEl('div', {
        id: 'stream-root',
        'data-liteship-stream-url': '/api/feed',
        'data-liteship-stream-morph': 'outerHTML',
      });
      el.innerHTML = '<input id="before" value="old" />';

      const morphs: unknown[] = [];
      const errors: unknown[] = [];
      document.addEventListener('liteship:stream-morph', ((event: CustomEvent) =>
        morphs.push(event.type)) as EventListener);
      document.addEventListener('liteship:stream-error', ((event: CustomEvent) =>
        errors.push(event.detail)) as EventListener);

      streamDirective(async () => {}, {}, el);

      let source = MockEventSource.instances[0]!;
      source.simulateMessage(
        JSON.stringify({
          type: 'snapshot',
          data: {
            html: '<section id="stream-root"><input id="after" value="new" /></section>',
          },
        }),
        'evt-1',
      );
      await Promise.resolve();
      await Promise.resolve();
      expect(document.getElementById('after')).not.toBeNull();
      expect(morphs).toEqual(['liteship:stream-morph']);

      source.simulateMessage(JSON.stringify({ type: 'heartbeat' }));
      expect(document.getElementById('after')).not.toBeNull();

      // Non-JSON payload should be rejected by parseMessage and silently skipped,
      // leaving the latest morph state untouched.
      source.simulateMessage('not-json-at-all', 'evt-ignore');
      expect(document.getElementById('after')).not.toBeNull();

      const active = document.getElementById('after') as HTMLInputElement;
      active.focus();
      document.getElementById('stream-root')!.dispatchEvent(new CustomEvent('liteship:reinit'));
      expect(MockEventSource.instances).toHaveLength(2);

      source = MockEventSource.instances.at(-1)!;
      for (let attempt = 0; attempt < 11; attempt++) {
        source.simulateError();
        await vi.advanceTimersByTimeAsync(35_000);
        source = MockEventSource.instances.at(-1) ?? source;
      }

      expect(errors).toContainEqual({ reason: 'max-reconnect-attempts' });
    } finally {
      vi.useRealTimers();
    }
  });

  test('stream directive surfaces resumption failures and keeps signal messages on the shared path', async () => {
    cleanupEventSource = MockEventSource.install();
    vi.useFakeTimers();
    // Zero the reconnect-backoff jitter so the 1000ms advance deterministically
    // fires the reconnect and the recovery frame lands on the LIVE reconnected
    // source — SSE.create now ignores a frame from the dead (pre-reconnect) source.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const resumeSpy = vi.spyOn(Resumption, 'resume').mockRejectedValue(new Error('resume boom'));

    try {
      const el = makeEl('div', {
        id: 'stream-resume',
        'data-liteship-stream-url': '/api/feed',
        'data-liteship-stream-artifact': 'hero',
      });

      const signals: unknown[] = [];
      const errors: unknown[] = [];
      el.addEventListener('liteship:signal', ((event: CustomEvent) => signals.push(event.detail)) as EventListener);
      el.addEventListener('liteship:stream-error', ((event: CustomEvent) =>
        errors.push(event.detail)) as EventListener);

      streamDirective(async () => {}, {}, el);

      const firstSource = MockEventSource.instances[0]!;
      firstSource.simulateMessage(JSON.stringify({ type: 'signal', data: { state: 'ready' } }), 'evt-1');
      expect(signals).toEqual([{ state: 'ready' }]);

      firstSource.simulateError();
      await vi.advanceTimersByTimeAsync(1000);

      const secondSource = MockEventSource.instances.at(-1)!;
      secondSource.simulateOpen();
      secondSource.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-2');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(resumeSpy).toHaveBeenCalledWith('hero', 'evt-2', expect.objectContaining({}));
      expect(errors).toContainEqual({ reason: 'resume-failed', message: 'resume boom' });
    } finally {
      vi.useRealTimers();
    }
  });

  test('stream directive retargets semantic-id replacements and rebinds reinit listeners to the swapped node', async () => {
    cleanupEventSource = MockEventSource.install();

    const distractor = document.createElement('div');
    distractor.setAttribute('data-liteship-id', 'semantic-other');
    document.body.appendChild(distractor);

    const host = makeEl('section', {
      'data-liteship-stream-url': '/api/feed',
      'data-liteship-stream-morph': 'outerHTML',
      'data-liteship-id': 'semantic-root',
    });

    streamDirective(async () => {}, {}, host);

    const firstSource = MockEventSource.instances[0]!;
    firstSource.simulateMessage(
      JSON.stringify({
        type: 'patch',
        data: '<section data-liteship-id="semantic-root"><div class="replacement">patched</div></section>',
      }),
      'evt-1',
    );
    await Promise.resolve();
    await Promise.resolve();

    const replacement = document.querySelector('[data-liteship-id="semantic-root"]') as HTMLElement | null;
    expect(replacement).not.toBeNull();
    expect(replacement?.querySelector('.replacement')?.textContent).toBe('patched');

    replacement?.dispatchEvent(new CustomEvent('liteship:reinit'));

    expect(MockEventSource.instances).toHaveLength(2);
    expect(firstSource.readyState).toBe(MockEventSource.CLOSED);
    expect(MockEventSource.instances[1]?.url).toContain('/api/feed');
  });

  test('stream directive tolerates semantic-id targets disappearing after outerHTML replacement', async () => {
    cleanupEventSource = MockEventSource.install();

    const host = makeEl('section', {
      'data-liteship-stream-url': '/api/feed',
      'data-liteship-stream-morph': 'outerHTML',
      'data-liteship-id': 'semantic-root',
    });

    streamDirective(async () => {}, {}, host);

    const firstSource = MockEventSource.instances[0]!;
    firstSource.simulateMessage(
      JSON.stringify({
        type: 'patch',
        data: '<section><div class="replacement">detached</div></section>',
      }),
      'evt-missing',
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(document.querySelector('[data-liteship-id="semantic-root"]')).toBeNull();

    host.dispatchEvent(new CustomEvent('liteship:reinit'));

    expect(MockEventSource.instances).toHaveLength(2);
    expect(firstSource.readyState).toBe(MockEventSource.CLOSED);
  });

  test('stream directive resolves semantic-id targets on the document root through the root fast path', async () => {
    cleanupEventSource = MockEventSource.install();
    document.documentElement.setAttribute('data-liteship-id', 'semantic-fast-path');
    const host = makeEl('section', {
      'data-liteship-stream-url': '/api/root-feed',
      'data-liteship-id': 'semantic-fast-path',
    });

    try {
      streamDirective(async () => {}, {}, host);

      const source = MockEventSource.instances.at(-1)!;
      source.simulateMessage(
        JSON.stringify({
          type: 'batch',
          data: '<section data-liteship-id="semantic-fast-path"><main class="root-fast-path">patched</main></section>',
        }),
        'evt-root',
      );
      await Promise.resolve();
      await Promise.resolve();

      expect(host.querySelector('.root-fast-path')?.textContent).toBe('patched');
    } finally {
      document.documentElement.removeAttribute('data-liteship-id');
    }
  });

  test('stream directive accepts batch payloads and ignores snapshot payloads without html', async () => {
    cleanupEventSource = MockEventSource.install();

    const host = makeEl('div', {
      'data-liteship-stream-url': '/api/feed',
    });
    host.innerHTML = '<div class="initial">before</div>';

    streamDirective(async () => {}, {}, host);
    const source = MockEventSource.instances[0]!;

    source.simulateMessage(
      JSON.stringify({
        type: 'snapshot',
        data: { ignored: true },
      }),
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(host.innerHTML).toContain('before');

    source.simulateMessage(
      JSON.stringify({
        type: 'batch',
        data: '<div class="batched">after</div>',
      }),
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(host.querySelector('.batched')?.textContent).toBe('after');
  });

  test('stream directive replays patch data payloads during successful resumption without attaching the default endpoint policy', async () => {
    cleanupEventSource = MockEventSource.install();
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // deterministic reconnect backoff - recovery frame lands on the LIVE source
    const resumeSpy = vi.spyOn(Resumption, 'resume').mockReturnValue(
      Promise.resolve({
        type: 'replay',
        patches: [{ data: '<div class="replayed">resumed</div>' }],
      }),
    );

    try {
      const host = makeEl('div', {
        'data-liteship-stream-url': '/api/feed',
        'data-liteship-stream-artifact': 'hero',
      });

      streamDirective(async () => {}, {}, host);

      const firstSource = MockEventSource.instances[0]!;
      firstSource.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-1');
      firstSource.simulateError();
      await vi.advanceTimersByTimeAsync(1000);

      const secondSource = MockEventSource.instances.at(-1)!;
      secondSource.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-2');
      await Promise.resolve();
      await Promise.resolve();

      expect(resumeSpy).toHaveBeenCalledWith('hero', 'evt-2', {});
    } finally {
      vi.useRealTimers();
    }
  });

  test('stream directive forwards custom endpoint policy plus snapshot and replay urls during resumption', async () => {
    cleanupEventSource = MockEventSource.install();
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // deterministic reconnect backoff - recovery frame lands on the LIVE source
    configureRuntimePolicy({
      endpointPolicy: {
        mode: 'same-origin',
        byKind: {
          stream: ['https://trusted.example'],
        },
      },
    });
    const resumeSpy = vi.spyOn(Resumption, 'resume').mockReturnValue(
      Promise.resolve({
        type: 'replay',
        patches: ['<div class="string-replay">string</div>', { data: '<div class="data-replay">data</div>' }, 42],
      }),
    );

    try {
      const host = makeEl('div', {
        'data-liteship-stream-url': '/api/feed',
        'data-liteship-stream-artifact': 'hero',
        'data-liteship-snapshot-url': '/api/snapshot',
        'data-liteship-replay-url': '/api/replay',
      });

      streamDirective(async () => {}, {}, host);

      const firstSource = MockEventSource.instances[0]!;
      firstSource.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-1');
      firstSource.simulateError();
      await vi.advanceTimersByTimeAsync(1000);

      const secondSource = MockEventSource.instances.at(-1)!;
      secondSource.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-2');
      await Promise.resolve();
      await Promise.resolve();

      expect(resumeSpy).toHaveBeenCalledWith(
        'hero',
        'evt-2',
        expect.objectContaining({
          snapshotUrl: '/api/snapshot',
          replayUrl: '/api/replay',
          endpointPolicy: expect.objectContaining({
            mode: 'same-origin',
            allowOrigins: [],
            byKind: expect.objectContaining({
              stream: ['https://trusted.example'],
            }),
          }),
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  test('stream directive forwards allowOrigins-only policy during resumption and skips resume when no artifact id is present', async () => {
    cleanupEventSource = MockEventSource.install();
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // deterministic reconnect backoff - recovery frame lands on the LIVE source
    configureRuntimePolicy({
      endpointPolicy: {
        mode: 'same-origin',
        allowOrigins: ['https://trusted.example'],
      },
    });
    const resumeSpy = vi.spyOn(Resumption, 'resume').mockReturnValue(
      Promise.resolve({
        type: 'snapshot',
        html: '<div class="resumed">resumed</div>',
      }),
    );

    try {
      const resumable = makeEl('div', {
        'data-liteship-stream-url': '/api/feed',
        'data-liteship-stream-artifact': 'hero',
      });

      streamDirective(async () => {}, {}, resumable);

      const firstSource = MockEventSource.instances[0]!;
      firstSource.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-1');
      firstSource.simulateError();
      await vi.advanceTimersByTimeAsync(1000);

      const secondSource = MockEventSource.instances.at(-1)!;
      secondSource.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-2');
      await Promise.resolve();
      await Promise.resolve();

      expect(resumeSpy).toHaveBeenCalledWith(
        'hero',
        'evt-2',
        expect.objectContaining({
          endpointPolicy: expect.objectContaining({
            mode: 'same-origin',
            allowOrigins: ['https://trusted.example'],
          }),
        }),
      );

      resumeSpy.mockClear();

      const noArtifact = makeEl('div', {
        'data-liteship-stream-url': '/api/feed',
      });

      streamDirective(async () => {}, {}, noArtifact);

      const noArtifactSource = MockEventSource.instances.at(-1)!;
      noArtifactSource.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-3');
      noArtifactSource.simulateError();
      await vi.advanceTimersByTimeAsync(1000);

      MockEventSource.instances.at(-1)!.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-4');
      await Promise.resolve();
      await Promise.resolve();

      expect(resumeSpy).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  test('stream directive forwards byKind-only endpoint policy during resumption', async () => {
    cleanupEventSource = MockEventSource.install();
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // deterministic reconnect backoff - recovery frame lands on the LIVE source
    configureRuntimePolicy({
      endpointPolicy: {
        mode: 'same-origin',
        byKind: {
          replay: ['https://replay.example'],
        },
      },
    });
    const resumeSpy = vi.spyOn(Resumption, 'resume').mockReturnValue(
      Promise.resolve({
        type: 'snapshot',
        html: '<div class="resumed">resumed</div>',
      }),
    );

    try {
      const resumable = makeEl('div', {
        'data-liteship-stream-url': '/api/feed',
        'data-liteship-stream-artifact': 'hero',
      });

      streamDirective(async () => {}, {}, resumable);

      const source = MockEventSource.instances[0]!;
      source.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-9');
      source.simulateError();
      await vi.advanceTimersByTimeAsync(1000);

      MockEventSource.instances.at(-1)!.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-10');
      await Promise.resolve();
      await Promise.resolve();

      expect(resumeSpy).toHaveBeenCalledWith(
        'hero',
        'evt-10',
        expect.objectContaining({
          endpointPolicy: expect.objectContaining({
            mode: 'same-origin',
            allowOrigins: [],
            byKind: expect.objectContaining({
              replay: ['https://replay.example'],
            }),
          }),
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  test('stream directive keeps the same reinit binding across stable targets and surfaces non-Error resume failures', async () => {
    cleanupEventSource = MockEventSource.install();
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // deterministic reconnect backoff - recovery frame lands on the LIVE source
    const resumeSpy = vi.spyOn(Resumption, 'resume').mockRejectedValue('resume string failure');

    try {
      const host = makeEl('div', {
        id: 'stable-stream',
        'data-liteship-stream-url': '/api/feed',
        'data-liteship-stream-artifact': 'hero',
      });
      const addSpy = vi.spyOn(host, 'addEventListener');
      const removeSpy = vi.spyOn(host, 'removeEventListener');
      const errors: unknown[] = [];
      host.addEventListener('liteship:stream-error', ((event: CustomEvent) =>
        errors.push(event.detail)) as EventListener);

      streamDirective(async () => {}, {}, host);

      const source = MockEventSource.instances[0]!;
      source.simulateMessage(JSON.stringify({ type: 'snapshot', data: 'ignored' }), 'evt-1');
      source.simulateMessage(JSON.stringify({ type: 'patch', data: '<div class="first-pass">ok</div>' }), 'evt-2');
      await Promise.resolve();
      await Promise.resolve();
      source.simulateMessage(JSON.stringify({ type: 'patch', data: '<div class="second-pass">again</div>' }), 'evt-3');
      await Promise.resolve();
      await Promise.resolve();

      source.simulateError();
      await vi.advanceTimersByTimeAsync(1000);

      const secondSource = MockEventSource.instances.at(-1)!;
      secondSource.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-4');
      await Promise.resolve();
      await Promise.resolve();

      expect(addSpy.mock.calls.filter(([type]) => type === 'liteship:reinit')).toHaveLength(1);
      expect(removeSpy.mock.calls.filter(([type]) => type === 'liteship:reinit')).toHaveLength(0);
      expect(resumeSpy).toHaveBeenCalledWith('hero', 'evt-4', {});
      expect(errors).toContainEqual({ reason: 'resume-failed', message: 'resume string failure' });
    } finally {
      vi.useRealTimers();
    }
  });

  test('stream directive forwards non-default endpoint modes during resumption', async () => {
    cleanupEventSource = MockEventSource.install();
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // deterministic reconnect backoff - recovery frame lands on the LIVE source
    configureRuntimePolicy({
      endpointPolicy: {
        mode: 'allowlist',
        allowOrigins: ['https://trusted.example'],
      },
    });
    const resumeSpy = vi.spyOn(Resumption, 'resume').mockReturnValue(
      Promise.resolve({
        type: 'snapshot',
        html: '<div class="resumed">resumed</div>',
      }),
    );

    try {
      const host = makeEl('div', {
        'data-liteship-stream-url': '/api/feed',
        'data-liteship-stream-artifact': 'hero',
      });

      streamDirective(async () => {}, {}, host);

      const source = MockEventSource.instances[0]!;
      source.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-1');
      source.simulateError();
      await vi.advanceTimersByTimeAsync(1000);

      MockEventSource.instances.at(-1)!.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-2');
      await Promise.resolve();
      await Promise.resolve();

      expect(resumeSpy).toHaveBeenCalledWith(
        'hero',
        'evt-2',
        expect.objectContaining({
          endpointPolicy: expect.objectContaining({
            mode: 'allowlist',
            allowOrigins: ['https://trusted.example'],
          }),
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  test('worker directive boots real worker mode, applies state, and recreates on reinit', async () => {
    restoreWorker = MockWorker.install();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-worker');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.stubGlobal('innerWidth', 1024);
    stubs.define(self, 'crossOriginIsolated', { configurable: true, value: true });
    if (typeof SharedArrayBuffer === 'undefined') {
      vi.stubGlobal('SharedArrayBuffer', class MockSharedArrayBuffer {} as never);
    }

    let resizeCallback: ResizeObserverCallback | null = null;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resizeCallback = callback;
        }
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );

    const load = vi.fn(async () => {});
    const el = makeEl('div', {
      'data-liteship-boundary': JSON.stringify({
        id: 'hero',
        input: 'viewport.width',
        thresholds: [0, 768],
        states: ['mobile', 'desktop'],
        hysteresis: 40,
      }),
    });

    const workerStates: unknown[] = [];
    const uniformStates: unknown[] = [];
    let readyCount = 0;
    el.addEventListener('liteship:worker-ready', () => {
      readyCount++;
    });
    el.addEventListener('liteship:worker-state', ((event: CustomEvent) =>
      workerStates.push(event.detail)) as EventListener);
    el.addEventListener('liteship:uniform-update', ((event: CustomEvent) =>
      uniformStates.push(event.detail)) as EventListener);

    workerDirective(load, {}, el);

    expect(MockWorker.instances).toHaveLength(1);
    const firstWorker = MockWorker.instances[0]!;
    expect(firstWorker.postedMessages.map((entry) => (entry.data as { type: string }).type)).toEqual([
      'init',
      'bootstrap-quantizers',
      'bootstrap-resolved-state',
    ]);
    expect(firstWorker.postedMessages.at(1)?.data).toEqual({
      type: 'bootstrap-quantizers',
      registrations: [
        {
          name: 'hero',
          boundaryId: expect.stringMatching(/^fnv1a:/),
          states: ['mobile', 'desktop'],
          thresholds: new Float64Array([0, 768]),
        },
      ],
    });
    expect(firstWorker.postedMessages.at(2)?.data).toEqual({
      type: 'bootstrap-resolved-state',
      ack: true,
      states: [
        {
          name: 'hero',
          state: 'desktop',
          generation: 1,
        },
      ],
    });
    firstWorker.simulateMessage({ type: 'ready' });

    expect(load).toHaveBeenCalledOnce();
    expect(readyCount).toBe(1);
    expect(el.getAttribute('data-liteship-state')).toBe('desktop');
    expect(workerStates).toContainEqual(
      expect.objectContaining({
        discrete: { hero: 'desktop' },
      }),
    );
    expect(uniformStates).toContainEqual(
      expect.objectContaining({
        discrete: { hero: 'desktop' },
      }),
    );

    vi.stubGlobal('innerWidth', 640);
    resizeCallback?.([] as never, {} as never);
    await Promise.resolve();
    await Promise.resolve();
    expect(firstWorker.postedMessages).toContainEqual({
      data: {
        type: 'apply-resolved-state',
        ack: true,
        states: [{ name: 'hero', state: 'mobile', generation: 2 }],
      },
      transfer: [],
    });

    el.dispatchEvent(new CustomEvent('liteship:reinit'));
    expect(firstWorker.postedMessages.some((entry) => (entry.data as { type: string }).type === 'dispose')).toBe(false);
    expect(MockWorker.instances).toHaveLength(1);
    expect(firstWorker.postedMessages.slice(-3).map((entry) => (entry.data as { type: string }).type)).toEqual([
      'init',
      'bootstrap-quantizers',
      'bootstrap-resolved-state',
    ]);
    firstWorker.simulateMessage({ type: 'ready' });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  test('worker mode keeps continuous uniform signals flowing on the SAB path', async () => {
    restoreWorker = MockWorker.install();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-worker');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    stubs.define(self, 'crossOriginIsolated', { configurable: true, value: true });
    if (typeof SharedArrayBuffer === 'undefined') {
      vi.stubGlobal('SharedArrayBuffer', class MockSharedArrayBuffer {} as never);
    }

    const rafQueue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', ((callback: FrameRequestCallback): number => {
      rafQueue.push(callback);
      return rafQueue.length;
    }) as never);
    vi.stubGlobal('cancelAnimationFrame', vi.fn() as never);

    const scrollGeometry = { scrollHeight: 1500, innerHeight: 500 };
    const progressFor = (scrollY: number): number =>
      scrollY / (scrollGeometry.scrollHeight - scrollGeometry.innerHeight);
    const initialScrollY = 250;
    const progressedScrollY = 750;
    stubs.define(window, 'innerHeight', { configurable: true, value: scrollGeometry.innerHeight });
    stubs.define(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: scrollGeometry.scrollHeight,
    });
    stubs.define(window, 'scrollY', { configurable: true, value: initialScrollY });

    const load = vi.fn(async () => {});
    const el = makeEl('div', {
      'data-liteship-boundary': JSON.stringify({
        id: 'hero',
        input: 'scroll.progress',
        thresholds: [0, 0.5],
        states: ['top', 'bottom'],
      }),
    });

    const uniformStates: unknown[] = [];
    el.addEventListener('liteship:uniform-update', ((event: CustomEvent) =>
      uniformStates.push(event.detail)) as EventListener);

    workerDirective(load, {}, el);
    expect(MockWorker.instances).toHaveLength(1);
    const worker = MockWorker.instances[0]!;
    expect(worker.postedMessages.map((entry) => (entry.data as { type: string }).type)).toEqual([
      'init',
      'bootstrap-quantizers',
      'bootstrap-resolved-state',
    ]);

    worker.simulateMessage({
      type: 'state',
      state: {
        discrete: { hero: 'top' },
        outputs: {
          css: {},
          glsl: { u_worker_state: 1 },
          wgsl: { worker_state: 1 },
          aria: {},
        },
      },
      resolvedStateGenerations: { hero: 1 },
    });

    const stop = driveUniformFromSignal(el, 'scroll.progress', 'u_progress');
    try {
      const seededUniform = uniformStates.find(
        (detail) => (detail as { wgsl?: Record<string, number> }).wgsl?.u_progress !== undefined,
      ) as { glsl: Record<string, number>; wgsl: Record<string, number> } | undefined;
      expect(seededUniform?.glsl.u_progress).toBeCloseTo(progressFor(initialScrollY), 6);
      expect(seededUniform?.wgsl.u_progress).toBeCloseTo(progressFor(initialScrollY), 6);

      stubs.define(window, 'scrollY', { configurable: true, value: progressedScrollY });
      window.dispatchEvent(new Event('scroll'));
      while (rafQueue.length > 0) {
        rafQueue.shift()!(16);
      }

      const progressedUniforms = uniformStates
        .map((detail) => detail as { glsl?: Record<string, number>; wgsl?: Record<string, number> })
        .filter((detail) => detail.wgsl?.u_progress !== undefined);
      expect(progressedUniforms.at(-1)?.glsl?.u_progress).toBeCloseTo(progressFor(progressedScrollY), 6);
      expect(progressedUniforms.at(-1)?.wgsl?.u_progress).toBeCloseTo(progressFor(progressedScrollY), 6);
      expect(uniformStates).toContainEqual(
        expect.objectContaining({
          glsl: expect.objectContaining({ u_worker_state: 1 }),
          wgsl: expect.objectContaining({ worker_state: 1 }),
        }),
      );
    } finally {
      stop();
    }
  });

  test('worker directive skips malformed boundaries and unsupported signal inputs gracefully', () => {
    restoreWorker = MockWorker.install();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-worker');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    stubs.define(self, 'crossOriginIsolated', { configurable: true, value: true });
    if (typeof SharedArrayBuffer === 'undefined') {
      vi.stubGlobal('SharedArrayBuffer', class MockSharedArrayBuffer {} as never);
    }
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );

    const load = vi.fn(async () => {});
    const invalid = makeEl('div', { 'data-liteship-boundary': '{broken' });
    workerDirective(load, {}, invalid);
    expect(MockWorker.instances).toHaveLength(0);
    expect(load).not.toHaveBeenCalled();

    const unsupported = makeEl('div', {
      'data-liteship-boundary': JSON.stringify({
        id: 'hero',
        input: 'scroll.depth',
        thresholds: [0, 100],
        states: ['near', 'far'],
      }),
    });
    workerDirective(load, {}, unsupported);

    expect(MockWorker.instances).toHaveLength(1);
    const worker = MockWorker.instances[0]!;
    expect(worker.postedMessages.map((entry) => (entry.data as { type: string }).type)).toEqual(['init']);
    worker.simulateMessage({ type: 'ready' });
    expect(load).toHaveBeenCalledOnce();
  });

  test('worker directive falls back to main-thread evaluation when WorkerHost initialization fails', () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    vi.spyOn(WorkerHost, 'create').mockImplementation(() => {
      throw new Error('worker boom');
    });
    vi.stubGlobal('Worker', class MockWorker {} as never);
    vi.stubGlobal('innerWidth', 960);
    stubs.define(self, 'crossOriginIsolated', { configurable: true, value: true });
    if (typeof SharedArrayBuffer === 'undefined') {
      vi.stubGlobal('SharedArrayBuffer', class MockSharedArrayBuffer {} as never);
    }

    let resizeCallback: ResizeObserverCallback | null = null;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resizeCallback = callback;
        }
        observe() {}
        disconnect() {
          disconnect();
        }
        unobserve() {}
      },
    );

    const el = makeEl('div', {
      'data-liteship-boundary': JSON.stringify({
        id: 'hero',
        input: 'viewport.width',
        thresholds: [0, 768],
        states: ['mobile', 'desktop'],
        hysteresis: 32,
      }),
    });

    workerDirective(async () => {}, {}, el);
    expect(el.getAttribute('data-liteship-state')).toBe('desktop');
    expect(events).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        source: 'liteship/astro.worker',
        code: 'astro/worker/worker-host-fallback',
        detail: 'worker boom',
      }),
    );

    vi.stubGlobal('innerWidth', 640);
    resizeCallback?.([] as never, {} as never);
    expect(el.getAttribute('data-liteship-state')).toBe('mobile');

    el.dispatchEvent(new CustomEvent('liteship:teardown'));
    expect(disconnect).toHaveBeenCalled();
  });
});

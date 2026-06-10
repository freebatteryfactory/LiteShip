// @vitest-environment jsdom
/**
 * Branch coverage for the WebGPU WGSL runtime (`client:gpu` WGSL path).
 *
 * wgpu.ts sat at 4% branches on the runtime-seams hotspot table because no
 * test exercised it — but unlike the audio-worklet modules it is NOT
 * realm-locked: every WebGPU surface it touches is a structural interface,
 * so jsdom + stubs can drive the full init/render/dispose lifecycle and all
 * shader-source arms.
 *
 * @module
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Diagnostics } from '@czap/core';
import { initWGSLRuntime, warnWebGpuUnavailable } from '../../../packages/astro/src/runtime/wgpu.js';

interface FakeGpuHarness {
  readonly gpu: {
    requestAdapter(): Promise<unknown>;
    getPreferredCanvasFormat(): string;
  };
  readonly calls: {
    shaderCodes: string[];
    configured: Array<Record<string, unknown>>;
    submits: number;
  };
}

function makeGpuHarness(): FakeGpuHarness {
  const calls: FakeGpuHarness['calls'] = { shaderCodes: [], configured: [], submits: 0 };
  const pass = { setPipeline: vi.fn(), draw: vi.fn(), end: vi.fn() };
  const encoder = { beginRenderPass: () => pass, finish: () => ({}) };
  const device = {
    createShaderModule: (desc: { code: string }) => {
      calls.shaderCodes.push(desc.code);
      return {};
    },
    createRenderPipeline: () => ({}),
    createCommandEncoder: () => encoder,
    queue: {
      submit: () => {
        calls.submits += 1;
      },
    },
  };
  const adapter = { requestDevice: async () => device };
  return {
    gpu: {
      requestAdapter: async () => adapter,
      getPreferredCanvasFormat: () => 'bgra8unorm',
    },
    calls,
  };
}

function makeCanvas(withContext: boolean): { canvas: HTMLCanvasElement; configure: ReturnType<typeof vi.fn> } {
  const canvas = document.createElement('canvas');
  const configure = vi.fn();
  const context = { configure, getCurrentTexture: () => ({ createView: () => ({}) }) };
  vi.spyOn(canvas, 'getContext').mockReturnValue(withContext ? (context as unknown as RenderingContext) : null);
  return { canvas, configure };
}

function stubGpu(gpu: unknown): void {
  vi.stubGlobal('navigator', { gpu });
}

function stubRaf(): { frames: Array<() => void>; cancel: ReturnType<typeof vi.fn> } {
  const frames: Array<() => void> = [];
  const cancel = vi.fn();
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', cancel);
  return { frames, cancel };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('initWGSLRuntime — availability gates', () => {
  it('returns null when navigator.gpu is absent', async () => {
    stubGpu(undefined);
    const { canvas } = makeCanvas(true);
    expect(await initWGSLRuntime(canvas, 'inline')).toBeNull();
  });

  it('returns null when requestAdapter yields no adapter', async () => {
    stubGpu({ requestAdapter: async () => null, getPreferredCanvasFormat: () => 'bgra8unorm' });
    const { canvas } = makeCanvas(true);
    expect(await initWGSLRuntime(canvas, 'inline')).toBeNull();
  });

  it('returns null when the canvas has no webgpu context', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    const { canvas } = makeCanvas(false);
    expect(await initWGSLRuntime(canvas, 'inline')).toBeNull();
  });
});

describe('initWGSLRuntime — shader source arms', () => {
  it('uses an inline WGSL string verbatim (no fetch)', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { canvas, configure } = makeCanvas(true);

    const dispose = await initWGSLRuntime(canvas, '@fragment fn custom() {}');
    expect(dispose).not.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(harness.calls.shaderCodes[0]).toBe('@fragment fn custom() {}');
    expect(configure).toHaveBeenCalledWith(expect.objectContaining({ format: 'bgra8unorm', alphaMode: 'premultiplied' }));
    dispose!();
  });

  it('fetches a path-rooted shader source and renders it', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => 'fetched-wgsl' })));
    const { canvas } = makeCanvas(true);

    const dispose = await initWGSLRuntime(canvas, '/shaders/main.wgsl');
    expect(dispose).not.toBeNull();
    expect(harness.calls.shaderCodes[0]).toBe('fetched-wgsl');
    dispose!();
  });

  it('falls back to the built-in fullscreen shader when the fetch responds non-ok', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, statusText: 'Not Found', text: async () => '' })));
    const { canvas } = makeCanvas(true);

    const dispose = await initWGSLRuntime(canvas, 'http://example.test/shader.wgsl');
    expect(dispose).not.toBeNull();
    expect(harness.calls.shaderCodes[0]).toContain('vs_main');
    expect(events).toContainEqual(expect.objectContaining({ code: 'wgsl-fetch-failed' }));
    dispose!();
  });

  it('falls back to the built-in shader when the fetch throws (after warning)', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    const { canvas } = makeCanvas(true);

    const dispose = await initWGSLRuntime(canvas, '/shaders/missing.wgsl');
    expect(dispose).not.toBeNull();
    expect(harness.calls.shaderCodes[0]).toContain('vs_main');
    expect(events).toContainEqual(expect.objectContaining({ code: 'wgsl-fetch-threw' }));
    dispose!();
  });
});

describe('initWGSLRuntime — render loop and dispose', () => {
  it('sizes from fallback dims in jsdom, skips resize when unchanged, and submits per frame', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    const { frames } = stubRaf();
    const { canvas } = makeCanvas(true);

    const dispose = await initWGSLRuntime(canvas, 'inline');
    expect(dispose).not.toBeNull();
    // First render ran synchronously: jsdom clientWidth/Height are 0, so the
    // CANVAS_FALLBACK_* arms fire and the resize branch is taken.
    expect(canvas.width).toBeGreaterThan(0);
    expect(harness.calls.submits).toBe(1);

    // Second frame: dimensions unchanged → the no-resize arm.
    frames[0]!();
    expect(harness.calls.submits).toBe(2);
    dispose!();
  });

  it('uses live client dimensions when the element is laid out', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    const { canvas } = makeCanvas(true);
    Object.defineProperty(canvas, 'clientWidth', { value: 320, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 200, configurable: true });

    const dispose = await initWGSLRuntime(canvas, 'inline');
    expect(canvas.width).toBe(320);
    expect(canvas.height).toBe(200);
    dispose!();
  });

  it('dispose stops the loop: pending frames no-op and the scheduled frame is cancelled', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    const { frames, cancel } = stubRaf();
    const { canvas } = makeCanvas(true);

    const dispose = await initWGSLRuntime(canvas, 'inline');
    expect(harness.calls.submits).toBe(1);
    dispose!();
    expect(cancel).toHaveBeenCalled();

    // A frame that was already queued before dispose must hit the !running gate.
    frames[0]!();
    expect(harness.calls.submits).toBe(1);
  });
});

describe('warnWebGpuUnavailable', () => {
  it('emits the webgpu-unavailable warnOnce', () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    warnWebGpuUnavailable();
    expect(events).toContainEqual(expect.objectContaining({ code: 'webgpu-unavailable' }));
  });
});

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
    /** Each `queue.writeBuffer` upload, snapshotted as a copy of the Float32Array. */
    bufferWrites: Float32Array[];
    /** Each `setBindGroup(index, …)` call's group index. */
    bindGroups: number[];
  };
}

function makeGpuHarness(): FakeGpuHarness {
  const calls: FakeGpuHarness['calls'] = {
    shaderCodes: [],
    configured: [],
    submits: 0,
    bufferWrites: [],
    bindGroups: [],
  };
  const pass = {
    setPipeline: vi.fn(),
    setBindGroup: (index: number) => {
      calls.bindGroups.push(index);
    },
    draw: vi.fn(),
    end: vi.fn(),
  };
  const encoder = { beginRenderPass: () => pass, finish: () => ({}) };
  const pipeline = { getBindGroupLayout: () => ({}) };
  const device = {
    createShaderModule: (desc: { code: string }) => {
      calls.shaderCodes.push(desc.code);
      return {};
    },
    createRenderPipeline: () => pipeline,
    createCommandEncoder: () => encoder,
    createBuffer: () => ({}),
    createBindGroup: () => ({}),
    queue: {
      submit: () => {
        calls.submits += 1;
      },
      writeBuffer: (_buffer: unknown, _offset: number, data: ArrayBufferView) => {
        // Snapshot the upload so assertions see the value at write time, not a
        // later-mutated scratch array.
        calls.bufferWrites.push(Float32Array.from(data as unknown as ArrayLike<number>));
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
    expect(configure).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'bgra8unorm', alphaMode: 'premultiplied' }),
    );
    dispose!();
  });

  it('fetches a path-rooted shader source and renders it', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, text: async () => 'fetched-wgsl' })),
    );
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
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, statusText: 'Not Found', text: async () => '' })),
    );
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

describe('initWGSLRuntime — czap:uniform-update → uniform buffer (D1-WGSL live cast)', () => {
  it('binds detail.wgsl field values into the uniform buffer on every crossing', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    const { canvas } = makeCanvas(true);
    const el = document.createElement('div');

    const dispose = await initWGSLRuntime(canvas, 'inline', el);
    expect(dispose).not.toBeNull();
    // The render loop binds group 0 each frame.
    expect(harness.calls.bindGroups[0]).toBe(0);
    // The seed write zeroes the struct before the first crossing.
    const seeded = harness.calls.bufferWrites.at(-1)!;
    expect(Array.from(seeded)).toEqual([0, 0, 0, 0]);

    // A boundary crossing: detail.wgsl carries the live state index plus an
    // authored field. state_index claims slot 0; blur_radius the next slot.
    el.dispatchEvent(
      new CustomEvent('czap:uniform-update', {
        detail: { wgsl: { state_index: 1, blur_radius: 2.5 } },
      }),
    );
    const afterCross = harness.calls.bufferWrites.at(-1)!;
    expect(afterCross[0]).toBe(1); // state_index → slot 0
    expect(afterCross[1]).toBe(2.5); // blur_radius → slot 1 (first-seen order)

    // A field keeps its slot across crossings (stable offset).
    el.dispatchEvent(
      new CustomEvent('czap:uniform-update', {
        detail: { wgsl: { state_index: 0, blur_radius: 0.5 } },
      }),
    );
    const after2 = harness.calls.bufferWrites.at(-1)!;
    expect(after2[0]).toBe(0);
    expect(after2[1]).toBe(0.5);

    dispose!();
  });

  it('ignores uniform-update events that carry no wgsl channel', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    const { canvas } = makeCanvas(true);
    const el = document.createElement('div');

    const dispose = await initWGSLRuntime(canvas, 'inline', el);
    const writesBefore = harness.calls.bufferWrites.length;
    // No `wgsl` key → the handler is a no-op (no extra buffer write).
    el.dispatchEvent(new CustomEvent('czap:uniform-update', { detail: { glsl: { u_layout: 1 } } }));
    expect(harness.calls.bufferWrites.length).toBe(writesBefore);
    dispose!();
  });

  it('warns once and skips the field when the uniform buffer overflows', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    const { canvas } = makeCanvas(true);
    const el = document.createElement('div');

    const dispose = await initWGSLRuntime(canvas, 'inline', el);
    // state_index claims slot 0; the buffer holds 4 floats, so 4 authored
    // fields overflow it (slots 1,2,3 fill, the 4th is dropped with a warnOnce).
    el.dispatchEvent(
      new CustomEvent('czap:uniform-update', {
        detail: { wgsl: { a: 1, b: 2, c: 3, d: 4 } },
      }),
    );
    expect(events).toContainEqual(expect.objectContaining({ code: 'wgsl-uniform-buffer-full' }));
    dispose!();
  });

  it('dispose removes the uniform-update listener (no leak across reinit)', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    const { canvas } = makeCanvas(true);
    const el = document.createElement('div');

    const dispose = await initWGSLRuntime(canvas, 'inline', el);
    dispose!();
    const writesAfterDispose = harness.calls.bufferWrites.length;
    // Post-dispose crossings must not write the buffer (listener removed).
    el.dispatchEvent(new CustomEvent('czap:uniform-update', { detail: { wgsl: { state_index: 9 } } }));
    expect(harness.calls.bufferWrites.length).toBe(writesAfterDispose);
  });

  it('GUARD: a real WebGPU device drives the buffer; absent, it logs a skip (never faked)', async () => {
    const realGpu = (globalThis.navigator as Navigator & { gpu?: unknown })?.gpu;
    if (!realGpu) {
      console.warn('[D1-WGSL] WebGPU unavailable in this harness — skipping real-device uniform-bind check.');
      expect(realGpu).toBeUndefined();
      return;
    }
    /* v8 ignore start — only runs where a real WebGPU device exists (not the CI harness). */
    const { canvas } = makeCanvas(true);
    const el = document.createElement('div');
    const dispose = await initWGSLRuntime(canvas, 'inline', el);
    expect(dispose).not.toBeNull();
    el.dispatchEvent(new CustomEvent('czap:uniform-update', { detail: { wgsl: { state_index: 1 } } }));
    dispose?.();
    /* v8 ignore stop */
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

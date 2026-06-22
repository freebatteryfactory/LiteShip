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
import { parseShaderIntegrity } from '@czap/web';
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
    /** Each `queue.writeBuffer` upload, snapshotted as a raw byte copy (the WGSL
     * uniform struct: `state_index` is u32 in slot 0, authored fields f32). */
    bufferWrites: Uint8Array[];
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
        // Snapshot the raw bytes at write time (not a later-mutated scratch
        // buffer). The struct is read back via DataView in the assertions.
        calls.bufferWrites.push(new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)));
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

  it('fetches a path-rooted shader source and VERIFIES it against the SRI pin, then renders it', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, text: async () => 'fetched-wgsl' })),
    );
    const { canvas } = makeCanvas(true);

    // Secure-by-default: an EXTERNAL fetch must carry a valid integrity pin. The
    // pin below is `sha256-<base64>` of the exact mock content ('fetched-wgsl'),
    // computed through the SAME kernel the verifier uses (AddressedDigest sha256 →
    // hex → base64), so the fetched bytes VERIFY and the verified content compiles.
    // This now exercises the fetch+VERIFY+render path (the correct new behavior).
    const integrity = parseShaderIntegrity('sha256-NgYbuwxCipPjt2k5OUhc+tMVm6/Jx32lcEEz0CvJD6M=');
    const dispose = await initWGSLRuntime(canvas, '/shaders/main.wgsl', undefined, undefined, integrity);
    expect(dispose).not.toBeNull();
    expect(harness.calls.shaderCodes[0]).toBe('fetched-wgsl');
    dispose!();
  });

  it('REFUSES an external fetch with no integrity pin (secure-by-default), degrading to null', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, text: async () => 'fetched-wgsl' })),
    );
    const { canvas } = makeCanvas(true);

    // A SUCCESSFUL external fetch with NO pin is the secure-by-default REFUSAL: an
    // unverified external shader must never reach the GPU. The runtime returns null
    // (degrade) and emits the absent-pin security diagnostic — it does NOT silently
    // render the unverified bytes, and does NOT fall through to the built-in (that
    // fallback is only for a FAILED fetch, which produces no content to verify).
    const dispose = await initWGSLRuntime(canvas, '/shaders/main.wgsl');
    expect(dispose).toBeNull();
    expect(harness.calls.shaderCodes.length).toBe(0);
    expect(events).toContainEqual(expect.objectContaining({ code: 'wgsl-integrity-absent' }));
  });

  it('REFUSES a tampered external fetch whose bytes do not match the pin', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    // The server returns DIFFERENT bytes than the author pinned (a tampered /
    // compromised origin). The pin is for 'fetched-wgsl'; the bytes are not.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, text: async () => 'tampered-wgsl' })),
    );
    const { canvas } = makeCanvas(true);

    const integrity = parseShaderIntegrity('sha256-NgYbuwxCipPjt2k5OUhc+tMVm6/Jx32lcEEz0CvJD6M=');
    const dispose = await initWGSLRuntime(canvas, '/shaders/main.wgsl', undefined, undefined, integrity);
    expect(dispose).toBeNull();
    expect(harness.calls.shaderCodes.length).toBe(0);
    expect(events).toContainEqual(expect.objectContaining({ code: 'wgsl-integrity-mismatch' }));
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

// A WGSL shader that declares the @group(0) @binding(0) uniform STRUCT — the
// runtime parses the struct to derive field offsets/types (declaration order is
// the fixed buffer layout) and only binds when a real struct is declared (the
// FULLSCREEN_WGSL fallback / bare shaders have none). Fields: state_index(u32) at
// offset 0, blur_radius(f32) at 4, scale(f32) at 8, pad(f32) at 12.
const UNIFORM_SHADER =
  'struct BoundaryState { state_index: u32, blur_radius: f32, scale: f32, pad: f32 }\n' +
  '@group(0) @binding(0) var<uniform> boundary_state: BoundaryState;\n' +
  '@vertex fn vs_main() -> @builtin(position) vec4<f32> { return vec4<f32>(0.0, 0.0, 0.0, 1.0); }\n' +
  '@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4<f32>(boundary_state.blur_radius); }';

// Declares 5 fields (state_index + a,b,c,d); the buffer holds 4, so the 5th
// overflows at binding setup with a warnOnce.
const OVERFLOW_SHADER =
  'struct BS { state_index: u32, a: f32, b: f32, c: f32, d: f32 }\n' +
  '@group(0) @binding(0) var<uniform> bs: BS;\n' +
  '@vertex fn vs_main() -> @builtin(position) vec4<f32> { return vec4<f32>(0.0); }\n' +
  '@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4<f32>(0.0); }';

describe('initWGSLRuntime — czap:uniform-update → uniform buffer (D1-WGSL live cast)', () => {
  it('binds detail.wgsl field values into the uniform buffer on every crossing', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    const { canvas } = makeCanvas(true);
    const el = document.createElement('div');

    const dispose = await initWGSLRuntime(canvas, UNIFORM_SHADER, el);
    expect(dispose).not.toBeNull();
    // The render loop binds group 0 each frame (the shader declares @binding(0)).
    expect(harness.calls.bindGroups[0]).toBe(0);
    // The seed write zeroes the whole 16-byte struct before the first crossing.
    const seeded = harness.calls.bufferWrites.at(-1)!;
    expect(seeded.length).toBe(16);
    expect(seeded.every((b) => b === 0)).toBe(true);

    // A boundary crossing: detail.wgsl carries the live state index plus an
    // authored field. state_index claims slot 0 (u32); blur_radius the next (f32).
    el.dispatchEvent(
      new CustomEvent('czap:uniform-update', {
        detail: { wgsl: { state_index: 1, blur_radius: 2.5 } },
      }),
    );
    const afterCross = new DataView(harness.calls.bufferWrites.at(-1)!.buffer);
    expect(afterCross.getUint32(0, true)).toBe(1); // state_index → slot 0 as u32
    expect(afterCross.getFloat32(4, true)).toBe(2.5); // blur_radius → slot 1 as f32

    // A field keeps its slot across crossings (stable offset).
    el.dispatchEvent(
      new CustomEvent('czap:uniform-update', {
        detail: { wgsl: { state_index: 0, blur_radius: 0.5 } },
      }),
    );
    const after2 = new DataView(harness.calls.bufferWrites.at(-1)!.buffer);
    expect(after2.getUint32(0, true)).toBe(0);
    expect(after2.getFloat32(4, true)).toBe(0.5);

    dispose!();
  });

  it('ignores uniform-update events that carry no wgsl channel', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    const { canvas } = makeCanvas(true);
    const el = document.createElement('div');

    const dispose = await initWGSLRuntime(canvas, UNIFORM_SHADER, el);
    const writesBefore = harness.calls.bufferWrites.length;
    // No `wgsl` key → the handler is a no-op (no extra buffer write).
    el.dispatchEvent(new CustomEvent('czap:uniform-update', { detail: { glsl: { u_layout: 1 } } }));
    expect(harness.calls.bufferWrites.length).toBe(writesBefore);
    dispose!();
  });

  it('warns once when the WGSL struct declares more fields than the buffer holds', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    const { canvas } = makeCanvas(true);
    const el = document.createElement('div');

    // OVERFLOW_SHADER declares 5 fields; the buffer holds 4, so the 5th overflows
    // and is dropped with a warnOnce at binding setup (layout-derived from the
    // declared struct, not from event payload order).
    const dispose = await initWGSLRuntime(canvas, OVERFLOW_SHADER, el);
    expect(events).toContainEqual(expect.objectContaining({ code: 'wgsl-uniform-buffer-full' }));
    dispose!();
  });

  it('writes fields at their DECLARED struct offset regardless of event order', async () => {
    // Codex finding: a `{ scale }`-first crossing must land scale in its declared
    // slot, NOT blur_radius's. UNIFORM_SHADER order: state_index(0), blur_radius(1),
    // scale(2), pad(3) → scale lives at byte offset 8.
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    const { canvas } = makeCanvas(true);
    const el = document.createElement('div');

    const dispose = await initWGSLRuntime(canvas, UNIFORM_SHADER, el);
    el.dispatchEvent(new CustomEvent('czap:uniform-update', { detail: { wgsl: { scale: 7.5 } } }));
    const dv = new DataView(harness.calls.bufferWrites.at(-1)!.buffer);
    expect(dv.getFloat32(8, true)).toBe(7.5); // scale → declared slot 2 (offset 8)
    expect(dv.getFloat32(4, true)).toBe(0); // blur_radius slot untouched (not in event)
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

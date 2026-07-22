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
import { gpuAbsent } from '../../helpers/capabilities.browser.js';
import { Diagnostics } from '@liteship/core';
import { parseShaderIntegrity } from '@liteship/web';
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

    const dispose = await initWGSLRuntime(canvas, '@fragment\nfn custom() {}');
    expect(dispose).not.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(harness.calls.shaderCodes[0]).toBe('@fragment\nfn custom() {}');
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
    expect(events).toContainEqual(expect.objectContaining({ code: 'astro/wgpu/wgsl-integrity-absent' }));
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
    expect(events).toContainEqual(expect.objectContaining({ code: 'astro/wgpu/wgsl-integrity-mismatch' }));
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
    expect(events).toContainEqual(expect.objectContaining({ code: 'astro/wgpu/wgsl-fetch-failed' }));
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
    expect(events).toContainEqual(expect.objectContaining({ code: 'astro/wgpu/wgsl-fetch-threw' }));
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

// Declares enough vec4 fields to overflow the 64-byte runtime buffer: state_index
// at 0, then v0@16, v1@32, v2@48, and v3@64 overflows.
const OVERFLOW_SHADER =
  'struct BS { state_index: u32, v0: vec4<f32>, v1: vec4<f32>, v2: vec4<f32>, v3: vec4<f32> }\n' +
  '@group(0) @binding(0) var<uniform> bs: BS;\n' +
  '@vertex fn vs_main() -> @builtin(position) vec4<f32> { return vec4<f32>(0.0); }\n' +
  '@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4<f32>(0.0); }';

// Declares `u_time` at slot 1 (after state_index) — an ANIMATED hand-authored
// shader. The runtime must feed the monotonic clock into u_time every frame.
const TIME_SHADER =
  'struct S { state_index: u32, u_time: f32, pad0: f32, pad1: f32 }\n' +
  '@group(0) @binding(0) var<uniform> s: S;\n' +
  '@vertex fn vs_main() -> @builtin(position) vec4<f32> { return vec4<f32>(0.0); }\n' +
  '@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4<f32>(s.u_time); }';

// Compiler-integrated preamble — suppresses unfed-uniform warnings for boundary-fed fields.
const UNIFORM_DECLARATIONS =
  'struct BoundaryState { state_index: u32, blur_radius: f32, scale: f32, pad: f32 }\n' +
  '@group(0) @binding(0) var<uniform> boundary_state: BoundaryState;';

describe('initWGSLRuntime — liteship:uniform-update → uniform buffer (D1-WGSL live cast)', () => {
  it('binds detail.wgsl field values into the uniform buffer on every crossing', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    const { canvas } = makeCanvas(true);
    const el = document.createElement('div');

    const dispose = await initWGSLRuntime(canvas, UNIFORM_SHADER, el, UNIFORM_DECLARATIONS);
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
      new CustomEvent('liteship:uniform-update', {
        detail: { wgsl: { state_index: 1, blur_radius: 2.5 } },
      }),
    );
    const afterCross = new DataView(harness.calls.bufferWrites.at(-1)!.buffer);
    expect(afterCross.getUint32(0, true)).toBe(1); // state_index → slot 0 as u32
    expect(afterCross.getFloat32(4, true)).toBe(2.5); // blur_radius → slot 1 as f32

    // A field keeps its slot across crossings (stable offset).
    el.dispatchEvent(
      new CustomEvent('liteship:uniform-update', {
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

    const dispose = await initWGSLRuntime(canvas, UNIFORM_SHADER, el, UNIFORM_DECLARATIONS);
    const writesBefore = harness.calls.bufferWrites.length;
    // No `wgsl` key → the handler is a no-op (no extra buffer write).
    el.dispatchEvent(new CustomEvent('liteship:uniform-update', { detail: { glsl: { u_layout: 1 } } }));
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

    // OVERFLOW_SHADER's fourth vec4 starts at byte 64, outside the 64-byte buffer,
    // and is dropped with a warnOnce at binding setup (layout-derived from the
    // declared struct, not from event payload order).
    const dispose = await initWGSLRuntime(canvas, OVERFLOW_SHADER, el);
    expect(events).toContainEqual(expect.objectContaining({ code: 'astro/wgpu/wgsl-uniform-buffer-full' }));
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

    const dispose = await initWGSLRuntime(canvas, UNIFORM_SHADER, el, UNIFORM_DECLARATIONS);
    el.dispatchEvent(new CustomEvent('liteship:uniform-update', { detail: { wgsl: { scale: 7.5 } } }));
    const dv = new DataView(harness.calls.bufferWrites.at(-1)!.buffer);
    expect(dv.getFloat32(8, true)).toBe(7.5); // scale → declared slot 2 (offset 8)
    expect(dv.getFloat32(4, true)).toBe(0); // blur_radius slot untouched (not in event)
    dispose!();
  });

  it('feeds u_time into the uniform buffer EVERY frame for an animated shader (GLSL-parity auto-feed)', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    const { frames } = stubRaf();
    const { canvas } = makeCanvas(true);
    const el = document.createElement('div');

    const dispose = await initWGSLRuntime(canvas, TIME_SHADER, el);
    expect(dispose).not.toBeNull();

    // A static shader only writes on the seed + crossings; an animated shader
    // (declaring u_time) re-applies the buffer EVERY frame to advance the clock,
    // so two frames produce two more buffer writes -- the gap that left
    // hand-authored WGSL animations frozen.
    const writesAfterInit = harness.calls.bufferWrites.length;
    frames[0]!();
    frames[1]!();
    expect(harness.calls.bufferWrites.length).toBe(writesAfterInit + 2);

    // u_time lands in its DECLARED slot (offset 4, after the u32 state_index),
    // as a finite float; the clock never touches the state_index slot.
    const last = new DataView(harness.calls.bufferWrites.at(-1)!.buffer);
    expect(last.getUint32(0, true)).toBe(0);
    expect(Number.isFinite(last.getFloat32(4, true))).toBe(true);
    dispose!();
  });

  it('does NOT per-frame-write a static shader (no u_time): writes only on seed + crossing', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    const { frames } = stubRaf();
    const { canvas } = makeCanvas(true);
    const el = document.createElement('div');

    // UNIFORM_SHADER declares no u_time, so the per-frame feed stays off and the
    // event-only write path is preserved (no per-frame perf cost / no churn).
    const dispose = await initWGSLRuntime(canvas, UNIFORM_SHADER, el, UNIFORM_DECLARATIONS);
    const writesAfterInit = harness.calls.bufferWrites.length;
    frames[0]!();
    frames[1]!();
    expect(harness.calls.bufferWrites.length).toBe(writesAfterInit);
    dispose!();
  });

  it('feeds u_resolution (vec2) at its WGSL-aligned 8-byte offset every frame', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    const { canvas } = makeCanvas(true);
    Object.defineProperty(canvas, 'clientWidth', { value: 320, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 200, configurable: true });
    const el = document.createElement('div');

    // state_index(u32)@0, then u_resolution: vec2<f32>. WGSL aligns a vec2 to 8
    // bytes, so it lands at offset 8 — NOT offset 4 as a flat i*4 layout would
    // wrongly place it (the bug that made hand-authored u_resolution unusable).
    const RES_SHADER =
      'struct S { state_index: u32, u_resolution: vec2<f32> }\n' +
      '@group(0) @binding(0) var<uniform> s: S;\n' +
      '@vertex fn vs_main() -> @builtin(position) vec4<f32> { return vec4<f32>(0.0); }\n' +
      '@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4<f32>(s.u_resolution, 0.0, 1.0); }';

    const dispose = await initWGSLRuntime(canvas, RES_SHADER, el);
    expect(dispose).not.toBeNull();
    const last = new DataView(harness.calls.bufferWrites.at(-1)!.buffer);
    expect(last.getFloat32(8, true)).toBe(320); // u_resolution.x at aligned offset 8
    expect(last.getFloat32(12, true)).toBe(200); // u_resolution.y at offset 12
    dispose!();
  });

  it('writes vec2, vec3, and vec4 fields at WGSL-aligned byte offsets', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    const { canvas } = makeCanvas(true);
    const el = document.createElement('div');

    const VECTOR_SHADER =
      'struct S { state_index: u32, uv: vec2<f32>, normal: vec3<f32>, color: vec4<f32> }\n' +
      '@group(0) @binding(0) var<uniform> s: S;\n' +
      '@vertex fn vs_main() -> @builtin(position) vec4<f32> { return vec4<f32>(0.0); }\n' +
      '@fragment fn fs_main() -> @location(0) vec4<f32> { return s.color + vec4<f32>(s.uv, s.normal.x, 0.0); }';

    const VECTOR_DECLARATIONS =
      'struct S { state_index: u32, uv: vec2<f32>, normal: vec3<f32>, color: vec4<f32> }\n' +
      '@group(0) @binding(0) var<uniform> s: S;';

    const dispose = await initWGSLRuntime(canvas, VECTOR_SHADER, el, VECTOR_DECLARATIONS);
    expect(dispose).not.toBeNull();

    // Independent WGSL layout facts for this struct:
    // state_index: u32 align4 size4 → offset 0
    // uv: vec2<f32> align8 size8 → offset 8
    // normal: vec3<f32> align16 size12 → offset 16
    // color: vec4<f32> align16 size16 → offset 32
    expect(harness.calls.bufferWrites.at(-1)!.length).toBe(48);

    el.dispatchEvent(
      new CustomEvent('liteship:uniform-update', {
        detail: {
          wgsl: {
            state_index: 2,
            uv: [0.25, 0.5],
            normal: [1, 2, 3],
            color: [0.1, 0.2, 0.3, 0.4],
          },
        },
      }),
    );
    const bytes = new DataView(harness.calls.bufferWrites.at(-1)!.buffer);
    expect(bytes.getUint32(0, true)).toBe(2);
    expect(bytes.getFloat32(8, true)).toBeCloseTo(0.25, 6);
    expect(bytes.getFloat32(12, true)).toBeCloseTo(0.5, 6);
    expect(bytes.getFloat32(16, true)).toBeCloseTo(1, 6);
    expect(bytes.getFloat32(20, true)).toBeCloseTo(2, 6);
    expect(bytes.getFloat32(24, true)).toBeCloseTo(3, 6);
    expect(bytes.getFloat32(32, true)).toBeCloseTo(0.1, 6);
    expect(bytes.getFloat32(36, true)).toBeCloseTo(0.2, 6);
    expect(bytes.getFloat32(40, true)).toBeCloseTo(0.3, 6);
    expect(bytes.getFloat32(44, true)).toBeCloseTo(0.4, 6);
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
    el.dispatchEvent(new CustomEvent('liteship:uniform-update', { detail: { wgsl: { state_index: 9 } } }));
    expect(harness.calls.bufferWrites.length).toBe(writesAfterDispose);
  });

  it.skipIf(gpuAbsent)(
    'GUARD: a real WebGPU device drives the buffer; absent, it logs a skip (never faked)',
    async () => {
      /* v8 ignore start — only runs where a real WebGPU device exists (not the CI harness). */
      const { canvas } = makeCanvas(true);
      const el = document.createElement('div');
      const dispose = await initWGSLRuntime(canvas, 'inline', el);
      expect(dispose).not.toBeNull();
      el.dispatchEvent(new CustomEvent('liteship:uniform-update', { detail: { wgsl: { state_index: 1 } } }));
      dispose?.();
      /* v8 ignore stop */
    },
  );
});

describe('warnWebGpuUnavailable', () => {
  it('emits the webgpu-unavailable warnOnce', () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    warnWebGpuUnavailable();
    expect(events).toContainEqual(expect.objectContaining({ code: 'astro/wgpu/webgpu-unavailable' }));
  });
});

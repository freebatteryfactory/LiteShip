// @vitest-environment jsdom
/**
 * WGSL honesty gates (#106 unfed-uniform diagnostic, #107 integer-vector layout/write).
 *
 * @module
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Diagnostics } from '@liteship/core';
import { initWGSLRuntime } from '../../../packages/astro/src/runtime/wgpu.js';

interface FakeGpuHarness {
  readonly gpu: {
    requestAdapter(): Promise<unknown>;
    getPreferredCanvasFormat(): string;
  };
  readonly calls: {
    bufferWrites: Uint8Array[];
  };
}

function makeGpuHarness(): FakeGpuHarness {
  const calls: FakeGpuHarness['calls'] = { bufferWrites: [] };
  const pass = {
    setPipeline: vi.fn(),
    setBindGroup: vi.fn(),
    draw: vi.fn(),
    end: vi.fn(),
  };
  const encoder = { beginRenderPass: () => pass, finish: () => ({}) };
  const pipeline = { getBindGroupLayout: () => ({}) };
  const device = {
    createShaderModule: () => ({}),
    createRenderPipeline: () => pipeline,
    createCommandEncoder: () => encoder,
    createBuffer: () => ({}),
    createBindGroup: () => ({}),
    queue: {
      submit: vi.fn(),
      writeBuffer: (_buffer: unknown, _offset: number, data: ArrayBufferView) => {
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

function makeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const context = { configure: vi.fn(), getCurrentTexture: () => ({ createView: () => ({}) }) };
  vi.spyOn(canvas, 'getContext').mockReturnValue(context as unknown as RenderingContext);
  return canvas;
}

function stubGpu(gpu: unknown): void {
  vi.stubGlobal('navigator', { gpu });
}

function stubRaf(): { frames: Array<() => void> } {
  const frames: Array<() => void> = [];
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  return { frames };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('WGSL honesty — #106 unfed uniform diagnostic', () => {
  it('warns once when a hand-authored struct declares time (not u_time)', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    stubGpu(makeGpuHarness().gpu);
    stubRaf();

    const MISNAMED_TIME_SHADER =
      'struct S { state_index: u32, time: f32 }\n' +
      '@group(0) @binding(0) var<uniform> s: S;\n' +
      '@vertex fn vs_main() -> @builtin(position) vec4<f32> { return vec4<f32>(0.0); }\n' +
      '@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4<f32>(s.time); }';

    const dispose = await initWGSLRuntime(makeCanvas(), MISNAMED_TIME_SHADER);
    expect(dispose).not.toBeNull();
    expect(events.filter((e) => e.code === 'astro/wgpu/wgsl-uniform-unfed')).toHaveLength(1);
    expect(events).toContainEqual(
      expect.objectContaining({
        code: 'astro/wgpu/wgsl-uniform-unfed',
        message: expect.stringContaining('"time"'),
      }),
    );
    dispose!();
  });

  it('stays silent for standard u_time / u_resolution auto-feed shaders', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    const canvas = makeCanvas();
    Object.defineProperty(canvas, 'clientWidth', { value: 640, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 480, configurable: true });

    const STANDARD_SHADER =
      'struct S { state_index: u32, u_time: f32, u_resolution: vec2<f32> }\n' +
      '@group(0) @binding(0) var<uniform> s: S;\n' +
      '@vertex fn vs_main() -> @builtin(position) vec4<f32> { return vec4<f32>(0.0); }\n' +
      '@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4<f32>(s.u_time, s.u_resolution.x, 0.0, 1.0); }';

    const dispose = await initWGSLRuntime(canvas, STANDARD_SHADER);
    expect(dispose).not.toBeNull();
    expect(events.filter((e) => e.code === 'astro/wgpu/wgsl-uniform-unfed')).toHaveLength(0);
    dispose!();
  });

  it('stops warning after detail.wgsl supplies a previously unfed field', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    stubGpu(makeGpuHarness().gpu);
    stubRaf();
    const canvas = makeCanvas();
    const el = document.createElement('div');

    const CUSTOM_FIELD_SHADER =
      'struct S { state_index: u32, glow: f32 }\n' +
      '@group(0) @binding(0) var<uniform> s: S;\n' +
      '@vertex fn vs_main() -> @builtin(position) vec4<f32> { return vec4<f32>(0.0); }\n' +
      '@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4<f32>(s.glow); }';

    const dispose = await initWGSLRuntime(canvas, CUSTOM_FIELD_SHADER, el);
    expect(events.filter((e) => e.code === 'astro/wgpu/wgsl-uniform-unfed')).toHaveLength(1);

    el.dispatchEvent(new CustomEvent('liteship:uniform-update', { detail: { wgsl: { glow: 0.75 } } }));
    expect(events.filter((e) => e.code === 'astro/wgpu/wgsl-uniform-unfed')).toHaveLength(1);
    dispose!();
  });
});

describe('WGSL honesty — #107 integer vector layout + write', () => {
  it('lays out vec2i at 8-byte alignment and writes non-NaN i32 components', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    const el = document.createElement('div');

    const VEC2I_SHADER =
      'struct S { state_index: u32, offset: vec2i }\n' +
      '@group(0) @binding(0) var<uniform> s: S;\n' +
      '@vertex fn vs_main() -> @builtin(position) vec4<f32> { return vec4<f32>(0.0); }\n' +
      '@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4<f32>(f32(s.offset.x), f32(s.offset.y), 0.0, 1.0); }';

    const declarations = 'struct S { state_index: u32, offset: vec2i }\n@group(0) @binding(0) var<uniform> s: S;';

    const dispose = await initWGSLRuntime(makeCanvas(), VEC2I_SHADER, el, declarations);
    expect(dispose).not.toBeNull();

    el.dispatchEvent(
      new CustomEvent('liteship:uniform-update', {
        detail: { wgsl: { state_index: 1, offset: [-3, 42] } },
      }),
    );
    const dv = new DataView(harness.calls.bufferWrites.at(-1)!.buffer);
    expect(dv.getUint32(0, true)).toBe(1);
    expect(dv.getInt32(8, true)).toBe(-3);
    expect(dv.getInt32(12, true)).toBe(42);
    expect(Number.isNaN(dv.getInt32(8, true))).toBe(false);
    expect(Number.isNaN(dv.getInt32(12, true))).toBe(false);
    dispose!();
  });

  it('warns once for bool uniform struct fields and skips their layout slot', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    const el = document.createElement('div');

    const BOOL_SHADER =
      'struct S { state_index: u32, enabled: bool, strength: f32 }\n' +
      '@group(0) @binding(0) var<uniform> s: S;\n' +
      '@vertex fn vs_main() -> @builtin(position) vec4<f32> { return vec4<f32>(0.0); }\n' +
      '@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4<f32>(s.strength); }';

    const declarations =
      'struct S { state_index: u32, enabled: bool, strength: f32 }\n@group(0) @binding(0) var<uniform> s: S;';

    const dispose = await initWGSLRuntime(makeCanvas(), BOOL_SHADER, el, declarations);
    expect(events).toContainEqual(expect.objectContaining({ code: 'astro/wgpu/wgsl-uniform-bool-unsupported' }));

    el.dispatchEvent(
      new CustomEvent('liteship:uniform-update', {
        detail: { wgsl: { state_index: 0, strength: 1.25 } },
      }),
    );
    const dv = new DataView(harness.calls.bufferWrites.at(-1)!.buffer);
    expect(dv.getFloat32(8, true)).toBeCloseTo(1.25, 6);
    dispose!();
  });

  it('warns once for unrecognized uniform struct types', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    stubGpu(makeGpuHarness().gpu);
    stubRaf();

    const UNKNOWN_SHADER =
      'struct S { state_index: u32, m: mat4x4f }\n' +
      '@group(0) @binding(0) var<uniform> s: S;\n' +
      '@vertex fn vs_main() -> @builtin(position) vec4<f32> { return vec4<f32>(0.0); }\n' +
      '@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4<f32>(0.0); }';

    const dispose = await initWGSLRuntime(makeCanvas(), UNKNOWN_SHADER);
    expect(events).toContainEqual(expect.objectContaining({ code: 'astro/wgpu/wgsl-uniform-type-unrecognized' }));
    dispose!();
  });

  it('lays out vec2u at 8-byte alignment and writes u32 components', async () => {
    const harness = makeGpuHarness();
    stubGpu(harness.gpu);
    stubRaf();
    const el = document.createElement('div');

    const VEC2U_SHADER =
      'struct S { state_index: u32, flags: vec2u }\n' +
      '@group(0) @binding(0) var<uniform> s: S;\n' +
      '@vertex fn vs_main() -> @builtin(position) vec4<f32> { return vec4<f32>(0.0); }\n' +
      '@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4<f32>(f32(s.flags.x), f32(s.flags.y), 0.0, 1.0); }';

    const dispose = await initWGSLRuntime(makeCanvas(), VEC2U_SHADER, el);
    expect(dispose).not.toBeNull();

    el.dispatchEvent(
      new CustomEvent('liteship:uniform-update', {
        detail: { wgsl: { state_index: 1, flags: [3, 7] } },
      }),
    );
    const dv = new DataView(harness.calls.bufferWrites.at(-1)!.buffer);
    expect(dv.getUint32(0, true)).toBe(1);
    expect(dv.getUint32(8, true)).toBe(3);
    expect(dv.getUint32(12, true)).toBe(7);
    dispose!();
  });
});

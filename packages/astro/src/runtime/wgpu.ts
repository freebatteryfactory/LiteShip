/**
 * WebGPU WGSL runtime path for the `client:gpu` directive.
 *
 * @module
 */

import { Diagnostics, CANVAS_FALLBACK_WIDTH, CANVAS_FALLBACK_HEIGHT } from '@czap/core';

const FULLSCREEN_WGSL = `@vertex
fn vs_main(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
  let pos = array<vec2<f32>, 6>(
    vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
    vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0)
  );
  return vec4(pos[i], 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let uv = pos.xy * 0.5 + vec2(0.5, 0.5);
  return vec4(uv.x, uv.y, 0.5, 1.0);
}`;

interface WebGpuNavigator {
  requestAdapter(): Promise<WebGpuAdapter | null>;
  getPreferredCanvasFormat(): string;
}

interface WebGpuAdapter {
  requestDevice(): Promise<WebGpuDevice>;
}

interface WebGpuBuffer {
  readonly size?: number;
}

interface WebGpuBindGroup {
  readonly label?: string;
}

interface WebGpuBindGroupLayout {
  readonly label?: string;
}

interface WebGpuDevice {
  createShaderModule(desc: { code: string }): unknown;
  createRenderPipeline(desc: Record<string, unknown>): WebGpuPipeline;
  createCommandEncoder(): WebGpuEncoder;
  createBuffer(desc: { size: number; usage: number }): WebGpuBuffer;
  createBindGroup(desc: Record<string, unknown>): WebGpuBindGroup;
  readonly queue: {
    submit(commands: unknown[]): void;
    writeBuffer(buffer: WebGpuBuffer, offset: number, data: ArrayBufferView): void;
  };
}

interface WebGpuPipeline {
  readonly label?: string;
  getBindGroupLayout(index: number): WebGpuBindGroupLayout;
}

interface WebGpuEncoder {
  beginRenderPass(desc: Record<string, unknown>): WebGpuPass;
  finish(): unknown;
}

interface WebGpuPass {
  setPipeline(pipeline: WebGpuPipeline): void;
  setBindGroup(index: number, bindGroup: WebGpuBindGroup): void;
  draw(vertexCount: number): void;
  end(): void;
}

/**
 * WebGPU buffer-usage bit flags. The `GPUBufferUsage` enum is not present in
 * non-WebGPU realms (jsdom/node), so we encode the two flags we need locally;
 * the values match the WebGPU spec (`UNIFORM = 0x40`, `COPY_DST = 0x08`).
 */
const GPU_BUFFER_USAGE_UNIFORM = 0x40;
const GPU_BUFFER_USAGE_COPY_DST = 0x08;

interface WebGpuTexture {
  createView(): unknown;
}

interface GPUCanvasContext {
  configure(configuration: { device: WebGpuDevice; format: string; alphaMode: string }): void;
  getCurrentTexture(): WebGpuTexture;
}

async function fetchShaderSource(shaderSrc: string): Promise<string | null> {
  if (shaderSrc.startsWith('/') || shaderSrc.startsWith('http')) {
    try {
      const response = await fetch(shaderSrc);
      if (!response.ok) {
        Diagnostics.warn({
          source: 'czap/astro.gpu',
          code: 'wgsl-fetch-failed',
          message: 'Failed to fetch WGSL shader source.',
          detail: response.statusText,
        });
        return null;
      }
      return await response.text();
    } catch (err) {
      Diagnostics.warn({
        source: 'czap/astro.gpu',
        code: 'wgsl-fetch-threw',
        message: 'Fetching WGSL shader source threw an error.',
        cause: err,
      });
      throw err;
    }
  }
  return shaderSrc;
}

/**
 * Number of `vec4`-aligned slots in the boundary uniform buffer. WGSL `uniform`
 * buffers stride at 16 bytes; one `vec4f` (16 bytes / 4 floats) holds the
 * `state_index` plus up to three authored scalar fields, which covers the
 * single-`@quantize`-block authoring surface. Bumping this widens the buffer.
 */
const UNIFORM_BUFFER_FLOATS = 4;
const UNIFORM_BUFFER_BYTES = UNIFORM_BUFFER_FLOATS * 4;

/**
 * Live binding between the compositor's `detail.wgsl` map (bare snake_case field
 * names → numbers) and a WebGPU uniform buffer. `state_index` always occupies
 * slot 0; authored fields claim later slots in first-seen order so a stable
 * field gets a stable offset across crossings. Returns the bound buffer plus an
 * `apply` that writes a fresh `detail.wgsl` snapshot into it.
 */
export interface WgslUniformBinding {
  readonly buffer: WebGpuBuffer;
  readonly bindGroup: WebGpuBindGroup;
  /** Write a `czap:uniform-update` `detail.wgsl` snapshot into the buffer. */
  apply(wgsl: Record<string, number>): void;
}

function createUniformBinding(device: WebGpuDevice, pipeline: WebGpuPipeline): WgslUniformBinding {
  const buffer = device.createBuffer({
    size: UNIFORM_BUFFER_BYTES,
    usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer } }],
  });

  // `state_index` is the WGSL struct's first field (slot 0); authored fields
  // claim slots 1.. in first-seen order. The CPU-side scratch array mirrors the
  // buffer so each `apply` re-uploads the whole struct (small + cache-friendly).
  const data = new Float32Array(UNIFORM_BUFFER_FLOATS);
  const offsetOf = new Map<string, number>([['state_index', 0]]);
  let nextSlot = 1;

  return {
    buffer,
    bindGroup,
    apply(wgsl: Record<string, number>): void {
      for (const [field, value] of Object.entries(wgsl)) {
        let slot = offsetOf.get(field);
        if (slot === undefined) {
          if (nextSlot >= UNIFORM_BUFFER_FLOATS) {
            // Buffer full — the field cannot bind without widening the struct.
            Diagnostics.warnOnce({
              source: 'czap/astro.gpu',
              code: 'wgsl-uniform-buffer-full',
              message:
                `WGSL uniform buffer holds ${UNIFORM_BUFFER_FLOATS} floats; field "${field}" overflows it. ` +
                `Fix: reduce authored @wgsl fields or widen UNIFORM_BUFFER_FLOATS in wgpu.ts.`,
            });
            continue;
          }
          slot = nextSlot++;
          offsetOf.set(field, slot);
        }
        data[slot] = value;
      }
      device.queue.writeBuffer(buffer, 0, data);
    },
  };
}

/**
 * Initialize a WebGPU render loop for a WGSL shader source.
 *
 * Subscribes `element` (when provided) to `czap:uniform-update`: each event's
 * `detail.wgsl` (bare snake_case field → number, from the compositor's
 * `emit-wgsl` cast) is written into a `@group(0) @binding(0)` uniform buffer the
 * render loop binds every frame, so boundary crossings drive the live shader.
 * `element`-less callers (e.g. the static-render path / tests) still render the
 * default shader with a zeroed uniform buffer.
 *
 * Returns a dispose function, or null when WebGPU is unavailable.
 */
export async function initWGSLRuntime(
  canvas: HTMLCanvasElement,
  shaderSrc: string,
  element?: HTMLElement,
): Promise<(() => void) | null> {
  const nav = navigator as Navigator & { gpu?: WebGpuNavigator };
  if (!nav.gpu) {
    return null;
  }

  const adapter = await nav.gpu.requestAdapter();
  if (!adapter) return null;

  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu') as GPUCanvasContext | null;
  if (!context) return null;

  let wgslSource = FULLSCREEN_WGSL;
  try {
    const fetched = await fetchShaderSource(shaderSrc);
    if (fetched) {
      wgslSource = fetched;
    }
  } catch {
    // fetchShaderSource already logged; keep built-in fallback shader.
  }
  const shaderModule = device.createShaderModule({ code: wgslSource });

  const format = nav.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'premultiplied' });

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: shaderModule, entryPoint: 'vs_main' },
    fragment: { module: shaderModule, entryPoint: 'fs_main', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  });

  const binding = createUniformBinding(device, pipeline);
  // Seed the buffer so the first frame binds a defined (zeroed) struct.
  binding.apply({});

  // Subscribe to boundary crossings: map detail.wgsl → uniform buffer. The rAF
  // loop already redraws every frame, so writing the buffer here is enough — the
  // next frame samples the new values (no manual re-render needed).
  const onUniformUpdate = (event: Event): void => {
    /* v8 ignore next — `czap:uniform-update` is always dispatched via `new CustomEvent(...)`;
       the guard narrows the generic `Event` parameter for TypeScript's typed `.detail` access. */
    if (!(event instanceof CustomEvent)) return;
    const wgsl = event.detail?.wgsl as Record<string, number> | undefined;
    if (wgsl) {
      binding.apply(wgsl);
    }
  };
  element?.addEventListener('czap:uniform-update', onUniformUpdate);

  let frame = 0;
  let running = true;

  const render = (): void => {
    if (!running) return;
    const w = canvas.clientWidth || CANVAS_FALLBACK_WIDTH;
    const h = canvas.clientHeight || CANVAS_FALLBACK_HEIGHT;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const encoder = device.createCommandEncoder();
    const view = context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{ view, clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, binding.bindGroup);
    pass.draw(6);
    pass.end();
    device.queue.submit([encoder.finish()]);
    frame = requestAnimationFrame(render);
  };

  render();
  return () => {
    running = false;
    cancelAnimationFrame(frame);
    element?.removeEventListener('czap:uniform-update', onUniformUpdate);
  };
}

/** Log once when WebGPU is unavailable for a WGSL directive. */
export function warnWebGpuUnavailable(): void {
  Diagnostics.warnOnce({
    source: 'czap/astro.gpu',
    code: 'webgpu-unavailable',
    message: 'WebGPU is unavailable; WGSL directives cannot render in-browser.',
  });
}

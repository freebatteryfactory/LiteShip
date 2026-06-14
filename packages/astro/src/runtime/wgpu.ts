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

/** A parsed WGSL uniform field: its name and declared scalar type, in struct order. */
interface WgslUniformField {
  readonly name: string;
  readonly type: string;
}

/**
 * Parse the uniform struct bound at `@group(0) @binding(0)`, returning its fields
 * in DECLARATION order with their WGSL types. The uniform-buffer layout is fixed
 * by the WGSL declaration — NOT event-arrival order — so the runtime must write
 * each field at its declared slot + type (writing by first-seen event order lands
 * fields in the wrong struct members). An empty result is also the precise "does
 * this shader actually declare a uniform group" test: the FULLSCREEN_WGSL fallback
 * and bare shaders return `[]`, and a loose `@group(0)`/`@binding(0)` substring
 * match (e.g. `@group(0) @binding(1)` + `@group(1) @binding(0)`) won't false-pass.
 */
function parseWgslUniformLayout(source: string): readonly WgslUniformField[] {
  const bind = /@group\s*\(\s*0\s*\)\s*@binding\s*\(\s*0\s*\)\s*var\s*<\s*uniform\s*>\s*\w+\s*:\s*(\w+)/.exec(source);
  const structName = bind?.[1];
  if (!structName) return [];
  const struct = new RegExp(`struct\\s+${structName}\\s*\\{([\\s\\S]*?)\\}`).exec(source);
  const fieldBlock = struct?.[1];
  if (!fieldBlock) return [];
  const fields: WgslUniformField[] = [];
  for (const part of fieldBlock.split(/[,\n]/)) {
    const m = /([A-Za-z_]\w*)\s*:\s*([A-Za-z_][\w<>]*)/.exec(part);
    if (m?.[1] && m[2]) fields.push({ name: m[1], type: m[2] });
  }
  return fields;
}

function createUniformBinding(
  device: WebGpuDevice,
  pipeline: WebGpuPipeline,
  layout: readonly WgslUniformField[],
): WgslUniformBinding {
  const buffer = device.createBuffer({
    size: UNIFORM_BUFFER_BYTES,
    usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer } }],
  });

  // The uniform-buffer layout is FIXED by the WGSL struct declaration: field i
  // sits at byte offset i*4 with its declared type (u32/i32 → integer bytes so it
  // matches the shader's u32 `STATE_*` constants; else f32). Deriving offsets from
  // the compiled layout — not event-arrival order — is what keeps a `{ scale }`-
  // first crossing from writing `scale` into `blur_radius`'s slot.
  const data = new ArrayBuffer(UNIFORM_BUFFER_BYTES);
  const bytes = new Uint8Array(data);
  const view = new DataView(data);
  const slots = new Map<string, { offset: number; isInt: boolean }>();
  layout.forEach((field, i) => {
    if (i >= UNIFORM_BUFFER_FLOATS) {
      // Struct declares more fields than the buffer holds — drop the overflow.
      Diagnostics.warnOnce({
        source: 'czap/astro.gpu',
        code: 'wgsl-uniform-buffer-full',
        message:
          `WGSL uniform buffer holds ${UNIFORM_BUFFER_FLOATS} fields; field "${field.name}" overflows it. ` +
          `Fix: reduce @wgsl fields or widen UNIFORM_BUFFER_FLOATS in wgpu.ts.`,
      });
      return;
    }
    slots.set(field.name, { offset: i * 4, isInt: field.type === 'u32' || field.type === 'i32' });
  });

  return {
    buffer,
    bindGroup,
    apply(wgsl: Record<string, number>): void {
      // Fresh snapshot: zero the struct first so a field dropped by a later state
      // reverts to 0 instead of leaving the shader sampling a stale value.
      bytes.fill(0);
      for (const [field, value] of Object.entries(wgsl)) {
        const slot = slots.get(field);
        if (!slot) continue; // not a declared struct field — ignore
        if (slot.isInt) view.setUint32(slot.offset, value >>> 0, true);
        else view.setFloat32(slot.offset, value, true);
      }
      device.queue.writeBuffer(buffer, 0, bytes);
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
  // Bind a uniform group only when the shader declares a real `@group(0)
  // @binding(0) var<uniform>` struct (the FULLSCREEN_WGSL fallback and bare
  // shaders don't — unconditionally binding makes WebGPU reject the pass). The
  // parsed layout drives BOTH the binding decision and the field offsets/types.
  const uniformLayout = parseWgslUniformLayout(wgslSource);
  const hasUniformBinding = uniformLayout.length > 0;
  const shaderModule = device.createShaderModule({ code: wgslSource });

  const format = nav.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'premultiplied' });

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: shaderModule, entryPoint: 'vs_main' },
    fragment: { module: shaderModule, entryPoint: 'fs_main', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  });

  // Build the uniform binding, guarded: a shader can declare a `@binding(0)` that
  // isn't a buffer-compatible uniform, which throws at bind-group creation —
  // degrade to rendering without live uniforms instead of crashing.
  let binding: WgslUniformBinding | null = null;
  if (hasUniformBinding) {
    try {
      binding = createUniformBinding(device, pipeline, uniformLayout);
      // Seed the buffer so the first frame binds a defined (zeroed) struct.
      binding.apply({});
    } catch (cause) {
      binding = null;
      Diagnostics.warnOnce({
        source: 'czap/astro.gpu',
        code: 'wgsl-uniform-bindgroup-invalid',
        message:
          `WGSL @group(0) @binding(0) is not a buffer-compatible uniform; rendering without live uniforms. ` +
          String((cause as { message?: string })?.message ?? cause),
      });
    }
  }

  // Subscribe to boundary crossings: map detail.wgsl → uniform buffer. The rAF
  // loop already redraws every frame, so writing the buffer here is enough — the
  // next frame samples the new values (no manual re-render needed).
  const onUniformUpdate = (event: Event): void => {
    /* v8 ignore next — `czap:uniform-update` is always dispatched via `new CustomEvent(...)`;
       the guard narrows the generic `Event` parameter for TypeScript's typed `.detail` access. */
    if (!(event instanceof CustomEvent)) return;
    const wgsl = event.detail?.wgsl as Record<string, number> | undefined;
    if (wgsl) {
      binding?.apply(wgsl);
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
    if (binding) pass.setBindGroup(0, binding.bindGroup);
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

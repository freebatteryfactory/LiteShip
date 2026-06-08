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

interface WebGpuDevice {
  createShaderModule(desc: { code: string }): unknown;
  createRenderPipeline(desc: Record<string, unknown>): WebGpuPipeline;
  createCommandEncoder(): WebGpuEncoder;
  readonly queue: { submit(commands: unknown[]): void };
}

interface WebGpuPipeline {
  readonly label?: string;
}

interface WebGpuEncoder {
  beginRenderPass(desc: Record<string, unknown>): WebGpuPass;
  finish(): unknown;
}

interface WebGpuPass {
  setPipeline(pipeline: WebGpuPipeline): void;
  draw(vertexCount: number): void;
  end(): void;
}

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
 * Initialize a WebGPU render loop for a WGSL shader source.
 * Returns a dispose function, or null when WebGPU is unavailable.
 */
export async function initWGSLRuntime(canvas: HTMLCanvasElement, shaderSrc: string): Promise<(() => void) | null> {
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
    pass.draw(6);
    pass.end();
    device.queue.submit([encoder.finish()]);
    frame = requestAnimationFrame(render);
  };

  render();
  return () => {
    running = false;
    cancelAnimationFrame(frame);
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

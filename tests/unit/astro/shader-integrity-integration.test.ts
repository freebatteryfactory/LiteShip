// @vitest-environment jsdom
/**
 * Shader CONTENT-integrity INTEGRATION — the verifier is REALLY on the data path
 * between the shader `fetch` and the GPU compile sink (`gl.shaderSource` /
 * `device.createShaderModule`), and a tampered shader is REALLY refused.
 *
 * This is the defense-in-depth cure proven end-to-end at the runtime, not just at
 * the verifier unit. THE LAWS:
 *   • a fetched GLSL shader whose bytes MATCH the author-pinned `data-czap-shader-
 *     integrity` hash COMPILES — `gl.shaderSource` receives the verified source;
 *   • a fetched GLSL shader whose bytes do NOT match the pin is REFUSED — a
 *     `shader-integrity-mismatch` security diagnostic fires and `gl.shaderSource`
 *     is NEVER called with the fetched body (the tampered shader never reaches GL);
 *   • an EXTERNAL fetch with NO pin is REFUSED (secure-by-default) — a
 *     `shader-integrity-absent` diagnostic fires, no compile;
 *   • the WGSL path mirrors it: a tampered fetched WGSL shader is REFUSED before
 *     `device.createShaderModule`.
 *
 * The pin is COMPUTED in-test from the canonical `AddressedDigest` (the same kernel
 * the runtime verifies with) so the fixture and the verifier agree on one sha256 —
 * never a hardcoded mirror.
 *
 * @module
 */
// PROVES: INV-SHADER-CONTENT-INTEGRITY
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AddressedDigest, Diagnostics } from '@czap/core';
import { initGPUDirective } from '../../../packages/astro/src/runtime/gpu.js';
import { initWGSLRuntime } from '../../../packages/astro/src/runtime/wgpu.js';
import { createStubRegistry } from '../../helpers/define-property-stub.js';

const FETCHED_GLSL = `#version 300 es
precision mediump float;
in vec2 v_uv;
out vec4 fragColor;
void main() { fragColor = vec4(v_uv, 0.5, 1.0); }`;

const FETCHED_WGSL = `@fragment
fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  return vec4(1.0, 0.0, 0.0, 1.0);
}`;

/** The author SRI for `content`, computed from the canonical sha256 kernel. */
function sriOf(content: string): string {
  const hex = AddressedDigest.of(new TextEncoder().encode(content), 'sha256').integrity_digest.slice('sha256:'.length);
  const raw = new Uint8Array(hex.length / 2);
  for (let i = 0; i < raw.length; i++) raw[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  let binary = '';
  for (const b of raw) binary += String.fromCharCode(b);
  return `sha256-${btoa(binary)}`;
}

/**
 * Drain the async `initShader` fetch → text → verify → compile chain. A real
 * macrotask (`setTimeout(0)`) lets the whole `fetch().then(...).text()` Promise
 * graph settle (several microtask turns), then a few microtask flushes catch any
 * trailing continuation — robust to the exact turn count rather than a magic loop.
 */
async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  for (let i = 0; i < 4; i++) await Promise.resolve();
}

/** A minimal WebGL2 stub that records every `shaderSource(_, src)` it receives. */
function makeGlStub(shaderSources: string[]) {
  return {
    COMPILE_STATUS: 1,
    LINK_STATUS: 2,
    ACTIVE_UNIFORMS: 3,
    TRIANGLES: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    VERTEX_SHADER: 8,
    FRAGMENT_SHADER: 9,
    INT: 0x1404,
    BOOL: 0x8b56,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn((_: unknown, src: string) => {
      shaderSources.push(src);
    }),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
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
    getProgramParameter: vi.fn((_: unknown, key: number) => (key === 3 ? 0 : true)),
    getActiveUniform: vi.fn(() => null),
    getUniformLocation: vi.fn((_: unknown, name: string) => name),
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniform2f: vi.fn(),
    viewport: vi.fn(),
    drawArrays: vi.fn(),
  };
}

describe('GLSL shader content integrity — verify-before-compile, refuse-on-mismatch', () => {
  const stubs = createStubRegistry();

  beforeEach(() => {
    Diagnostics.reset();
    document.body.innerHTML = '';
    document.documentElement.setAttribute('data-czap-tier', 'reactive');
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 11) as never);
    vi.stubGlobal('cancelAnimationFrame', vi.fn() as never);
  });

  afterEach(() => {
    stubs.restoreAll();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Diagnostics.reset();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-czap-tier');
  });

  function mountCanvas(gl: ReturnType<typeof makeGlStub>): HTMLCanvasElement {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (gl as never) : null,
    );
    const canvas = document.createElement('canvas');
    canvas.setAttribute('data-czap-shader-type', 'glsl');
    document.body.appendChild(canvas);
    stubs.define(canvas, 'clientWidth', { configurable: true, value: 300 });
    stubs.define(canvas, 'clientHeight', { configurable: true, value: 150 });
    return canvas;
  }

  test('a fetched shader whose bytes MATCH the pin COMPILES (gl.shaderSource sees the verified source)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(FETCHED_GLSL, { status: 200 })),
    );
    const shaderSources: string[] = [];
    const gl = makeGlStub(shaderSources);
    const canvas = mountCanvas(gl);
    canvas.setAttribute('data-czap-shader-src', '/shaders/wave.glsl');
    canvas.setAttribute('data-czap-shader-integrity', sriOf(FETCHED_GLSL));

    initGPUDirective(async () => {}, canvas, { force: true });
    await flush();

    // The verified fetched body reached gl.shaderSource — the verifier passed it
    // through to the sink (the fragment carrying the fetched body compiled).
    const fragSource = shaderSources.find((s) => s.includes('fragColor'));
    expect(fragSource).toBeDefined();
    expect(fragSource).toContain('vec4(v_uv, 0.5, 1.0)');
  });

  test('a TAMPERED fetched shader is REFUSED — security diagnostic fires, gl.shaderSource never sees the body', async () => {
    // The server returns a DIFFERENT body than the author pinned — the
    // compromised-origin / MITM substitution. The fetched body must never compile.
    const tamperedBody = FETCHED_GLSL.replace('0.5, 1.0', '0.0, 1.0');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(tamperedBody, { status: 200 })),
    );
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    const shaderSources: string[] = [];
    const gl = makeGlStub(shaderSources);
    const canvas = mountCanvas(gl);
    canvas.setAttribute('data-czap-shader-src', '/shaders/wave.glsl');
    // Pin the ORIGINAL — the fetched tampered body will not match.
    canvas.setAttribute('data-czap-shader-integrity', sriOf(FETCHED_GLSL));

    initGPUDirective(async () => {}, canvas, { force: true });
    await flush();

    // REFUSED: a security diagnostic fired and the tampered body NEVER reached GL.
    const mismatch = events.find((e) => e.code === 'shader-integrity-mismatch');
    expect(mismatch).toBeDefined();
    expect(mismatch!.level).toBe('error');
    expect(shaderSources.some((s) => s.includes('vec4(v_uv, 0.0, 1.0)'))).toBe(false);
  });

  test('a PATH-RELATIVE shader URL is FETCHED + verified, NOT literal-compiled (P2a regression)', async () => {
    // SECURITY REGRESSION (P2a): a path-relative `data-czap-shader-src`
    // (`shaders/wave.glsl`) is a FETCHABLE same-origin URL. Before the fix the
    // integrity classifier returned false for it, so gpu.ts compiled the URL TOKEN
    // as inline shader SOURCE TEXT — never fetched, never verified. Now it is
    // classified EXTERNAL: fetched, integrity-verified, and the URL token must NEVER
    // reach gl.shaderSource as literal source.
    const fetchSpy = vi.fn(async () => new Response(FETCHED_GLSL, { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    const shaderSources: string[] = [];
    const gl = makeGlStub(shaderSources);
    const canvas = mountCanvas(gl);
    canvas.setAttribute('data-czap-shader-src', 'shaders/wave.glsl');
    canvas.setAttribute('data-czap-shader-integrity', sriOf(FETCHED_GLSL));

    initGPUDirective(async () => {}, canvas, { force: true });
    await flush();

    // The path-relative URL was actually FETCHED (not treated as inline source).
    expect(fetchSpy).toHaveBeenCalledWith('shaders/wave.glsl');
    // The verified fetched body reached gl.shaderSource — the URL token itself never did.
    const fragSource = shaderSources.find((s) => s.includes('fragColor'));
    expect(fragSource).toBeDefined();
    expect(fragSource).toContain('vec4(v_uv, 0.5, 1.0)');
    expect(shaderSources.some((s) => s.includes('shaders/wave.glsl'))).toBe(false);
  });

  test('a PATH-RELATIVE shader URL with NO pin is REFUSED (secure-by-default, P2a regression)', async () => {
    // The path-relative URL is external, so a missing pin must REFUSE — proving the
    // hole is closed: a path-relative URL can no longer slip past the SRI gate as
    // "inline" unverified source.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(FETCHED_GLSL, { status: 200 })),
    );
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const shaderSources: string[] = [];
    const gl = makeGlStub(shaderSources);
    const canvas = mountCanvas(gl);
    canvas.setAttribute('data-czap-shader-src', 'shaders/wave.glsl');
    // No data-czap-shader-integrity attribute.

    initGPUDirective(async () => {}, canvas, { force: true });
    await flush();

    const absent = events.find((e) => e.code === 'shader-integrity-absent');
    expect(absent).toBeDefined();
    expect(absent!.level).toBe('error');
    // The unverified path-relative shader never reached GL as source, literal or fetched.
    expect(shaderSources.some((s) => s.includes('shaders/wave.glsl'))).toBe(false);
    expect(shaderSources.some((s) => s.includes('fragColor') && s.includes('v_uv'))).toBe(false);
  });

  test('an EXTERNAL fetch with NO pin is REFUSED (secure-by-default)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(FETCHED_GLSL, { status: 200 })),
    );
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    const shaderSources: string[] = [];
    const gl = makeGlStub(shaderSources);
    const canvas = mountCanvas(gl);
    canvas.setAttribute('data-czap-shader-src', '/shaders/wave.glsl');
    // No data-czap-shader-integrity attribute.

    initGPUDirective(async () => {}, canvas, { force: true });
    await flush();

    const absent = events.find((e) => e.code === 'shader-integrity-absent');
    expect(absent).toBeDefined();
    expect(absent!.level).toBe('error');
    // The unverified external shader never reached GL.
    expect(shaderSources.some((s) => s.includes('fragColor') && s.includes('v_uv'))).toBe(false);
  });
});

describe('WGSL shader content integrity — refuse-on-mismatch before createShaderModule', () => {
  beforeEach(() => {
    Diagnostics.reset();
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 11) as never);
    vi.stubGlobal('cancelAnimationFrame', vi.fn() as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Diagnostics.reset();
  });

  /** A WebGPU device stub recording every `createShaderModule({ code })` code. */
  function makeWebGpuEnv(moduleCodes: string[]) {
    const device = {
      createShaderModule: vi.fn((desc: { code: string }) => {
        moduleCodes.push(desc.code);
        return {};
      }),
      createRenderPipeline: vi.fn(() => ({ getBindGroupLayout: vi.fn(() => ({})) })),
      createCommandEncoder: vi.fn(() => ({
        beginRenderPass: vi.fn(() => ({
          setPipeline: vi.fn(),
          setBindGroup: vi.fn(),
          draw: vi.fn(),
          end: vi.fn(),
        })),
        finish: vi.fn(() => ({})),
      })),
      createBuffer: vi.fn(() => ({})),
      createBindGroup: vi.fn(() => ({})),
      queue: { submit: vi.fn(), writeBuffer: vi.fn() },
    };
    const gpu = {
      requestAdapter: vi.fn(async () => ({ requestDevice: vi.fn(async () => device) })),
      getPreferredCanvasFormat: vi.fn(() => 'bgra8unorm'),
    };
    const context = {
      configure: vi.fn(),
      getCurrentTexture: vi.fn(() => ({ createView: vi.fn(() => ({})) })),
    };
    return { device, gpu, context, moduleCodes };
  }

  test('a TAMPERED fetched WGSL shader is REFUSED — no createShaderModule, security diagnostic fires', async () => {
    const tamperedBody = FETCHED_WGSL.replace('1.0, 0.0, 0.0', '0.0, 1.0, 0.0');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(tamperedBody, { status: 200 })),
    );
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    const moduleCodes: string[] = [];
    const env = makeWebGpuEnv(moduleCodes);
    vi.stubGlobal('navigator', { gpu: env.gpu } as never);
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgpu' ? (env.context as never) : null,
    );

    // Pin the ORIGINAL; the fetched tampered body will not match.
    const { parseShaderIntegrity } = await import('../../../packages/web/src/security/shader-integrity.js');
    const pinned = parseShaderIntegrity(sriOf(FETCHED_WGSL));

    const dispose = await initWGSLRuntime(canvas, 'https://cdn.example/wave.wgsl', undefined, undefined, pinned);

    // REFUSED: no shader module was ever created from the tampered body.
    expect(env.device.createShaderModule).not.toHaveBeenCalled();
    expect(moduleCodes).toHaveLength(0);
    expect(dispose).toBeNull();
    const mismatch = events.find((e) => e.code === 'wgsl-integrity-mismatch');
    expect(mismatch).toBeDefined();
    expect(mismatch!.level).toBe('error');
  });

  test('a PATH-RELATIVE WGSL shader URL is FETCHED + verified, NOT literal-compiled (P2a regression)', async () => {
    // The WGSL twin of the GLSL P2a regression: a path-relative `shaders/wave.wgsl`
    // is a fetchable URL — it MUST be fetched + verified, never passed to
    // `createShaderModule` as literal source. With a matching pin it compiles the
    // FETCHED body; the URL token never appears in the compiled code.
    const fetchSpy = vi.fn(async () => new Response(FETCHED_WGSL, { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    const moduleCodes: string[] = [];
    const env = makeWebGpuEnv(moduleCodes);
    vi.stubGlobal('navigator', { gpu: env.gpu } as never);
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgpu' ? (env.context as never) : null,
    );

    const { parseShaderIntegrity } = await import('../../../packages/web/src/security/shader-integrity.js');
    const pinned = parseShaderIntegrity(sriOf(FETCHED_WGSL));

    const dispose = await initWGSLRuntime(canvas, 'shaders/wave.wgsl', undefined, undefined, pinned);

    // Fetched (not inline) + the verified fetched body compiled; the URL token never did.
    expect(fetchSpy).toHaveBeenCalledWith('shaders/wave.wgsl');
    expect(moduleCodes.some((c) => c.includes('vec4(1.0, 0.0, 0.0, 1.0)'))).toBe(true);
    expect(moduleCodes.some((c) => c.includes('shaders/wave.wgsl'))).toBe(false);
    expect(dispose).not.toBeNull();
    dispose?.();
  });

  test('a PATH-RELATIVE WGSL shader URL with NO pin is REFUSED (secure-by-default, P2a regression)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(FETCHED_WGSL, { status: 200 })),
    );
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const moduleCodes: string[] = [];
    const env = makeWebGpuEnv(moduleCodes);
    vi.stubGlobal('navigator', { gpu: env.gpu } as never);
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgpu' ? (env.context as never) : null,
    );

    // No integrity pin passed — a path-relative external WGSL fetch must REFUSE.
    const dispose = await initWGSLRuntime(canvas, 'shaders/wave.wgsl', undefined, undefined, null);

    expect(env.device.createShaderModule).not.toHaveBeenCalled();
    expect(moduleCodes).toHaveLength(0);
    expect(dispose).toBeNull();
    const absent = events.find((e) => e.code === 'wgsl-integrity-absent');
    expect(absent).toBeDefined();
    expect(absent!.level).toBe('error');
  });

  test('a VERIFIED fetched WGSL shader compiles — createShaderModule receives the verified code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(FETCHED_WGSL, { status: 200 })),
    );
    const moduleCodes: string[] = [];
    const env = makeWebGpuEnv(moduleCodes);
    vi.stubGlobal('navigator', { gpu: env.gpu } as never);
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgpu' ? (env.context as never) : null,
    );

    const { parseShaderIntegrity } = await import('../../../packages/web/src/security/shader-integrity.js');
    const pinned = parseShaderIntegrity(sriOf(FETCHED_WGSL));

    const dispose = await initWGSLRuntime(canvas, 'https://cdn.example/wave.wgsl', undefined, undefined, pinned);

    expect(env.device.createShaderModule).toHaveBeenCalled();
    expect(moduleCodes.some((c) => c.includes('vec4(1.0, 0.0, 0.0, 1.0)'))).toBe(true);
    expect(dispose).not.toBeNull();
    dispose?.();
  });
});

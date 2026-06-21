// @vitest-environment jsdom

/**
 * GPU reinit-race guard (F-3).
 *
 * `initShader()` is async (it `fetch`es the shader source). The reinit teardown
 * used to be registered at the END of initShader, AFTER the await — so a
 * `czap:reinit` landing DURING the fetch found no listener and ORPHANED the GL
 * program + render loop created right after. The fix arms a mutable Disposer cell
 * SYNCHRONOUSLY before the first await; a reinit mid-fetch flips a flag so the
 * resolved shader tears ITSELF down. These tests pin that the program is deleted
 * and never starts rendering when reinit beats the fetch.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import gpuDirective from '../../../packages/astro/src/client-directives/gpu.js';
import { configureRuntimePolicy, _resetRuntimePolicyForTests } from '../../../packages/astro/src/runtime/policy.js';

function makeGlMock() {
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
    INT: 10,
    BOOL: 11,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn((_: unknown, key: number) => (key === 3 ? 0 : true)),
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
    uniform1i: vi.fn(),
    uniform2f: vi.fn(),
    viewport: vi.fn(),
    drawArrays: vi.fn(),
  };
}

describe('gpu reinit-race (F-3)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.setAttribute('data-czap-tier', 'gpu');
    _resetRuntimePolicyForTests();
    configureRuntimePolicy();
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    _resetRuntimePolicyForTests();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  test('a czap:reinit during the shader fetch tears down the program that resolves after it', async () => {
    const gl = makeGlMock();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (gl as never) : null,
    );

    // A fetch we resolve MANUALLY, so we can fire czap:reinit while it's pending.
    // A plain response stub (not a real `Response`) keeps `.text()` on the
    // microtask queue so the deterministic await-drain below settles it.
    let resolveFetch: (value: { ok: boolean; status: number; statusText: string; text: () => Promise<string> }) => void =
      () => {};
    const fetchPending = new Promise<{
      ok: boolean;
      status: number;
      statusText: string;
      text: () => Promise<string>;
    }>((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal('fetch', vi.fn(() => fetchPending));

    const canvas = document.createElement('canvas');
    canvas.setAttribute('data-czap-shader-src', '/shader.frag');
    document.body.appendChild(canvas);

    const gpuReady = vi.fn();
    canvas.addEventListener('czap:gpu-ready', gpuReady);

    gpuDirective(async () => {}, {}, canvas);

    // The fetch is in flight; no program compiled yet.
    expect(gl.createProgram).not.toHaveBeenCalled();

    // Reinit lands DURING the fetch (a fast VT swap) — before initShader resolves.
    canvas.dispatchEvent(new CustomEvent('czap:reinit'));

    // Now the fetch resolves: the program compiles but must tear ITSELF down.
    resolveFetch({ ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve('void main(){}') });
    for (let i = 0; i < 6; i++) await Promise.resolve();

    // The orphaned program is deleted; the shader never went live (no gpu-ready,
    // no render loop started).
    expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
    expect(gpuReady).not.toHaveBeenCalled();
    expect(gl.drawArrays).not.toHaveBeenCalled();
  });

  test('without a racing reinit the shader boots normally and tears down on a later reinit', async () => {
    const gl = makeGlMock();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (gl as never) : null,
    );

    const canvas = document.createElement('canvas');
    // Inline default shader (no fetch) — initShader completes synchronously.
    document.body.appendChild(canvas);

    const gpuReady = vi.fn();
    canvas.addEventListener('czap:gpu-ready', gpuReady);

    gpuDirective(async () => {}, {}, canvas);
    await Promise.resolve();

    // Booted: gpu-ready fired, render loop started, program NOT deleted yet.
    expect(gpuReady).toHaveBeenCalledTimes(1);
    expect(gl.drawArrays).toHaveBeenCalled();
    expect(gl.deleteProgram).not.toHaveBeenCalled();

    // A later reinit tears it down through the armed cell.
    canvas.dispatchEvent(new CustomEvent('czap:reinit'));
    expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
  });
});

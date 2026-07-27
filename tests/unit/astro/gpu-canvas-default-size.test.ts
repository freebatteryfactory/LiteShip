// @vitest-environment jsdom

/**
 * client:gpu unsized-canvas warn (B-gpu).
 *
 * A `client:gpu` host with no layout at boot (clientWidth/clientHeight = 0) sizes
 * its canvas to the HTML default (CANVAS_FALLBACK_WIDTH x CANVAS_FALLBACK_HEIGHT)
 * and renders the shader into a tiny offscreen buffer — with no console error.
 * This pins that the directive now warns once (`canvas-default-size`) on the
 * unsized path and stays quiet when the host has real layout, for BOTH the
 * wrapper-element path and a directly-passed `<canvas>`. `expected` for the
 * backing-store size is imported from `@liteship/core`, never a literal 300/150.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import gpuDirective from '../../../packages/astro/src/client-directives/gpu.js';
import { configureRuntimePolicy, _resetRuntimePolicyForTests } from '../../../packages/astro/src/runtime/policy.js';
import { Diagnostics, CANVAS_FALLBACK_WIDTH, CANVAS_FALLBACK_HEIGHT } from '../../../packages/core/src/index.js';

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

function sizeEl(el: HTMLElement, w: number, h: number): void {
  Object.defineProperty(el, 'clientWidth', { value: w, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: h, configurable: true });
}

describe('client:gpu unsized-canvas warn (B-gpu)', () => {
  let events: ReturnType<typeof Diagnostics.createBufferSink>['events'];

  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.setAttribute('data-liteship-tier', 'gpu');
    _resetRuntimePolicyForTests();
    configureRuntimePolicy();
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const gl = makeGlMock();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (gl as never) : null,
    );
    const buf = Diagnostics.createBufferSink();
    events = buf.events;
    Diagnostics.setSink(buf.sink);
    Diagnostics.clearOnce();
  });

  afterEach(() => {
    Diagnostics.resetSink();
    Diagnostics.clearOnce();
    _resetRuntimePolicyForTests();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  const sizeWarns = (): { detail?: Record<string, unknown> }[] =>
    events.filter((e) => e.code === 'astro/gpu/canvas-default-size') as { detail?: Record<string, unknown> }[];

  // The warn reads the HOST's clientWidth at boot — the stable signal. (We don't
  // assert the canvas backing store: the GLSL render loop overwrites canvas.width
  // from the created canvas's clientWidth, which is 0 under jsdom's no-layout.)
  test('warns once and reports the fallback size when a wrapper host has no layout', () => {
    const host = document.createElement('div'); // jsdom: clientWidth/Height = 0
    document.body.appendChild(host);
    gpuDirective(async () => {}, {}, host);

    const warns = sizeWarns();
    expect(warns).toHaveLength(1);
    expect(host.querySelector('canvas')).not.toBeNull();
    // `expected` for the fallback dims comes from @liteship/core, never a literal.
    expect(warns[0].detail).toMatchObject({
      clientWidth: 0,
      clientHeight: 0,
      fallbackWidth: CANVAS_FALLBACK_WIDTH,
      fallbackHeight: CANVAS_FALLBACK_HEIGHT,
    });
  });

  test('stays quiet when the wrapper host has real layout', () => {
    const host = document.createElement('div');
    sizeEl(host, 640, 480);
    document.body.appendChild(host);
    gpuDirective(async () => {}, {}, host);

    expect(sizeWarns()).toHaveLength(0);
    expect(host.querySelector('canvas')).not.toBeNull();
  });

  test('warns once for a directly-passed <canvas> with no layout (coverage gap)', () => {
    const canvas = document.createElement('canvas'); // clientWidth 0 in jsdom
    document.body.appendChild(canvas);
    gpuDirective(async () => {}, {}, canvas);

    expect(sizeWarns()).toHaveLength(1);
  });

  test('warns on the WGSL branch too (shared helper, before the async runtime)', () => {
    const host = document.createElement('div');
    host.setAttribute('data-liteship-shader-type', 'wgsl');
    document.body.appendChild(host);
    gpuDirective(async () => {}, {}, host);

    expect(sizeWarns()).toHaveLength(1);
  });
});

// @vitest-environment jsdom
/**
 * Cast-arm delivery (Workstream D, the drift∩vision twofer): the compiler's
 * emitted shader `declarations` reach `gl.shaderSource` / `createShaderModule`
 * at runtime, instead of dying on `CompiledOutputs` while the author hand-types
 * a fragment whose `u_*` names must HAPPEN to match.
 *
 * THE LAW under test: the shader's uniform vocabulary is computed from its
 * source of truth — the compiler's emitted `declarations` — never re-typed by
 * hand beside it. The drift guard pins the two now-redundant views (the names
 * the compiler emits vs the names the runtime binds) as one source: both derive
 * from the canonical `glslIdent` in `@liteship/core`.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { glslIdent, defineBoundary } from '@liteship/core';
import { GLSLCompiler, WGSLCompiler } from '@liteship/compiler';
import { satelliteAttrs } from '@liteship/astro';
import {
  initGPUDirective,
  prependGlslDeclarations,
} from '../../../packages/astro/src/runtime/gpu.js';
import { prependWgslDeclarations } from '../../../packages/astro/src/runtime/wgpu.js';
import { createStubRegistry } from '../../helpers/define-property-stub.js';

const boundary = defineBoundary({
  input: 'viewport.width',
  at: [
    [0, 'collapsed'],
    [768, 'expanded'],
  ],
});

// Authored per-state `@glsl { … }` value maps (camel/kebab keys, exactly as a
// `@glsl` block authors them) — the GLSLCompiler is the SOLE producer of both
// the declarations and the per-state uniform values from these.
// Non-integer values so the compiler infers `float` for both uniforms (any
// non-integer across states promotes the type), keeping both on the runtime's
// `uniform1f` scalar path — the type is the COMPILER's call, asserted as such.
const authoredStates = {
  collapsed: { blurRadius: 4.5, brightness: 1 },
  expanded: { blurRadius: 0.5, brightness: 1.5 },
} as const;

/** Parse the `uniform <type> <name>;` identifiers out of a GLSL preamble. */
function glslUniformNames(declarations: string): Set<string> {
  return new Set([...declarations.matchAll(/\buniform\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1]!));
}

// ---------------------------------------------------------------------------
// DRIFT GUARD — the emitted vocabulary === the bound vocabulary, both from glslIdent
// ---------------------------------------------------------------------------

describe('drift guard: emitted declarations vocabulary === runtime binding vocabulary', () => {
  test('every GLSL uniform the compiler emits is a glslIdent of an authored key (+ u_state)', () => {
    const compiled = GLSLCompiler.compile(boundary, authoredStates);

    // SOURCE OF TRUTH: the uniform names are glslIdent(authored key), plus the
    // implicit u_state index. Computed here from the SAME canonical fn the
    // runtime binds with (gpu.ts uses glslIdent for the `--liteship-*` path and the
    // compiler's own `detail.glsl` keys for authored uniforms) — never hardcoded.
    const expected = new Set<string>(['u_state']);
    for (const state of Object.values(authoredStates)) {
      for (const key of Object.keys(state)) expected.add(glslIdent(key));
    }

    // The names the runtime BINDS for authored uniforms: the keys of the
    // compiler's per-state maps (what `applyBoundaryState` folds into
    // `detail.glsl`, which gpu.ts:~372 sets by name). `u_state` is driven by the
    // separate `discrete` index path, so it is emit-only — not in `stateUniforms`.
    const boundNames = new Set<string>();
    for (const perState of Object.values(compiled.stateUniforms)) {
      for (const name of Object.keys(perState)) boundNames.add(name);
    }

    // The names the compiler EMITS into the preamble the runtime prepends.
    const emittedNames = glslUniformNames(compiled.declarations);

    // THE LAW: the emitted uniform vocabulary IS the glslIdent projection of the
    // authored keys plus the index uniform — computed, never hand-typed.
    expect(emittedNames).toEqual(expected);
    // And every name the runtime binds is a uniform the compiler declared: the
    // two views can never diverge into a bind-without-declaration (silent no-op).
    for (const name of boundNames) expect(emittedNames).toContain(name);
  });

  test('the WGSL struct field vocabulary matches the per-state binding vocabulary', () => {
    const compiled = WGSLCompiler.compile(boundary, authoredStates);

    // Bound names: the keys of the compiler's per-state binding maps — what the
    // WGSL runtime writes into the uniform buffer (detail.wgsl).
    const boundNames = new Set<string>();
    for (const perState of Object.values(compiled.stateBindings)) {
      for (const name of Object.keys(perState)) boundNames.add(name);
    }
    // Emitted struct field names parsed from the declarations the runtime
    // prepends and `parseWgslUniformLayout` reads back — the same struct.
    const struct = /struct\s+\w+\s*\{([\s\S]*?)\}/.exec(compiled.declarations);
    const emittedFields = new Set(
      [...(struct?.[1] ?? '').matchAll(/([A-Za-z_]\w*)\s*:/g)].map((m) => m[1]!),
    );

    // Every bound field is a declared struct field (state_index is emit-only).
    for (const name of boundNames) expect(emittedFields).toContain(name);
    expect(emittedFields.has('state_index')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PREPEND HELPERS — splice rules + redeclaration safety
// ---------------------------------------------------------------------------

describe('prependGlslDeclarations', () => {
  const compiled = GLSLCompiler.compile(boundary, authoredStates);

  test('splices the preamble after #version + precision, before main()', () => {
    const frag = `#version 300 es
precision mediump float;
out vec4 fragColor;
void main() { fragColor = vec4(u_blur_radius / 10.0); }`;
    const out = prependGlslDeclarations(frag, compiled.declarations);

    const lines = out.split('\n');
    expect(lines[0]).toContain('#version'); // #version stays the first token
    // Authored uniform now declared, lifted into the source from the compiler.
    expect(out).toContain('uniform float u_blur_radius;');
    // Declaration block sits before the body.
    expect(out.indexOf('uniform float u_blur_radius;')).toBeLessThan(out.indexOf('void main'));
  });

  test('drops a uniform the fragment already declares (no GLSL redeclaration)', () => {
    // The built-in fallback declares its own `u_state`; prepending the compiler's
    // `uniform int u_state;` would be a hard compile error — the dedup keeps one.
    const frag = `#version 300 es
precision mediump float;
out vec4 fragColor;
uniform float u_state;
void main() { fragColor = vec4(u_state); }`;
    const out = prependGlslDeclarations(frag, compiled.declarations);
    const stateDecls = [...out.matchAll(/\buniform\s+\w+\s+u_state\s*;/g)];
    expect(stateDecls).toHaveLength(1);
  });

  test('is a no-op for an empty declarations string', () => {
    const frag = '#version 300 es\nvoid main() {}';
    expect(prependGlslDeclarations(frag, '')).toBe(frag);
  });
});

describe('prependWgslDeclarations', () => {
  const compiled = WGSLCompiler.compile(boundary, authoredStates);

  test('prepends the struct when the source declares no uniform group', () => {
    const frag = '@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4(1.0); }';
    const out = prependWgslDeclarations(frag, compiled.declarations);
    expect(out).toContain('struct');
    expect(out).toContain('@group(0) @binding(0)');
    expect(out.indexOf('@group(0) @binding(0)')).toBeLessThan(out.indexOf('@fragment'));
  });

  test('skips prepending when the source already binds @group(0) @binding(0)', () => {
    const withGroup = `${compiled.declarations}\n@fragment fn fs_main() {}`;
    // Re-prepending the same declarations would redeclare the struct → skip.
    expect(prependWgslDeclarations(withGroup, compiled.declarations)).toBe(withGroup);
  });

  test('is a no-op for an absent declarations string', () => {
    const frag = '@fragment fn fs_main() {}';
    expect(prependWgslDeclarations(frag, undefined)).toBe(frag);
  });
});

// ---------------------------------------------------------------------------
// ACCEPTANCE — authored @glsl declarations reach gl.shaderSource + uniform updates live
// ---------------------------------------------------------------------------

describe('acceptance: authored @glsl declarations reach gl.shaderSource and a uniform updates live', () => {
  const stubs = createStubRegistry();

  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.setAttribute('data-liteship-tier', 'reactive');
  });

  afterEach(() => {
    stubs.restoreAll();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-liteship-tier');
  });

  test('the compiler preamble reaches gl.shaderSource and u_blur_radius updates on a crossing', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 11) as never);
    vi.stubGlobal('cancelAnimationFrame', vi.fn() as never);

    const compiled = GLSLCompiler.compile(boundary, authoredStates);
    // The author's fragment REFERENCES the compiler's uniforms WITHOUT declaring
    // them — exactly the ergonomic win: no hand-typed `uniform` lines.
    const authoredFragment = `#version 300 es
precision mediump float;
out vec4 fragColor;
void main() { fragColor = vec4(u_blur_radius, u_brightness, float(u_state), 1.0); }`;

    // The boundary payload `<Satellite>` would emit, carrying the compiler's own
    // declarations + per-state values (computed, never hand-typed).
    const attrs = satelliteAttrs({
      boundary,
      glsl: compiled.stateUniforms,
      glslDeclarations: compiled.declarations,
      initialState: 'collapsed',
    });

    // The emitted preamble must ride the payload (the delivery seam).
    const payload = JSON.parse(attrs['data-liteship-boundary']!) as { glslDeclarations?: string };
    expect(payload.glslDeclarations).toBe(compiled.declarations);

    const shaderSources: string[] = [];
    const uniform1f = vi.fn();
    const gl = {
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
      // The program reports the authored uniforms as ACTIVE — they exist because
      // the prepended declarations declared them. (u_state is float here.)
      getProgramParameter: vi.fn((_: unknown, key: number) => (key === 3 ? 3 : true)),
      getActiveUniform: vi
        .fn()
        .mockReturnValueOnce({ name: 'u_state', type: 7 })
        .mockReturnValueOnce({ name: 'u_blur_radius', type: 7 })
        .mockReturnValueOnce({ name: 'u_brightness', type: 7 }),
      getUniformLocation: vi.fn((_: unknown, name: string) => name),
      uniform1f,
      uniform2f: vi.fn(),
      viewport: vi.fn(),
      drawArrays: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (gl as never) : null,
    );

    const canvas = document.createElement('canvas');
    for (const [k, v] of Object.entries(attrs)) canvas.setAttribute(k, v);
    canvas.setAttribute('data-liteship-shader-src', authoredFragment);
    document.body.appendChild(canvas);
    stubs.define(canvas, 'clientWidth', { configurable: true, value: 300 });
    stubs.define(canvas, 'clientHeight', { configurable: true, value: 150 });

    initGPUDirective(async () => {}, canvas, { force: true });
    await Promise.resolve();
    await Promise.resolve();

    // DELIVERY: the compiler's emitted declarations reached gl.shaderSource —
    // the fragment that compiled carries the compiler's uniform vocabulary.
    const fragSource = shaderSources.find((s) => s.includes('fragColor'));
    expect(fragSource).toBeDefined();
    expect(fragSource).toContain('uniform float u_blur_radius;');
    expect(fragSource).toContain('uniform float u_brightness;');

    // LIVE: crossing into 'expanded' drives the authored u_blur_radius:0 live —
    // the uniform VALUE that already flows via detail.glsl resolves a real
    // location because the declarations put u_blur_radius in the program.
    canvas.dispatchEvent(
      new CustomEvent('liteship:uniform-update', {
        detail: { glsl: compiled.stateUniforms.expanded },
      }),
    );
    expect(uniform1f).toHaveBeenCalledWith('u_blur_radius', 0.5);
    expect(uniform1f).toHaveBeenCalledWith('u_brightness', 1.5);
  });

  test('the discrete u_state write follows the DECLARED type: int → uniform1i(raw index)', () => {
    // The compiler emits `uniform int u_state` (glsl.ts) and the canonical
    // `bindUniforms` sets it to the RAW index via uniform1i. When the program
    // reports u_state as INT, the discrete state path must match that setter +
    // value — writing a normalized float via uniform1f raises INVALID_OPERATION
    // and the transition silently stops. (The built-in fallback declares
    // `uniform float u_state` for `mix()`, the FLOAT branch — covered above.)
    const INT = 0x1404;
    const uniform1i = vi.fn();
    const uniform1f = vi.fn();
    const gl = {
      COMPILE_STATUS: 1,
      LINK_STATUS: 2,
      ACTIVE_UNIFORMS: 3,
      TRIANGLES: 4,
      ARRAY_BUFFER: 5,
      STATIC_DRAW: 6,
      FLOAT: 7,
      VERTEX_SHADER: 8,
      FRAGMENT_SHADER: 9,
      INT,
      BOOL: 0x8b56,
      createShader: vi.fn(() => ({})),
      shaderSource: vi.fn(),
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
      // The program reports u_state as INT — the compiler's declaration is live.
      getProgramParameter: vi.fn((_: unknown, key: number) => (key === 3 ? 1 : true)),
      getActiveUniform: vi.fn().mockReturnValueOnce({ name: 'u_state', type: INT }),
      getUniformLocation: vi.fn((_: unknown, name: string) => name),
      uniform1i,
      uniform1f,
      uniform2f: vi.fn(),
      viewport: vi.fn(),
      drawArrays: vi.fn(),
    };

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 11) as never);
    vi.stubGlobal('cancelAnimationFrame', vi.fn() as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (gl as never) : null,
    );

    const compiled = GLSLCompiler.compile(boundary, authoredStates);
    const attrs = satelliteAttrs({
      boundary,
      glsl: compiled.stateUniforms,
      glslDeclarations: compiled.declarations,
      initialState: 'collapsed',
    });
    const canvas = document.createElement('canvas');
    for (const [k, v] of Object.entries(attrs)) canvas.setAttribute(k, v);
    canvas.setAttribute(
      'data-liteship-shader-src',
      '#version 300 es\nprecision mediump float;\nout vec4 fragColor;\nvoid main() { fragColor = vec4(float(u_state)); }',
    );
    document.body.appendChild(canvas);
    stubs.define(canvas, 'clientWidth', { configurable: true, value: 300 });
    stubs.define(canvas, 'clientHeight', { configurable: true, value: 150 });

    initGPUDirective(async () => {}, canvas, { force: true });

    // Cross into 'expanded' (raw state index 1) via the discrete path.
    const payload = JSON.parse(attrs['data-liteship-boundary']!) as { id?: string };
    canvas.dispatchEvent(
      new CustomEvent('liteship:uniform-update', {
        detail: { discrete: { [payload.id ?? 'default']: 'expanded' } },
      }),
    );

    // The int uniform gets the RAW index via uniform1i — never a normalized float.
    expect(uniform1i).toHaveBeenCalledWith('u_state', 1);
    expect(uniform1f).not.toHaveBeenCalledWith('u_state', expect.anything());
  });

  test('document-level glsl uniform updates route through int scalar handling', async () => {
    const INT = 0x1404;
    const uniform1i = vi.fn();
    const uniform1f = vi.fn();
    const gl = {
      COMPILE_STATUS: 1,
      LINK_STATUS: 2,
      ACTIVE_UNIFORMS: 3,
      TRIANGLES: 4,
      ARRAY_BUFFER: 5,
      STATIC_DRAW: 6,
      FLOAT: 7,
      VERTEX_SHADER: 8,
      FRAGMENT_SHADER: 9,
      INT,
      BOOL: 0x8b56,
      createShader: vi.fn(() => ({})),
      shaderSource: vi.fn(),
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
      getProgramParameter: vi.fn((_: unknown, key: number) => (key === 3 ? 1 : true)),
      getActiveUniform: vi.fn().mockReturnValueOnce({ name: 'u_state', type: INT }),
      getUniformLocation: vi.fn((_: unknown, name: string) => name),
      uniform1i,
      uniform1f,
      uniform2f: vi.fn(),
      viewport: vi.fn(),
      drawArrays: vi.fn(),
    };

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 11) as never);
    vi.stubGlobal('cancelAnimationFrame', vi.fn() as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) =>
      kind === 'webgl2' ? (gl as never) : null,
    );

    const canvas = document.createElement('canvas');
    canvas.setAttribute(
      'data-liteship-shader-src',
      '#version 300 es\nprecision mediump float;\nout vec4 fragColor;\nvoid main() { fragColor = vec4(float(u_state)); }',
    );
    document.body.appendChild(canvas);
    stubs.define(canvas, 'clientWidth', { configurable: true, value: 300 });
    stubs.define(canvas, 'clientHeight', { configurable: true, value: 150 });

    initGPUDirective(async () => {}, canvas, { force: true });
    await Promise.resolve();
    await Promise.resolve();

    document.dispatchEvent(
      new CustomEvent('liteship:uniform-update', {
        detail: { glsl: { u_state: 2 } },
      }),
    );

    expect(uniform1i).toHaveBeenCalledWith('u_state', 2);
    expect(uniform1f).not.toHaveBeenCalledWith('u_state', expect.anything());
  });
});

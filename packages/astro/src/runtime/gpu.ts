import { Diagnostics, CANVAS_FALLBACK_WIDTH, CANVAS_FALLBACK_HEIGHT, glslIdent, systemClock } from '@czap/core';
import {
  parseShaderIntegrity,
  verifyShaderIntegrity,
  isExternalShaderSource,
  decideShaderIntegrity,
  DEFAULT_SHADER_INTEGRITY_MODE,
} from '@czap/web';
import { onDetectReady } from '@czap/detect';
import { readRuntimeEndpointPolicy } from './policy.js';
import { allowRuntimeEndpointUrl } from './url-policy.js';
import { initWGSLRuntime, warnWebGpuUnavailable } from './wgpu.js';
import { bootDirectiveEntry, unmarkBound } from './directive-bound.js';

/**
 * Elements whose GPU shader has actually started (a canvas committed past the tier
 * gate). Guards the detect-ready re-run: a forced boot can start the shader BEFORE an
 * earlier provisional-tier bail's armed `onDetectReady` fires, and without this the
 * upgrade would append a SECOND canvas / render loop for the same host. Kept OFF the
 * DOM (engine state never leaks onto the host); a `WeakSet` so a torn-down host is GC'd.
 */
const gpuStarted = new WeakSet<HTMLElement>();

const DEFAULT_VERTEX_SHADER = `#version 300 es
precision mediump float;
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FULLSCREEN_QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

/**
 * Read the compiler's emitted shader preamble off the satellite's
 * `data-czap-boundary` payload. `<Satellite>`/`satelliteAttrs` ride
 * `glslDeclarations`/`wgslDeclarations` (joined from the build manifest by
 * content address) so the runtime never hand-types the uniform vocabulary.
 * Returns `''` when absent or the payload doesn't parse — the directive then
 * keeps its built-in fallback shader.
 */
function readShaderDeclarations(boundaryJson: string | null, key: 'glslDeclarations' | 'wgslDeclarations'): string {
  if (!boundaryJson) return '';
  try {
    const parsed = JSON.parse(boundaryJson) as Record<string, unknown>;
    const value = parsed[key];
    return typeof value === 'string' ? value : '';
  } catch (err) {
    // Malformed payload: surface it (init-time) instead of laundering the parse
    // error into a silent ''. The directive then keeps its built-in fallback
    // shader (no preamble) — a deliberate degradation, not a swallowed failure.
    Diagnostics.warnOnce({
      source: 'czap/astro.gpu',
      code: 'shader-declarations-parse-failed',
      message:
        `Failed to parse boundary JSON while reading ${key} (${String(err)}). ` +
        `Keeping the built-in fallback shader. Fix: re-serialize with satelliteAttrs({ boundary }) from @czap/astro.`,
    });
    return '';
  }
}

/**
 * Warn (once) when a `client:gpu` host has no layout at boot: `clientWidth`/
 * `clientHeight` resolve to 0, so the canvas backing store falls to the HTML
 * default (CANVAS_FALLBACK_WIDTH x CANVAS_FALLBACK_HEIGHT) and the shader renders
 * into a tiny offscreen buffer with no console error. Covers BOTH the
 * wrapper-element path (the directive sizes a created canvas from the host) and a
 * directly-passed `<canvas>` whose own layout is 0 (the render loops also fall
 * back per-frame). Same silent-boot family as the directive-collision warn.
 */
function warnIfHostUnsized(host: HTMLElement): void {
  if (host.clientWidth !== 0 && host.clientHeight !== 0) return;
  Diagnostics.warnOnce({
    source: 'czap/astro.gpu',
    code: 'canvas-default-size',
    message:
      `client:gpu host had no layout at boot (clientWidth/clientHeight = 0); the canvas falls back to ` +
      `${CANVAS_FALLBACK_WIDTH}x${CANVAS_FALLBACK_HEIGHT} (the HTML default), so the shader renders at a tiny ` +
      `default size instead of filling its host. ` +
      `Fix: give the host explicit CSS width/height (or a sized parent) before client:gpu mounts, or put ` +
      `client:gpu on a <canvas> you size directly.`,
    detail: {
      clientWidth: host.clientWidth,
      clientHeight: host.clientHeight,
      fallbackWidth: CANVAS_FALLBACK_WIDTH,
      fallbackHeight: CANVAS_FALLBACK_HEIGHT,
    },
  });
}

/**
 * Prepend the compiler's emitted `declarations` preamble (`#define STATE_*` +
 * `uniform <type> u_*;` lines) into a GLSL ES 3.00 fragment source so the
 * runtime's uniform vocabulary is the compiler's, never a hand-typed mirror.
 *
 * GLSL requires `#version` to be the very first token, so the preamble is
 * spliced in AFTER the leading `#version` line (and any immediately following
 * `precision` directive) rather than at the top. A compiler declaration whose
 * name the author's fragment ALSO declares is dropped (a redeclaration is a hard
 * compile error), so on a name collision the author's explicit line wins — but
 * normally the author writes none, letting the compiler's declarations cover the
 * whole uniform vocabulary.
 */
export function prependGlslDeclarations(source: string, declarations: string): string {
  if (!declarations) return source;
  // Drop any compiler-emitted `uniform … u_name;` whose name the fragment already
  // declares (a redeclaration is a hard compile error). Identifier match on the
  // declared name keeps `u_state` from colliding with a default fragment that
  // declares its own. `#define`s are idempotent across identical text but a
  // differing value would warn — emit only those the source lacks by name too.
  const declaredUniforms = new Set([...source.matchAll(/\buniform\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1]));
  const declaredDefines = new Set([...source.matchAll(/#define\s+(\w+)\b/g)].map((m) => m[1]));
  const keptLines = declarations.split('\n').filter((line) => {
    const uni = /\buniform\s+\w+\s+(\w+)\s*;/.exec(line);
    if (uni) return !declaredUniforms.has(uni[1]);
    const def = /#define\s+(\w+)\b/.exec(line);
    if (def) return !declaredDefines.has(def[1]);
    return true; // blank lines / comments pass through
  });
  const preamble = keptLines.join('\n');
  if (!preamble.trim()) return source;

  // Splice after `#version` (mandatory first line) + an optional `precision`
  // directive, so `#define`/`uniform` land in a legal position.
  const lines = source.split('\n');
  let insertAt = 0;
  if (lines[0]?.trimStart().startsWith('#version')) {
    insertAt = 1;
    while (lines[insertAt]?.trimStart().startsWith('precision')) insertAt++;
  }
  lines.splice(insertAt, 0, preamble);
  return lines.join('\n');
}

function elementGpuLabel(element: HTMLElement): string {
  return (
    element.id || element.getAttribute('data-czap-id') || element.getAttribute('data-czap-satellite') || 'gpu-element'
  );
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
  elementLabel: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    Diagnostics.warn({
      source: 'czap/astro.gpu',
      code: 'shader-compile-failed',
      message: `Shader compilation failed for element "${elementLabel}".`,
      detail: gl.getShaderInfoLog(shader),
    });
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string,
  elementLabel: string,
): WebGLProgram | null {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc, elementLabel);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc, elementLabel);
  if (!vert || !frag) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    Diagnostics.warn({
      source: 'czap/astro.gpu',
      code: 'program-link-failed',
      message: 'Shader program linking failed.',
      detail: gl.getProgramInfoLog(program),
    });
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

/**
 * Entry point used by the `client:gpu` directive to wire a
 * satellite element to a WebGL shader.
 *
 * Reads `data-czap-shader-type` / `data-czap-shader-src` off the
 * element, fetches and compiles the program, then subscribes to
 * `czap:uniform-update` events so each boundary transition updates the
 * shader uniforms.
 *
 * @param load - Dynamic-import factory the directive passes in (kept
 *   async so the expensive GPU module is code-split).
 * @param el - Satellite element carrying the shader attributes.
 * @param opts - Directive value. `{ force: true }` (or a
 *   `data-czap-gpu-force` attribute) boots the shader even when the resolved
 *   perf-tier is below the GPU rung — the escape hatch for headless/CI
 *   (SwiftShader reports gpuTier 0 yet WebGL2 works) and real low-tier-but-
 *   capable devices. It only bypasses the *heuristic* gate; the actual
 *   `getContext('webgl2')` / WebGPU probe still guards real capability and
 *   degrades to CSS if the context genuinely isn't there.
 */
export function initGPUDirective(load: () => Promise<unknown>, el: HTMLElement, opts?: Record<string, unknown>): void {
  const elementLabel = elementGpuLabel(el);
  const shaderType = el.getAttribute('data-czap-shader-type') ?? 'glsl';
  // The compiler's emitted shader preamble rides the boundary payload
  // (`glslDeclarations` / `wgslDeclarations`). Reading it here lets both the
  // GLSL and WGSL paths prepend the compiler's OWN uniform vocabulary to the
  // shader source before compile — so the names the runtime binds (gpu.ts:~372
  // via canonical `glslIdent`) and the names the compiler emits stay one source.
  const shaderDeclarations = readShaderDeclarations(
    el.getAttribute('data-czap-boundary'),
    shaderType === 'wgsl' ? 'wgslDeclarations' : 'glslDeclarations',
  );
  const shaderSrc = allowRuntimeEndpointUrl(
    el.getAttribute('data-czap-shader-src'),
    'gpu-shader',
    'czap/astro.gpu',
    {
      crossOriginRejected: 'shader-cross-origin-url-rejected',
      malformedUrl: 'shader-malformed-url-rejected',
      originNotAllowed: 'shader-origin-not-allowed',
      endpointKindNotPermitted: 'shader-endpoint-kind-not-permitted',
    },
    readRuntimeEndpointPolicy(),
  );
  // The author-pinned content integrity hash (SRI `sha256-<base64>`), parsed
  // alongside the URL. The URL guard above decides WHICH origin may serve the
  // shader; this pin verifies WHAT BYTES come back — so a compromised same-origin
  // server (or a poisoned CDN cache) cannot slip a tampered shader past the URL
  // guard into the GPU. `null` = no pin (the secure-by-default policy refuses an
  // external fetch with no pin; an inline shader needs none).
  const shaderIntegrity = parseShaderIntegrity(el.getAttribute('data-czap-shader-integrity'));

  // Force escape hatch: `client:gpu={{ force: true }}` or a `data-czap-gpu-force`
  // attr bypasses the perf-tier gate so headless/CI (SwiftShader → gpuTier 0,
  // WebGL2 fine) and low-tier-but-capable devices can still boot. Capability is
  // re-checked downstream by the real getContext/WebGPU probe, which falls back
  // to CSS if the context is truly absent — so forcing is safe, never a crash.
  const forced = opts?.['force'] === true || el.hasAttribute('data-czap-gpu-force');

  // The GPU probe runs ASYNC, so the directive's first activation sees only the
  // conservative provisional tier — a genuinely capable device starts at
  // 'styled'/'static' and would never boot. So when the tier doesn't admit (and
  // not forced), defer and re-check when the probe settles (`czap:detect-ready`):
  // a GPU upgrade boots the shader THEN, no force needed. Headless/CI stays at
  // tier 0 → the force hatch. The re-run is forced (the tier now admits) with a
  // no-op load so hydration — done once here — never repeats; the bail created no
  // canvas, so the re-run appends exactly one.
  const tierAdmitsGpu = (): boolean => {
    const tier = document.documentElement.getAttribute('data-czap-tier') ?? 'reactive';
    return tier !== 'static' && tier !== 'styled';
  };
  if (!forced && !tierAdmitsGpu()) {
    load();
    // Re-boot once the async probe settles a GPU-admitting tier. `onDetectReady`
    // (owned by @czap/detect) wraps the event-name + the dual-dispatch invariant:
    // detect-ready fires on BOTH the success AND error paths, so the one-shot
    // subscription self-removes — no leak even if it lands after a swap. The
    // el.isConnected guard is the safety net: a detached host (replaced by a VT
    // swap, torn down) never re-inits into orphan GPU resources. We deliberately
    // do NOT drop this on czap:reinit — slots.ts fires reinit on LIVE re-init too
    // (still-connected roots), and the bail path returns before the main
    // czap:reinit teardown registration, so removing here would strand a persisted
    // host that upgrades right after a swap. Surviving the reinit is correct:
    // tierAdmitsGpu re-reads the fresh data-czap-tier.
    onDetectReady(() => {
      if (!el.isConnected) return;
      // A forced boot may have started the shader while this retry was armed; the
      // tier upgrade must not append a second canvas over it.
      if (gpuStarted.has(el)) return;
      if (tierAdmitsGpu()) {
        initGPUDirective(() => Promise.resolve(), el, { ...(opts ?? {}), force: true });
      }
    });
    return;
  }

  // Past the tier gate: this activation commits to appending a canvas. Mark the host so
  // a pending detect-ready retry (armed by an earlier provisional-tier bail) observes
  // the shader already started and does not double-boot it.
  gpuStarted.add(el);

  if (shaderType === 'wgsl') {
    let canvas: HTMLCanvasElement;
    if (el instanceof HTMLCanvasElement) {
      canvas = el;
    } else {
      canvas = document.createElement('canvas');
      canvas.width = el.clientWidth || CANVAS_FALLBACK_WIDTH;
      canvas.height = el.clientHeight || CANVAS_FALLBACK_HEIGHT;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      el.appendChild(canvas);
    }
    warnIfHostUnsized(el);

    // F-3: arm the reinit teardown SYNCHRONOUSLY, before the first await, through
    // a mutable Disposer cell. `initWGSLRuntime` is async, so a `czap:reinit` that
    // lands DURING its await would otherwise find no listener and strand the WGSL
    // runtime allocated right after. The listener invokes whatever the cell holds
    // — a no-op until the runtime exists — AND flips a `disposed` flag so a reinit
    // that fired mid-await makes the resolved runtime tear ITSELF down instead of
    // leaking. One settle either way: the listener self-removes after firing.
    let wgslDisposer: () => void = () => {};
    let wgslDisposed = false;
    const onWgslReinit = (): void => {
      el.removeEventListener('czap:reinit', onWgslReinit);
      wgslDisposed = true;
      wgslDisposer();
    };
    el.addEventListener('czap:reinit', onWgslReinit);

    void (async () => {
      // Pass `el` (the satellite) so the runtime subscribes to its
      // `czap:uniform-update` and binds `detail.wgsl` into the uniform buffer
      // live on every crossing.
      const dispose = await initWGSLRuntime(canvas, shaderSrc ?? '', el, shaderDeclarations, shaderIntegrity);
      if (!dispose) {
        warnWebGpuUnavailable();
        const gl = canvas.getContext('webgl2');
        if (gl) {
          Diagnostics.warnOnce({
            source: 'czap/astro.gpu',
            code: 'wgsl-fallback-webgl2',
            message: 'WebGPU unavailable; WGSL directive fell back to WebGL2 default shader.',
          });
        }
      } else if (wgslDisposed) {
        // A reinit already landed during the await and ran the no-op cell; the
        // runtime that just resolved is orphaned, so tear it down immediately.
        dispose();
      } else {
        el.dispatchEvent(new CustomEvent('czap:gpu-ready', { bubbles: true }));
        wgslDisposer = dispose;
      }
    })();
    load();
    return;
  }

  let canvas: HTMLCanvasElement;
  if (el instanceof HTMLCanvasElement) {
    canvas = el;
  } else {
    canvas = document.createElement('canvas');
    canvas.width = el.clientWidth || CANVAS_FALLBACK_WIDTH;
    canvas.height = el.clientHeight || CANVAS_FALLBACK_HEIGHT;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    el.appendChild(canvas);
  }
  warnIfHostUnsized(el);

  const gl = canvas.getContext('webgl2');
  if (!gl) {
    Diagnostics.warnOnce({
      source: 'czap/astro.gpu',
      code: 'webgl2-unavailable',
      message: 'WebGL2 is unavailable; falling back to CSS rendering.',
    });
    load();
    return;
  }

  const webgl = gl;

  // F-3: arm the reinit teardown SYNCHRONOUSLY, before `initShader` runs any
  // await (the shader `fetch`). The teardown used to be registered at the END of
  // initShader, so a `czap:reinit` landing DURING the fetch found no listener and
  // orphaned the GL program + render loop created right after. The cell holds a
  // no-op until the program exists; the listener invokes whatever it currently
  // holds and flips `disposed` so a reinit that fired mid-fetch makes the resolved
  // shader tear ITSELF down. The listener self-removes after firing (gpu treats
  // reinit as a one-shot teardown — directive-boot re-activates only fresh nodes).
  let glDisposer: () => void = () => {};
  let glDisposed = false;
  const onGlReinit = (): void => {
    el.removeEventListener('czap:reinit', onGlReinit);
    glDisposed = true;
    glDisposer();
  };
  el.addEventListener('czap:reinit', onGlReinit);

  async function initShader(): Promise<void> {
    let fragSource: string;

    if (shaderSrc && isExternalShaderSource(shaderSrc)) {
      let fetchedSource: string;
      try {
        const response = await fetch(shaderSrc);
        if (!response.ok) {
          Diagnostics.warn({
            source: 'czap/astro.gpu',
            code: 'shader-fetch-failed',
            message: 'Failed to fetch shader source.',
            detail: response.statusText,
          });
          return;
        }
        fetchedSource = await response.text();
      } catch (err) {
        Diagnostics.warn({
          source: 'czap/astro.gpu',
          code: 'shader-fetch-threw',
          message: 'Fetching shader source threw an error.',
          cause: err,
        });
        return;
      }

      // CONTENT INTEGRITY (defense-in-depth): the URL guard already vetted the
      // ORIGIN; now verify the fetched BYTES against the author-pinned SRI hash
      // BEFORE they reach `gl.shaderSource`. The compiled `fragSource` is the
      // VERIFIED content this returns — a value that reaches the GPU has provably
      // passed this check (the taint-breaking content sanitizer on the data path).
      // On a mismatch (a tampered / compromised shader) or a missing pin under the
      // secure-by-default policy, REFUSE: log a security diagnostic and return
      // before any compile. Never compile unverified external bytes.
      const verification = verifyShaderIntegrity(fetchedSource, shaderIntegrity);
      // The secure-by-default decision: a `mismatch` (tampered shader) ALWAYS
      // refuses; an `absent` pin on an external fetch refuses under
      // `required-for-external` (the runtime's fixed, secure-by-default mode).
      // Only a `verified` result proceeds — so the value compiled below has
      // provably passed the integrity sanitizer.
      if (!decideShaderIntegrity(verification, DEFAULT_SHADER_INTEGRITY_MODE).proceed) {
        if (verification._tag === 'mismatch') {
          Diagnostics.error({
            source: 'czap/astro.gpu',
            code: 'shader-integrity-mismatch',
            message:
              `Shader content integrity check FAILED for "${shaderSrc}" — the fetched bytes do not match the ` +
              `author-pinned hash (a tampered or compromised shader). Refusing to compile. ` +
              `expected sha256 ${verification.expectedHex}, got ${verification.actualHex}.`,
          });
        } else {
          Diagnostics.error({
            source: 'czap/astro.gpu',
            code: 'shader-integrity-absent',
            message:
              `External shader "${shaderSrc}" was fetched with NO integrity hash. An unverified external ` +
              `shader cannot be loaded (secure-by-default). Refusing to compile. ` +
              `Fix: add a data-czap-shader-integrity="sha256-<base64>" attribute pinning the shader content.`,
          });
        }
        return;
      }
      // VERIFIED — compile the verified content (the value that passed the
      // integrity sanitizer; the taint-clean shader bytes reach the GPU).
      if (verification._tag !== 'verified') return;
      fragSource = verification.content;
    } else if (shaderSrc) {
      fragSource = shaderSrc;
    } else {
      fragSource = `#version 300 es
precision mediump float;
in vec2 v_uv;
out vec4 fragColor;
uniform float u_state;
uniform float u_time;
void main() {
  vec3 color = mix(vec3(0.2, 0.3, 0.8), vec3(0.8, 0.3, 0.2), u_state);
  float bands = 4.0;
  color = floor(color * bands) / bands;
  fragColor = vec4(color, 1.0);
}`;
    }

    // Prepend the compiler's emitted preamble (`#define STATE_*` + `uniform u_*;`)
    // so the authored fragment can REFERENCE the compiler's uniforms without
    // hand-typing matching declarations. Redeclarations the fragment already
    // carries (e.g. the built-in fallback's `u_state`/`u_time`) are dropped, so
    // prepending is always safe. With declarations present, an authored `@glsl`
    // boundary's uniform vocabulary reaches `gl.shaderSource` straight from the
    // compiler — the binding loop below then resolves real `u_*` locations.
    const fragWithDeclarations = prependGlslDeclarations(fragSource, shaderDeclarations);

    const program = createProgram(webgl, DEFAULT_VERTEX_SHADER, fragWithDeclarations, elementLabel);
    if (!program) return;

    webgl.useProgram(program);

    const vao = webgl.createVertexArray();
    webgl.bindVertexArray(vao);
    const buffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, buffer);
    webgl.bufferData(webgl.ARRAY_BUFFER, FULLSCREEN_QUAD, webgl.STATIC_DRAW);
    const posLoc = webgl.getAttribLocation(program, 'a_position');
    webgl.enableVertexAttribArray(posLoc);
    webgl.vertexAttribPointer(posLoc, 2, webgl.FLOAT, false, 0, 0);

    const uniforms = new Map<string, WebGLUniformLocation>();
    // int/bool-typed scalar uniforms MUST be set with uniform1i; uniform1f raises
    // INVALID_OPERATION and the uniform silently keeps its old value, so an
    // integer-inferred `@glsl` uniform (e.g. `u_state`) would stop updating.
    const intUniforms = new Set<string>();
    const numUniforms = webgl.getProgramParameter(program, webgl.ACTIVE_UNIFORMS);
    for (let i = 0; i < numUniforms; i++) {
      const info = webgl.getActiveUniform(program, i);
      if (info) {
        const loc = webgl.getUniformLocation(program, info.name);
        if (loc) {
          uniforms.set(info.name, loc);
          // Guard `typeof number` so a context/mock with an undefined `type` (or
          // undefined GL constants) can't misclassify every uniform as int via
          // `undefined === undefined`; real WebGL always reports a numeric type.
          if (typeof info.type === 'number' && (info.type === webgl.INT || info.type === webgl.BOOL)) {
            intUniforms.add(info.name);
          }
        }
      }
    }
    const setScalarUniform = (name: string, loc: WebGLUniformLocation, num: number): void => {
      if (intUniforms.has(name)) webgl.uniform1i(loc, Math.round(num));
      else webgl.uniform1f(loc, num);
    };

    // Animation epoch for the `u_time` uniform. The live render loop is an
    // inherently real-time boundary with no injection seam, so both the epoch
    // and the per-frame read route through `systemClock` (the single declared
    // entropy boundary) — `u_time` is their monotonic elapsed-seconds delta.
    const startTime = systemClock.now();
    let animFrame = 0;

    function render(): void {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        webgl.viewport(0, 0, w, h);
      }

      const timeLoc = uniforms.get('u_time');
      if (timeLoc) {
        webgl.uniform1f(timeLoc, (systemClock.now() - startTime) / 1000);
      }

      const resLoc = uniforms.get('u_resolution');
      if (resLoc) {
        webgl.uniform2f(resLoc, w, h);
      }

      webgl.drawArrays(webgl.TRIANGLES, 0, 6);
      animFrame = requestAnimationFrame(render);
    }

    const onElementUniformUpdate = (event: Event): void => {
      /* v8 ignore next — `czap:uniform-update` is always dispatched via `new CustomEvent(...)`;
         the guard narrows the generic `Event` parameter for TypeScript's typed `.detail` access. */
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail;
      if (!detail) return;

      const boundaryJson = el.getAttribute('data-czap-boundary');
      if (boundaryJson && detail.discrete) {
        try {
          const boundary = JSON.parse(boundaryJson);
          const stateName = detail.discrete[boundary.id ?? 'default'];
          if (stateName) {
            const idx = boundary.states.indexOf(stateName);
            const stateLoc = uniforms.get('u_state');
            if (stateLoc && idx >= 0) {
              // u_state's value form follows its DECLARED type (the source of
              // truth, read back from `getActiveUniform` into `intUniforms`):
              // the compiler emits `uniform int u_state` and the canonical
              // `bindUniforms` sets it to the RAW index via uniform1i; the
              // built-in fallback declares `uniform float u_state` and uses it
              // as a `mix()` factor, so it wants the NORMALIZED 0..1 ramp. A
              // single hardcoded `uniform1f` wrote a normalized float into the
              // compiler's int uniform — INVALID_OPERATION, silently dropped, so
              // authored-`@glsl` state transitions stopped. Route through the
              // declared type so neither contract drifts.
              if (intUniforms.has('u_state')) {
                webgl.uniform1i(stateLoc, idx);
              } else {
                webgl.uniform1f(stateLoc, idx / Math.max(1, boundary.states.length - 1));
              }
            }
          }
        } catch {
          Diagnostics.warnOnce({
            source: 'czap/astro.gpu',
            code: 'uniform-update-parse-failed',
            message:
              `Failed to parse boundary JSON during uniform update (${boundaryJson.slice(0, 120)}). ` +
              `Fix: re-serialize the boundary with satelliteAttrs({ boundary }) from @czap/astro.`,
          });
        }
      }

      if (detail.css) {
        for (const [key, value] of Object.entries(detail.css)) {
          if (!key.startsWith('--czap-')) continue;
          // Canonical GLSL identifier (matches the compiler's uniform declarations
          // via the shared @czap/core glslIdent — not a partial --czap-→u_ replace).
          const uniformName = glslIdent(key.slice('--czap-'.length));
          const loc = uniforms.get(uniformName);
          if (loc && typeof value === 'string') {
            const num = parseFloat(value);
            if (!Number.isNaN(num)) {
              setScalarUniform(uniformName, loc, num);
            }
          }
        }
      }

      // Authored per-state GLSL uniforms (`@glsl` blocks). `applyBoundaryState`
      // resolves `glslStateUniforms[currentState]` into `detail.glsl` so the
      // uniform keys are already canonical `u_*` names — set them directly.
      if (detail.glsl) {
        for (const [uniformName, value] of Object.entries(detail.glsl)) {
          const loc = uniforms.get(uniformName);
          if (loc && typeof value === 'number' && !Number.isNaN(value)) {
            setScalarUniform(uniformName, loc, value);
          }
        }
      }
    };

    const onDocumentUniformUpdate = (event: Event): void => {
      /* v8 ignore next — `czap:uniform-update` is always dispatched via `new CustomEvent(...)`;
         the guard narrows the generic `Event` parameter for TypeScript's typed `.detail` access. */
      if (!(event instanceof CustomEvent)) return;
      if (event.detail?.uniform && event.detail?.value !== undefined) {
        const loc = uniforms.get(event.detail.uniform);
        if (loc) {
          webgl.uniform1f(loc, event.detail.value);
        }
      }
    };

    const teardown = (): void => {
      cancelAnimationFrame(animFrame);
      el.removeEventListener('czap:uniform-update', onElementUniformUpdate);
      document.removeEventListener('czap:uniform-update', onDocumentUniformUpdate);
      webgl.deleteProgram(program);
    };

    // A reinit that ALREADY fired during the shader fetch ran the no-op cell and
    // self-removed; the program just compiled is orphaned, so tear it down now
    // (and never subscribe to uniform updates or start the render loop).
    if (glDisposed) {
      webgl.deleteProgram(program);
      return;
    }

    el.addEventListener('czap:uniform-update', onElementUniformUpdate);
    document.addEventListener('czap:uniform-update', onDocumentUniformUpdate);

    el.dispatchEvent(new CustomEvent('czap:gpu-ready', { bubbles: true }));
    render();

    glDisposer = teardown;
  }

  void initShader();
  load();
}

/** Astro client directive entry that marks the host before starting the GPU runtime. */
export const gpuDirective = (load: () => Promise<unknown>, opts: Record<string, unknown>, el: HTMLElement): void => {
  // Astro hands custom client directives their expression on `opts.value`
  // (`client:gpu={{ force: true }}` -> `{ name: 'gpu', value: { force: true } }`),
  // matching its built-in directives. The `?? opts` fallback also accepts a value
  // passed directly (the plain-div boot scanner / unit tests). `{ force: true }`
  // boots the shader even in low/headless tiers (see the initGPUDirective force hatch).
  const value = (opts?.['value'] ?? opts) as Record<string, unknown> | undefined;
  const forced = value?.['force'] === true || el.hasAttribute('data-czap-gpu-force');
  // A forced boot must win even when a prior scanner pass already marked the host bound
  // at a provisional (static/styled) tier, where the shader only deferred to
  // detect-ready. Clear that bind so the force hatch re-enters the boot instead of
  // being swallowed by the idempotence guard; initGPUDirective is re-entry-safe (its
  // own detect-ready upgrade path re-runs it the same way).
  if (forced) {
    unmarkBound(el, 'gpu');
  }
  bootDirectiveEntry('gpu', load, opts, el, (runtimeLoad, _runtimeOpts, runtimeEl) => {
    initGPUDirective(runtimeLoad, runtimeEl, value);
  });
};

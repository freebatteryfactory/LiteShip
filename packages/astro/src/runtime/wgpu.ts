/**
 * WebGPU WGSL runtime path for the `client:gpu` directive.
 *
 * @module
 */

import { Diagnostics, systemClock, CANVAS_FALLBACK_WIDTH, CANVAS_FALLBACK_HEIGHT } from '@liteship/core';
import {
  verifyShaderIntegrity,
  isExternalShaderSource,
  decideShaderIntegrity,
  DEFAULT_SHADER_INTEGRITY_MODE,
} from '@liteship/web';
import type { ShaderIntegrity } from '@liteship/web';
import type { WgslUniformValue } from './boundary.js';

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

/**
 * Detects whether a WGSL source already binds a `@group(0) @binding(0)`
 * uniform — the same shape {@link parseWgslUniformLayout} keys on. Mirrors that
 * parser's anchor so the prepend decision and the layout decision agree.
 */
function declaresUniformGroup(source: string): boolean {
  return /@group\s*\(\s*0\s*\)\s*@binding\s*\(\s*0\s*\)\s*var\s*<\s*uniform\s*>/.test(source);
}

/**
 * Prepend the compiler's emitted WGSL preamble (state consts + uniform struct +
 * `@group(0) @binding(0)`) to a shader source so authored WGSL can reference the
 * compiler's OWN struct rather than hand-typing a mirror that must happen to
 * match. Skipped when the source already declares a `@group(0) @binding(0)`
 * uniform (the built-in fallback, or an author who wrote the full struct) — a
 * second declaration is a hard WGSL error.
 */
export function prependWgslDeclarations(source: string, declarations?: string): string {
  if (!declarations || !declarations.trim()) return source;
  if (declaresUniformGroup(source)) return source;
  return `${declarations}\n\n${source}`;
}

/**
 * Fetch an EXTERNAL WGSL shader source (the caller has already established
 * {@link isExternalShaderSource}). Returns the fetched text, or `null` on a
 * non-OK response (logged). Re-throws a network error after logging so the caller
 * can refuse-and-degrade. The fetched bytes are UNVERIFIED — the caller MUST pass
 * them through {@link verifyShaderIntegrity} before compiling them.
 */
async function fetchShaderSource(shaderSrc: string): Promise<string | null> {
  try {
    const response = await fetch(shaderSrc);
    if (!response.ok) {
      Diagnostics.warn({
        source: 'liteship/astro.gpu',
        code: 'wgsl-fetch-failed',
        message: 'Failed to fetch WGSL shader source.',
        detail: response.statusText,
      });
      return null;
    }
    return await response.text();
  } catch (err) {
    Diagnostics.warn({
      source: 'liteship/astro.gpu',
      code: 'wgsl-fetch-threw',
      message: 'Fetching WGSL shader source threw an error.',
      cause: err,
    });
    throw err;
  }
}

/**
 * Max bytes in the boundary uniform buffer. WGSL uniform buffers stride at 16
 * bytes; 64 holds `state_index` + the standard `u_time` (f32) / `u_resolution`
 * (vec2, 8-byte aligned) feeds + authored vec2/vec3/vec4 fields. Widen to
 * admit more authored fields.
 */
const UNIFORM_BUFFER_MAX_BYTES = 64;

/** Kind of a WGSL uniform field — drives both its buffer alignment and its write. */
type WgslUniformKind =
  'int' | 'float' | 'vec2' | 'vec3' | 'vec4' | 'ivec2' | 'ivec3' | 'ivec4' | 'uvec2' | 'uvec3' | 'uvec4';

/** WGSL struct fields the runtime auto-feeds every frame when declared with these exact names. */
const AUTO_FED_WGSL_UNIFORM_FIELDS = new Set(['u_time', 'u_resolution']);

/** WGSL struct field the compositor feeds on boundary crossings via `emit-wgsl`. */
const COMPOSITOR_FED_WGSL_UNIFORM_FIELDS = new Set(['state_index']);

/**
 * WGSL uniform-struct alignment + size (bytes) per type. Alignment is what a flat
 * `i*4` layout gets wrong: a `vec2<f32>` must sit on an 8-byte boundary and a
 * `vec3`/`vec4` on a 16-byte one, so `u_resolution: vec2<f32>` lands correctly.
 */
function wgslTypeInfo(
  type: string,
): { readonly align: number; readonly size: number; readonly kind: WgslUniformKind } | null {
  switch (type) {
    case 'u32':
    case 'i32':
      return { align: 4, size: 4, kind: 'int' };
    case 'f32':
      return { align: 4, size: 4, kind: 'float' };
    case 'vec2<f32>':
    case 'vec2f':
      return { align: 8, size: 8, kind: 'vec2' };
    case 'vec3<f32>':
    case 'vec3f':
      return { align: 16, size: 12, kind: 'vec3' };
    case 'vec4<f32>':
    case 'vec4f':
      return { align: 16, size: 16, kind: 'vec4' };
    case 'vec2i':
    case 'vec2<i32>':
      return { align: 8, size: 8, kind: 'ivec2' };
    case 'vec3i':
    case 'vec3<i32>':
      return { align: 16, size: 12, kind: 'ivec3' };
    case 'vec4i':
    case 'vec4<i32>':
      return { align: 16, size: 16, kind: 'ivec4' };
    case 'vec2<u32>':
    case 'vec2u':
      return { align: 8, size: 8, kind: 'uvec2' };
    case 'vec3<u32>':
    case 'vec3u':
      return { align: 16, size: 12, kind: 'uvec3' };
    case 'vec4<u32>':
    case 'vec4u':
      return { align: 16, size: 16, kind: 'uvec4' };
    case 'bool':
      Diagnostics.warnOnce({
        source: 'liteship/astro.gpu',
        code: 'wgsl-uniform-bool-unsupported',
        message:
          `WGSL uniform struct field type "bool" is not host-shareable in a uniform buffer; ` +
          `use u32 (0/1) instead. Field layout skipped.`,
      });
      return null;
    default:
      Diagnostics.warnOnce({
        source: 'liteship/astro.gpu',
        code: 'wgsl-uniform-type-unrecognized',
        message:
          `Unrecognized WGSL uniform struct field type "${type}"; ` +
          `field layout skipped until the type is supported.`,
      });
      return null;
  }
}

/**
 * Emit one `warnOnce` per declared uniform field that has no feed path: not
 * auto-fed (`u_time`/`u_resolution`), not compositor-fed (`state_index`), not
 * supplied in a `detail.wgsl` crossing, and not covered by a compiler preamble
 * (`declarations`) that binds the boundary's `@wgsl` values.
 */
function warnUnfedWgslUniformFields(
  layout: readonly WgslUniformField[],
  fedFields: ReadonlySet<string>,
  compilerIntegrated: boolean,
): void {
  if (compilerIntegrated) return;
  for (const field of layout) {
    if (fedFields.has(field.name)) continue;
    const renameHint =
      field.name === 'time'
        ? ' Rename to u_time for runtime auto-feed.'
        : field.name === 'resolution'
          ? ' Rename to u_resolution for runtime auto-feed.'
          : ' Supply it via liteship:uniform-update detail.wgsl, or use u_time / u_resolution for auto-feed.';
    Diagnostics.warnOnce({
      source: 'liteship/astro.gpu',
      code: 'wgsl-uniform-unfed',
      message: `WGSL uniform field "${field.name}" is declared but has no feed path.${renameHint}`,
    });
  }
}

/** Seed feed-path coverage from auto/compositor feeds plus any crossing payload keys. */
function collectFedWgslUniformFields(
  layout: readonly WgslUniformField[],
  wgsl?: Record<string, WgslUniformValue>,
): Set<string> {
  const fed = new Set<string>();
  for (const field of layout) {
    if (AUTO_FED_WGSL_UNIFORM_FIELDS.has(field.name)) fed.add(field.name);
    if (COMPOSITOR_FED_WGSL_UNIFORM_FIELDS.has(field.name)) fed.add(field.name);
  }
  if (wgsl) {
    for (const key of Object.keys(wgsl)) fed.add(key);
  }
  return fed;
}

/**
 * Live binding between the compositor's `detail.wgsl` map (bare snake_case field
 * names → scalar/vector values) and a WebGPU uniform buffer. `state_index` always occupies
 * slot 0; authored fields claim later slots in first-seen order so a stable
 * field gets a stable offset across crossings. Returns the bound buffer plus an
 * `apply` that writes a fresh `detail.wgsl` snapshot into it.
 */
export interface WgslUniformBinding {
  readonly buffer: WebGpuBuffer;
  readonly bindGroup: WebGpuBindGroup;
  /**
   * Write a uniform snapshot into the buffer. Scalar fields take a `number`;
   * vector fields (e.g. `u_resolution: vec2<f32>`) take a component array
   * (`[w, h]`). Fields the struct doesn't declare are ignored.
   */
  apply(values: Record<string, WgslUniformValue>): void;
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

function wgslStructLayout(type: string): { readonly align: number; readonly size: number } | null {
  const writable = wgslTypeInfo(type);
  if (writable) {
    return { align: writable.align, size: writable.size };
  }
  if (type === 'bool') {
    return { align: 4, size: 4 };
  }
  return null;
}

function createUniformBinding(
  device: WebGpuDevice,
  pipeline: WebGpuPipeline,
  layout: readonly WgslUniformField[],
): WgslUniformBinding {
  // The uniform-buffer layout is FIXED by the WGSL struct declaration (NOT
  // event-arrival order — that keeps a `{ scale }`-first crossing from writing
  // into `blur_radius`'s slot). Each field aligns up to its type's WGSL boundary,
  // so a vec2 `u_resolution` lands on its required 8-byte offset.
  const slots = new Map<string, { offset: number; kind: WgslUniformKind }>();
  let cursor = 0;
  for (const field of layout) {
    const layoutInfo = wgslStructLayout(field.type);
    if (!layoutInfo) continue;
    const info = wgslTypeInfo(field.type);
    const { align, size } = layoutInfo;
    const offset = Math.ceil(cursor / align) * align;
    if (offset + size > UNIFORM_BUFFER_MAX_BYTES) {
      // Struct outgrows the buffer — drop the overflowing field.
      Diagnostics.warnOnce({
        source: 'liteship/astro.gpu',
        code: 'wgsl-uniform-buffer-full',
        message:
          `WGSL uniform buffer holds ${UNIFORM_BUFFER_MAX_BYTES} bytes; field "${field.name}" overflows it. ` +
          `Fix: reduce @wgsl fields or widen UNIFORM_BUFFER_MAX_BYTES in wgpu.ts.`,
      });
      continue;
    }
    if (info) {
      slots.set(field.name, { offset, kind: info.kind });
    }
    cursor = offset + size;
  }
  // Uniform buffers stride at 16 bytes; round the struct size up to that.
  const bufferBytes = Math.max(16, Math.ceil(cursor / 16) * 16);

  const buffer = device.createBuffer({
    size: bufferBytes,
    usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer } }],
  });
  const data = new ArrayBuffer(bufferBytes);
  const bytes = new Uint8Array(data);
  const view = new DataView(data);

  return {
    buffer,
    bindGroup,
    apply(values: Record<string, WgslUniformValue>): void {
      // Fresh snapshot: zero the struct first so a field dropped by a later state
      // reverts to 0 instead of leaving the shader sampling a stale value.
      bytes.fill(0);
      for (const [field, value] of Object.entries(values)) {
        const slot = slots.get(field);
        if (!slot) continue; // not a declared struct field — ignore
        if (slot.kind === 'int') {
          view.setUint32(slot.offset, (value as number) >>> 0, true);
        } else if (slot.kind === 'float') {
          view.setFloat32(slot.offset, value as number, true);
        } else if (slot.kind === 'ivec2' || slot.kind === 'ivec3' || slot.kind === 'ivec4') {
          const comps = Array.isArray(value) ? value : [value as number];
          const count = slot.kind === 'ivec2' ? 2 : slot.kind === 'ivec3' ? 3 : 4;
          for (let c = 0; c < count && c < comps.length; c += 1) {
            view.setInt32(slot.offset + c * 4, comps[c]!, true);
          }
        } else if (slot.kind === 'uvec2' || slot.kind === 'uvec3' || slot.kind === 'uvec4') {
          const comps = Array.isArray(value) ? value : [value as number];
          const count = slot.kind === 'uvec2' ? 2 : slot.kind === 'uvec3' ? 3 : 4;
          for (let c = 0; c < count && c < comps.length; c += 1) {
            view.setUint32(slot.offset + c * 4, comps[c]! >>> 0, true);
          }
        } else {
          // vec2/vec3/vec4 f32: write the provided components (e.g. `[w, h]`).
          const comps = Array.isArray(value) ? value : [value as number];
          const count = slot.kind === 'vec2' ? 2 : slot.kind === 'vec3' ? 3 : 4;
          for (let c = 0; c < count && c < comps.length; c += 1) {
            view.setFloat32(slot.offset + c * 4, comps[c]!, true);
          }
        }
      }
      device.queue.writeBuffer(buffer, 0, bytes);
    },
  };
}

/**
 * Initialize a WebGPU render loop for a WGSL shader source.
 *
 * Subscribes `element` (when provided) to `liteship:uniform-update`: each event's
 * `detail.wgsl` (bare snake_case field → scalar/vector value, from the compositor's
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
  declarations?: string,
  integrity?: ShaderIntegrity | null,
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
  if (shaderSrc && isExternalShaderSource(shaderSrc)) {
    // External fetch: get the bytes, then VERIFY them against the author-pinned
    // SRI hash BEFORE they reach `device.createShaderModule`. The URL guard
    // (gpu.ts) already vetted the ORIGIN; this checks the CONTENT — so a tampered
    // shader from a compromised same-origin server / poisoned CDN cache cannot
    // reach the GPU. The verified bytes this returns are what `wgslSource`
    // becomes, so the value compiled has provably passed the integrity check (the
    // taint-breaking content sanitizer on the WGSL data path).
    //
    // A FETCH FAILURE produces NO content — there is nothing to verify, and the
    // built-in `FULLSCREEN_WGSL` (an INLINE shader the author themselves ships)
    // needs no integrity boundary. So a non-OK response / network throw degrades
    // to the built-in fallback (still rendering), exactly as before the integrity
    // feature. Integrity ONLY gates a SUCCESSFUL fetch's bytes — that is where a
    // tampered/compromised shader could enter; a failed fetch never can.
    let fetched: string | null;
    try {
      fetched = await fetchShaderSource(shaderSrc);
    } catch (err) {
      // DISCRIMINATE the network throw: `fetchShaderSource` already emitted the
      // `wgsl-fetch-threw` diagnostic (the failure is observable); we BIND `err`
      // and act on it explicitly — a failed fetch yields no bytes, so we keep the
      // built-in fallback shader (`wgslSource` stays FULLSCREEN_WGSL) and fall
      // through to compile it. Re-asserting the failure was logged makes the
      // swallow impossible: if a fetch error ever arrives unlogged (the upstream
      // warn removed), this comment + the bound `err` are the trace, and the
      // fallback is a deliberate, non-corrupting degradation — not a vanished error.
      fetched = null;
      Diagnostics.warnOnce({
        source: 'liteship/astro.gpu',
        code: 'wgsl-fetch-fallback-builtin',
        message:
          `WGSL shader fetch for "${shaderSrc}" threw (${String((err as { message?: string })?.message ?? err)}); ` +
          `falling back to the built-in fullscreen shader.`,
      });
    }
    if (fetched === null) {
      // Fetch FAILED (non-OK already logged `wgsl-fetch-failed`, or a throw logged
      // above). No bytes to verify — keep the built-in inline fallback (no
      // integrity boundary on author-shipped inline source) and compile it.
      wgslSource = FULLSCREEN_WGSL;
    } else {
      const verification = verifyShaderIntegrity(fetched, integrity ?? null);
      // Secure-by-default: a `mismatch` (tampered shader) always refuses; an
      // `absent` pin on an external fetch refuses under `required-for-external`.
      // Only a `verified` result proceeds — the value compiled has passed the
      // sanitizer. A REFUSAL here returns null (degrade): an unverified or
      // tampered SUCCESSFUL fetch must never reach the GPU, even as a fallback.
      if (!decideShaderIntegrity(verification, DEFAULT_SHADER_INTEGRITY_MODE).proceed) {
        if (verification._tag === 'mismatch') {
          Diagnostics.error({
            source: 'liteship/astro.gpu',
            code: 'wgsl-integrity-mismatch',
            message:
              `WGSL shader content integrity check FAILED for "${shaderSrc}" — the fetched bytes do not match the ` +
              `author-pinned hash (a tampered or compromised shader). Refusing to compile. ` +
              `expected sha256 ${verification.expectedHex}, got ${verification.actualHex}.`,
          });
        } else {
          Diagnostics.error({
            source: 'liteship/astro.gpu',
            code: 'wgsl-integrity-absent',
            message:
              `External WGSL shader "${shaderSrc}" was fetched with NO integrity hash. An unverified external ` +
              `shader cannot be loaded (secure-by-default). Refusing to compile. ` +
              `Fix: add a data-liteship-shader-integrity="sha256-<base64>" attribute pinning the shader content.`,
          });
        }
        return null;
      }
      // VERIFIED — compile the verified content (the taint-clean shader bytes).
      if (verification._tag !== 'verified') return null;
      wgslSource = verification.content;
    }
  } else if (shaderSrc) {
    // Inline WGSL source (no network fetch) — no integrity boundary to verify.
    wgslSource = shaderSrc;
  }
  // Prepend the compiler's emitted preamble (state consts + uniform struct +
  // `@group(0) @binding(0)`) so the authored WGSL can reference the compiler's
  // OWN struct without hand-typing it. Skip when the resolved source already
  // declares a `@group(0) @binding(0)` uniform (an author who wrote the full
  // struct, or our built-in fallback) — re-prepending would redeclare it.
  wgslSource = prependWgslDeclarations(wgslSource, declarations);
  // Bind a uniform group only when the shader declares a real `@group(0)
  // @binding(0) var<uniform>` struct (the FULLSCREEN_WGSL fallback and bare
  // shaders don't — unconditionally binding makes WebGPU reject the pass). The
  // parsed layout drives BOTH the binding decision and the field offsets/types.
  const uniformLayout = parseWgslUniformLayout(wgslSource);
  const hasUniformBinding = uniformLayout.length > 0;
  const compilerIntegrated = Boolean(declarations?.trim());
  let fedUniformFields = collectFedWgslUniformFields(uniformLayout);
  warnUnfedWgslUniformFields(uniformLayout, fedUniformFields, compilerIntegrated);
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
        source: 'liteship/astro.gpu',
        code: 'wgsl-uniform-bindgroup-invalid',
        message:
          `WGSL @group(0) @binding(0) is not a buffer-compatible uniform; rendering without live uniforms. ` +
          String((cause as { message?: string })?.message ?? cause),
      });
    }
  }

  // Standard-uniform AUTO-FEED, at parity with the GLSL path (gpu.ts:498): a
  // hand-authored WGSL shader that declares `u_time` (monotonic elapsed-seconds
  // clock) and/or `u_resolution` (vec2 canvas dimensions) gets them fed EVERY
  // frame, not just on boundary crossings — the gap that left hand-authored WGSL
  // animations frozen and resolution dead. (`u_state` is already fed via the
  // compiler's `state_index`.)
  const feedsStandard = uniformLayout.some((field) => field.name === 'u_time' || field.name === 'u_resolution');
  const startTime = systemClock.now();
  // The latest boundary-crossing signal snapshot. Animated shaders merge it with
  // the per-frame clock so the time feed never clobbers signal fields.
  let latestSignal: Record<string, WgslUniformValue> = {};

  // Subscribe to boundary crossings: map detail.wgsl → uniform buffer. The rAF
  // loop already redraws every frame, so writing the buffer here is enough — the
  // next frame samples the new values (no manual re-render needed).
  const onUniformUpdate = (event: Event): void => {
    /* v8 ignore next — `liteship:uniform-update` is always dispatched via `new CustomEvent(...)`;
       the guard narrows the generic `Event` parameter for TypeScript's typed `.detail` access. */
    if (!(event instanceof CustomEvent)) return;
    const wgsl = event.detail?.wgsl as Record<string, WgslUniformValue> | undefined;
    if (wgsl) {
      latestSignal = wgsl;
      fedUniformFields = collectFedWgslUniformFields(uniformLayout, wgsl);
      warnUnfedWgslUniformFields(uniformLayout, fedUniformFields, compilerIntegrated);
      // Static shaders apply on the crossing (unchanged). Standard-uniform shaders
      // apply per-frame in the render loop, so the event only refreshes the snapshot.
      if (!feedsStandard) binding?.apply(wgsl);
    }
  };
  element?.addEventListener('liteship:uniform-update', onUniformUpdate);

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

    // Standard-uniform shaders: feed the monotonic clock + canvas dimensions every
    // frame, merged with the latest signal snapshot. apply() ignores a standard
    // uniform the struct doesn't declare, so the merge is harmless.
    if (feedsStandard && binding) {
      binding.apply({
        ...latestSignal,
        u_time: (systemClock.now() - startTime) / 1000,
        u_resolution: [w, h] as const,
      });
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
    element?.removeEventListener('liteship:uniform-update', onUniformUpdate);
  };
}

/** Log once when WebGPU is unavailable for a WGSL directive. */
export function warnWebGpuUnavailable(): void {
  Diagnostics.warnOnce({
    source: 'liteship/astro.gpu',
    code: 'webgpu-unavailable',
    message: 'WebGPU is unavailable; WGSL directives cannot render in-browser.',
  });
}

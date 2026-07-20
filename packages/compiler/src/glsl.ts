/**
 * GLSL Compiler -- `BoundaryDef` to uniform declarations + `bindUniforms()` helper.
 *
 * Generates GLSL preamble code with:
 *   - `#define` statements for state indices (`STATE_MOBILE 0`, etc.)
 *   - `uniform` declarations for each value key
 *   - A JS helper function string for binding uniform values to WebGL
 *
 * @module
 */

import type { Boundary, StateUnion } from '@liteship/core';
import { glslIdent } from '@liteship/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** GLSL scalar, vector, matrix, or sampler type used in a uniform declaration. */
export type GLSLType =
  | 'float'
  | 'int'
  | 'uint'
  | 'bool'
  | 'vec2'
  | 'vec3'
  | 'vec4'
  | 'ivec2'
  | 'ivec3'
  | 'ivec4'
  | 'mat2'
  | 'mat3'
  | 'mat4'
  | 'sampler2D'
  | 'samplerCube';

/** A single GLSL uniform declaration produced by {@link GLSLCompiler.compile}. */
export interface GLSLUniform {
  /** Uniform name (prefixed `u_`, snake-case). */
  readonly name: string;
  /** Inferred GLSL type; float when any state value is non-integer or negative. */
  readonly type: GLSLType;
  /** Optional inline comment emitted alongside the declaration. */
  readonly comment?: string;
}

/** A single GLSL `#define` produced by {@link GLSLCompiler.compile}. */
export interface GLSLDefine {
  /** Macro name (`STATE_*` or `STATE_COUNT`). */
  readonly name: string;
  /** Macro value (always numeric, serialized as a string). */
  readonly value: string;
  /** Optional inline comment emitted alongside the `#define`. */
  readonly comment?: string;
}

/**
 * Output of {@link GLSLCompiler.compile}.
 *
 * `declarations` is the complete preamble block ready to prepend to a
 * shader; `bindUniforms` is a `function bindUniforms(gl, program, values)`
 * stringified helper that routes the values map into `uniform*` calls.
 */
export interface GLSLCompileResult {
  /** State-index `#define`s. */
  readonly defines: readonly GLSLDefine[];
  /** Uniform declarations, including the `u_state` index uniform. */
  readonly uniforms: readonly GLSLUniform[];
  /** Default uniform values keyed by uniform name (from the last state's values). */
  readonly uniformValues: Record<string, number>;
  /**
   * Per-state uniform values keyed by state name then `u_*` uniform name. Unlike
   * the flat {@link uniformValues} default (last-state-wins), this preserves
   * every state's authored values so the live runtime can resolve
   * `stateUniforms[currentState]` and update uniforms on each boundary crossing
   * — the GLSL analog of `ARIACompileResult.stateAttributes`.
   */
  readonly stateUniforms: Record<string, Record<string, number>>;
  /** Pre-serialized `#define` + `uniform` declarations block. */
  readonly declarations: string;
  /** Stringified `bindUniforms(gl, program, values)` helper. */
  readonly bindUniforms: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a JS camelCase or kebab-case name to a GLSL-friendly uniform name.
 * Delegates to the shared {@link glslIdent} in `@liteship/core` so the build-time
 * uniform declarations and the runtime projection vocabulary cannot diverge.
 */
function toUniformName(key: string): string {
  return glslIdent(key);
}

/**
 * Convert a state name to a GLSL #define name.
 * STATE_MOBILE, STATE_TABLET, etc.
 */
function toDefineName(stateName: string): string {
  return `STATE_${stateName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
}

/**
 * Infer a stable GLSL type from ALL values across ALL states.
 * If ANY value is a float (or negative), the uniform must be float
 * to avoid precision loss from narrowing to int.
 *
 * Negative integers are promoted to float to avoid GLSL sign-extension issues on
 * some mobile GPUs (Adreno, Mali). Safer to use float uniformly.
 */
function inferStableGLSLType(allValues: readonly number[]): GLSLType {
  return allValues.some((v) => !Number.isInteger(v) || v < 0) ? 'float' : 'int';
}

function appendComment(line: string, comment: string): string {
  return `${line} // ${comment}`;
}

// ---------------------------------------------------------------------------
// GLSLCompiler
// ---------------------------------------------------------------------------

/**
 * Compile a boundary definition and per-state numeric value maps into
 * GLSL `#define` statements, `uniform` declarations, and a `bindUniforms`
 * helper function string.
 *
 * @example
 * ```ts
 * import { defineBoundary } from '@liteship/core';
 * import { GLSLCompiler } from '@liteship/compiler';
 *
 * const boundary = defineBoundary({
 *   input: 'width',
 *   at: [[0, 'mobile'], [768, 'desktop']],
 * });
 * const result = GLSLCompiler.compile(boundary, {
 *   mobile: { blur: 0.5, brightness: 1.0 },
 *   desktop: { blur: 0.0, brightness: 1.2 },
 * });
 * console.log(result.declarations);
 * // #define STATE_MOBILE 0
 * // #define STATE_DESKTOP 1
 * // uniform int u_state;
 * // uniform float u_blur;
 * // uniform float u_brightness;
 * ```
 *
 * @param boundary - The boundary definition with states
 * @param states   - Per-state numeric value maps
 * @returns A {@link GLSLCompileResult} with defines, uniforms, and helper code
 */
function compile<B extends Boundary>(
  boundary: B,
  states: { [S in StateUnion<B> & string]: Record<string, number> },
): GLSLCompileResult {
  // Reinterpret the runtime tuple as the keyed state-name array so each element
  // is a valid index into `states` without per-site casts.
  const stateNames: ReadonlyArray<StateUnion<B> & string> = boundary.states as ReadonlyArray<StateUnion<B> & string>;

  // Build #define statements for state indices
  const defines: GLSLDefine[] = stateNames.map((name, index) => ({
    name: toDefineName(name),
    value: String(index),
    comment: `State index for '${name}'`,
  }));

  // Add a define for the current state uniform
  defines.push({
    name: 'STATE_COUNT',
    value: String(stateNames.length),
    comment: 'Total number of states',
  });

  // Collect all unique value keys across all states
  const allKeys = new Set<string>();
  // NULL-PROTO: keyed by author-controlled uniform names; a name that folds to
  // `__proto__`/`constructor` must land as an OWN property, never a prototype
  // write that drops it from `uniformValues`. Mirrors `stateUniforms` below.
  const mergedValues: Record<string, number> = Object.create(null);
  // Per-state uniform values keyed by state name then `u_*` name. Preserved
  // alongside the flat `mergedValues` default so the live runtime can resolve
  // the authored values for whichever state a crossing lands on.
  // Null-prototype: state names are author-controlled, so a state literally named
  // `__proto__`/`constructor` must not collide with Object.prototype and corrupt
  // the per-state lookup.
  const stateUniforms: Record<string, Record<string, number>> = Object.create(null);

  for (const stateName of stateNames) {
    const stateValues = states[stateName];
    if (!stateValues) continue;
    // NULL-PROTO: keyed by author-controlled uniform names (see mergedValues above).
    const perState: Record<string, number> = Object.create(null);
    for (const [key, val] of Object.entries(stateValues)) {
      allKeys.add(key);
      const uniformName = toUniformName(key);
      // Use the last state's values as defaults for the uniform values map
      mergedValues[uniformName] = val;
      perState[uniformName] = val;
    }
    stateUniforms[stateName] = perState;
  }

  // Complete every per-state map: a uniform authored in some states but omitted
  // in others must be explicitly RESET (0) on entering a state that omits it.
  // WebGL uniforms persist, so a partial `detail.glsl` would leave the shader
  // sampling the prior state's value (a stale-GPU-state bug). WGSL gets this for
  // free via the per-snapshot buffer clear; GLSL sets uniforms individually, so
  // the map itself must carry the full uniform set for every state.
  const allUniformNames = [...allKeys].map(toUniformName);
  for (const stateName of stateNames) {
    const perState = stateUniforms[stateName];
    if (!perState) continue;
    for (const uniformName of allUniformNames) {
      if (!(uniformName in perState)) perState[uniformName] = 0;
    }
  }

  // Build uniform declarations
  const uniforms: GLSLUniform[] = [{ name: 'u_state', type: 'int', comment: 'Current state index' }];

  for (const key of allKeys) {
    // Collect ALL values for this key across every state, then pick the widest type
    const valuesForKey: number[] = [];
    for (const stateName of stateNames) {
      const stateValues = states[stateName];
      if (stateValues && key in stateValues) {
        valuesForKey.push(stateValues[key]!);
      }
    }
    // allKeys only contains keys observed in at least one state map.
    const glslType = inferStableGLSLType(valuesForKey);
    uniforms.push({
      name: toUniformName(key),
      type: glslType,
      comment: `Boundary value for '${key}'`,
    });
  }

  // Add u_state to merged values
  mergedValues['u_state'] = 0;

  // Build declaration strings
  const defineLines = defines.map((d) => appendComment(`#define ${d.name} ${d.value}`, d.comment!));

  const uniformLines = uniforms.map((u) => appendComment(`uniform ${u.type} ${u.name};`, u.comment!));

  const declarations = [...defineLines, '', ...uniformLines].join('\n');

  // Build the bindUniforms helper function string
  const bindBody = uniforms.map((u) => {
    const setter = u.type === 'int' || u.type === 'uint' || u.type === 'bool' ? 'uniform1i' : 'uniform1f';
    return `  gl.${setter}(gl.getUniformLocation(program, '${u.name}'), values['${u.name}']);`;
  });

  const bindUniforms = ['function bindUniforms(gl, program, values) {', ...bindBody, '}'].join('\n');

  return { defines, uniforms, uniformValues: mergedValues, stateUniforms, declarations, bindUniforms };
}

/**
 * Serialize a {@link GLSLCompileResult} into a full GLSL preamble string
 * including declarations and the `bindUniforms` helper.
 *
 * @example
 * ```ts
 * import { GLSLCompiler } from '@liteship/compiler';
 *
 * const result = GLSLCompiler.compile(boundary, states);
 * const glsl = GLSLCompiler.serialize(result);
 * // Prepend to your fragment shader source
 * const shaderSource = glsl + '\n' + mainShaderCode;
 * ```
 *
 * @param result - The compile result to serialize
 * @returns A GLSL preamble string
 */
function serialize(result: GLSLCompileResult): string {
  return [
    '// === liteship GLSL Preamble ===',
    result.declarations,
    '',
    '// === Bind Uniforms Helper ===',
    result.bindUniforms,
  ].join('\n');
}

/**
 * GLSL compiler namespace.
 *
 * Compiles boundary definitions into GLSL shader preambles containing
 * `#define` state constants, `uniform` declarations, and a JavaScript
 * `bindUniforms()` helper for setting uniform values via WebGL.
 *
 * @example
 * ```ts
 * import { defineBoundary } from '@liteship/core';
 * import { GLSLCompiler } from '@liteship/compiler';
 *
 * const boundary = defineBoundary({
 *   input: 'width',
 *   at: [[0, 'sm'], [768, 'lg']],
 * });
 * const result = GLSLCompiler.compile(boundary, {
 *   sm: { intensity: 0.5 }, lg: { intensity: 1.0 },
 * });
 * const preamble = GLSLCompiler.serialize(result);
 * ```
 */
export const GLSLCompiler = { compile, serialize } as const;

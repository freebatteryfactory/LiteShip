/**
 * WGSL Compiler -- `BoundaryDef` to struct definitions + `@group`/`@binding` declarations.
 *
 * Generates WebGPU Shading Language code from boundary definitions,
 * mapping JS scalar/vector values to WGSL types and producing struct layouts
 * suitable for uniform buffer bindings.
 *
 * @module
 */

import type { Boundary, StateUnion } from '@liteship/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** WGSL scalar, vector, or matrix primitive type. */
export type WGSLType =
  | 'f32'
  | 'i32'
  | 'u32'
  | 'bool'
  | 'vec2f'
  | 'vec3f'
  | 'vec4f'
  | 'vec2i'
  | 'vec3i'
  | 'vec4i'
  | 'mat2x2f'
  | 'mat3x3f'
  | 'mat4x4f';

/** A binding's type is either a WGSL primitive type or a user-declared struct name. */
export type WGSLBindingType = WGSLType | string;

/** JSON-safe authored WGSL vector value. */
export type WGSLUniformVector =
  readonly [number, number] | readonly [number, number, number] | readonly [number, number, number, number];

/** JSON-safe authored WGSL uniform value. */
export type WGSLUniformValue = number | WGSLUniformVector;

/** A single `@group(G) @binding(B) var<uniform> …` declaration. */
export interface WGSLBinding {
  /** Bind group index. */
  readonly group: number;
  /** Binding index within the group. */
  readonly binding: number;
  /** Binding variable name. */
  readonly name: string;
  /** Resolved primitive or struct type. */
  readonly type: WGSLBindingType;
}

/** A WGSL `struct { … }` definition produced by {@link WGSLCompiler.compile}. */
export interface WGSLStruct {
  /** Struct identifier (PascalCase, suffixed `State`). */
  readonly name: string;
  /** Ordered fields; the first is always `state_index: u32`. */
  readonly fields: readonly { readonly name: string; readonly type: WGSLType }[];
}

/**
 * Output of {@link WGSLCompiler.compile}.
 *
 * `declarations` is the ready-to-prepend WGSL preamble containing state
 * constants, the uniform struct, and its binding declaration.
 */
export interface WGSLCompileResult {
  /** Declared struct types (currently one: the boundary's state struct). */
  readonly structs: readonly WGSLStruct[];
  /** Uniform buffer bindings. */
  readonly bindings: readonly WGSLBinding[];
  /** Default field values keyed by WGSL field name. */
  readonly bindingValues: Record<string, WGSLUniformValue>;
  /**
   * Per-state binding values keyed by state name then snake_case field name —
   * the WGSL analog of `GLSLCompileResult.stateUniforms`. Built alongside the
   * merged `bindingValues` so the live runtime can resolve
   * `stateBindings[currentState]` and update struct fields on each crossing.
   */
  readonly stateBindings: Record<string, Record<string, WGSLUniformValue>>;
  /** Pre-serialized WGSL preamble string. */
  readonly declarations: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a JS key name to a WGSL-friendly field name (snake_case).
 */
function toFieldName(key: string): string {
  return key
    .replace(/-/g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Infer a stable WGSL type from a collection of values for a single field.
 * Vector values promote to a f32 vector wide enough for every authored state;
 * scalar values promote to f32 if any value is a float, to i32 if any value is
 * negative, otherwise u32. This ensures type consistency across all states.
 */
function inferStableWGSLType(values: readonly WGSLUniformValue[]): WGSLType {
  let vectorLength = 0;
  for (const value of values) {
    if (Array.isArray(value)) {
      vectorLength = Math.max(vectorLength, value.length);
    }
  }
  if (vectorLength > 0) {
    if (vectorLength <= 2) return 'vec2f';
    if (vectorLength === 3) return 'vec3f';
    return 'vec4f';
  }
  const scalars = values as readonly number[];
  if (scalars.some((v) => !Number.isInteger(v))) return 'f32';
  if (scalars.some((v) => v < 0)) return 'i32';
  return 'u32';
}

/**
 * Convert a boundary input name to a valid WGSL struct name.
 * PascalCase with "State" suffix.
 */
function toStructName(input: string): string {
  const pascal = input
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
  return `${pascal}State`;
}

// ---------------------------------------------------------------------------
// WGSLCompiler
// ---------------------------------------------------------------------------

/**
 * Compile a boundary definition and per-state scalar/vector value maps into
 * WGSL struct definitions, `@group/@binding` declarations, and state constants.
 *
 * @example
 * ```ts
 * import { Boundary } from '@liteship/core';
 * import { WGSLCompiler } from '@liteship/compiler';
 *
 * const boundary = Boundary.make({
 *   input: 'viewport',
 *   at: [[0, 'mobile'], [768, 'desktop']],
 * });
 * const result = WGSLCompiler.compile(boundary, {
 *   mobile: { blur_radius: 2.0, scale: 0.5 },
 *   desktop: { blur_radius: 0.0, scale: 1.0 },
 * });
 * console.log(result.declarations);
 * // struct ViewportState { state_index: u32, blur_radius: f32, scale: f32 }
 * // @group(0) @binding(0) var<uniform> boundary_state: ViewportState;
 * ```
 *
 * @param boundary - The boundary definition with states
 * @param states   - Per-state scalar/vector value maps
 * @returns A {@link WGSLCompileResult} with structs, bindings, and declarations
 */
function compile<B extends Boundary.Shape>(
  boundary: B,
  states: { [S in StateUnion<B> & string]: Record<string, WGSLUniformValue> },
): WGSLCompileResult {
  // Reinterpret the runtime tuple as the keyed state-name array so each element
  // is a valid index into `states` without per-site casts.
  const stateNames: ReadonlyArray<StateUnion<B> & string> = boundary.states as ReadonlyArray<StateUnion<B> & string>;
  const structName = toStructName(boundary.input);

  // Pass 1: collect all values per field across all states, plus the per-state
  // map (the WGSL analog of GLSL's stateUniforms). NULL-PROTO throughout: BOTH
  // state names AND field names are author-controlled, and a field that folds to
  // `__proto__`/`constructor` (snakeFold leaves an already-snake `__proto__`
  // unchanged) must land as an OWN property. `mergedValues` and each `perState`
  // are keyed by FIELD name, so they need it as much as the state-keyed
  // `stateBindings` — a plain `{}` would silently drop a `__proto__`-named field
  // (prototype write → `Object.keys` empty), losing the binding entirely.
  const fieldValues = new Map<string, WGSLUniformValue[]>();
  const mergedValues: Record<string, WGSLUniformValue> = Object.create(null);
  const stateBindings: Record<string, Record<string, WGSLUniformValue>> = Object.create(null);

  for (const stateName of stateNames) {
    const stateValues = states[stateName];
    if (!stateValues) continue;
    const perState: Record<string, WGSLUniformValue> = Object.create(null);
    for (const [key, val] of Object.entries(stateValues)) {
      const fieldName = toFieldName(key);
      if (!fieldValues.has(fieldName)) fieldValues.set(fieldName, []);
      fieldValues.get(fieldName)!.push(val);
      mergedValues[fieldName] = val;
      perState[fieldName] = val;
    }
    stateBindings[stateName] = perState;
  }

  // Always include a state_index field
  const fields: { readonly name: string; readonly type: WGSLType }[] = [{ name: 'state_index', type: 'u32' }];
  mergedValues['state_index'] = 0;

  // Pass 2: determine stable type per field using all observed values
  for (const [name, values] of fieldValues) {
    fields.push({ name, type: inferStableWGSLType(values) });
  }

  const structs: WGSLStruct[] = [{ name: structName, fields }];

  // Create a single binding for the uniform buffer
  const bindings: WGSLBinding[] = [{ group: 0, binding: 0, name: 'boundary_state', type: structName }];

  // Generate declaration strings
  const structDecl = [
    `struct ${structName} {`,
    ...fields.map((f, i) => {
      const comma = i < fields.length - 1 ? ',' : '';
      return `  ${f.name}: ${f.type}${comma}`;
    }),
    '}',
  ].join('\n');

  const bindingDecl = `@group(0) @binding(0) var<uniform> boundary_state: ${structName};`;

  // State constant declarations
  const stateConsts = stateNames.map(
    (name, idx) => `const STATE_${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}: u32 = ${idx}u;`,
  );

  const declarations = [
    '// === liteship WGSL Boundary State ===',
    '',
    ...stateConsts,
    `const STATE_COUNT: u32 = ${stateNames.length}u;`,
    '',
    structDecl,
    '',
    bindingDecl,
  ].join('\n');

  return { structs, bindings, bindingValues: mergedValues, stateBindings, declarations };
}

/**
 * Serialize a {@link WGSLCompileResult} into a WGSL declaration string.
 *
 * @example
 * ```ts
 * import { WGSLCompiler } from '@liteship/compiler';
 *
 * const result = WGSLCompiler.compile(boundary, states);
 * const wgsl = WGSLCompiler.serialize(result);
 * // Prepend to your compute/render shader
 * ```
 *
 * @param result - The compile result to serialize
 * @returns A WGSL declaration string
 */
function serialize(result: WGSLCompileResult): string {
  return result.declarations;
}

/**
 * WGSL compiler namespace.
 *
 * Compiles boundary definitions into WebGPU Shading Language code: struct
 * layouts for uniform buffers, `@group/@binding` declarations, and `const`
 * state index values.
 *
 * @example
 * ```ts
 * import { Boundary } from '@liteship/core';
 * import { WGSLCompiler } from '@liteship/compiler';
 *
 * const boundary = Boundary.make({
 *   input: 'viewport',
 *   at: [[0, 'sm'], [768, 'lg']],
 * });
 * const result = WGSLCompiler.compile(boundary, {
 *   sm: { radius: 4 }, lg: { radius: 12 },
 * });
 * const wgsl = WGSLCompiler.serialize(result);
 * ```
 */
export const WGSLCompiler = { compile, serialize } as const;

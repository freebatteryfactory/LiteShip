/**
 * Compiler dispatch — tagged CompilerDef discriminated union.
 *
 * Zero `unknown`, zero `as` casts. The `switch` ends in an `assertNever`
 * exhaustiveness guard: TypeScript enforces that every arm is handled at
 * compile time (a new arm without a case is a type error), and a value that
 * escapes the static type at runtime fails as a typed `InvariantViolationError`.
 */

import type { Boundary, Config } from '@czap/core';
import type { CSSCompileResult, CSSStateInput } from './css.js';
import type { GLSLCompileResult } from './glsl.js';
import type { WGSLCompileResult, WGSLUniformValue } from './wgsl.js';
import type { ARIACompileResult } from './aria.js';
import type { AIManifestCompileResult, AIManifestInput } from './ai-manifest.js';
import { assertNever } from '@czap/error';
import { CSSCompiler } from './css.js';
import { GLSLCompiler } from './glsl.js';
import { WGSLCompiler } from './wgsl.js';
import { ARIACompiler } from './aria.js';
import { AIManifestCompiler } from './ai-manifest.js';
import { MotionCompiler } from './motion.js';
import type { MotionCompileInput, MotionCompileResult } from './motion.js';

// ─────────────────────────────────────────────────────────────────────────────
// Compiler-specific state types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-state CSS inputs keyed by state name: each value is either a flat
 * property map or a structured {@link CSSStateBody} carrying nested selector
 * rules — exactly what {@link CSSCompiler.compile} accepts (so `dispatch` can
 * faithfully replace a direct compile call, including the manifest's body form).
 */
export type CSSStates = Readonly<Record<string, CSSStateInput>>;
/** Per-state GLSL uniform values keyed by state name (numeric only). */
export type GLSLStates = Readonly<Record<string, Readonly<Record<string, number>>>>;
/** Per-state WGSL uniform values keyed by state name (scalar or vec2/3/4). */
export type WGSLStates = Readonly<Record<string, Readonly<Record<string, WGSLUniformValue>>>>;

/**
 * ARIA compile input — per-state attribute map plus the currently-active state.
 *
 * The compiler emits the attributes for `currentState` (not all states) to
 * avoid flooding the DOM with unused `aria-*` values.
 */
export interface ARIAStates {
  /** Per-state ARIA attribute maps keyed by state name. */
  readonly states: Record<string, Record<string, string>>;
  /** Name of the state whose ARIA attributes should be emitted; defaults to the boundary's first state. */
  readonly currentState?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config compiler output
// ─────────────────────────────────────────────────────────────────────────────

/** Result of the `ConfigCompiler` arm — pretty-printed JSON of a `czap.config`. */
export interface ConfigTemplateResult {
  /** Pretty-printed JSON string (2-space indent). */
  readonly json: string;
}

const ConfigTemplateCompiler = {
  compile(config: Config.Shape): ConfigTemplateResult {
    return { json: JSON.stringify(config, null, 2) };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CompilerDef — tagged discriminated union
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tagged discriminated union describing a single compilation request.
 *
 * Every arm carries exactly the inputs its target needs; {@link dispatch}
 * switches on `_tag` and closes with an `assertNever` guard, so TypeScript
 * guarantees exhaustiveness and no runtime `unknown`/`as` casts are required.
 *
 * Arms:
 * - `CSSCompiler`    — boundary + per-state CSS property maps → `@container` rules.
 *                      Bare properties target `selector` (default `.czap-boundary`).
 * - `GLSLCompiler`   — boundary + per-state numeric uniforms → GLSL uniform block.
 * - `WGSLCompiler`   — boundary + per-state scalar/vector uniforms → WGSL bindings.
 * - `ARIACompiler`   — boundary + per-state attribute maps + active state → ARIA attributes.
 * - `AICompiler`     — an {@link AIManifestInput} → tool-call-ready manifest JSON.
 * - `ConfigCompiler` — a `Config.Shape` → pretty-printed JSON template.
 * - `MotionCompiler`  — a {@link CssMotionPlan} → `@property` / `@keyframes` / transitions.
 */
export type CompilerDef =
  | {
      readonly _tag: 'CSSCompiler';
      readonly boundary: Boundary.Shape;
      readonly states: CSSStates;
      /** CSS selector for bare properties; defaults to `.czap-boundary`. */
      readonly selector?: string;
    }
  | { readonly _tag: 'GLSLCompiler'; readonly boundary: Boundary.Shape; readonly states: GLSLStates }
  | { readonly _tag: 'WGSLCompiler'; readonly boundary: Boundary.Shape; readonly states: WGSLStates }
  | { readonly _tag: 'ARIACompiler'; readonly boundary: Boundary.Shape; readonly states: ARIAStates }
  | { readonly _tag: 'AICompiler'; readonly manifest: AIManifestInput }
  | { readonly _tag: 'ConfigCompiler'; readonly config: Config.Shape }
  | { readonly _tag: 'MotionCompiler'; readonly input: MotionCompileInput };

// ─────────────────────────────────────────────────────────────────────────────
// CompileResult — discriminated by target string
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tagged compile output returned by {@link dispatch}.
 *
 * `target` discriminates the `result` payload so callers can narrow without
 * casts. The mapping is 1:1 with the arms of {@link CompilerDef}.
 */
export type CompileResult =
  | { readonly target: 'css'; readonly result: CSSCompileResult }
  | { readonly target: 'glsl'; readonly result: GLSLCompileResult }
  | { readonly target: 'wgsl'; readonly result: WGSLCompileResult }
  | { readonly target: 'aria'; readonly result: ARIACompileResult }
  | { readonly target: 'ai'; readonly result: AIManifestCompileResult }
  | { readonly target: 'config'; readonly result: ConfigTemplateResult }
  | { readonly target: 'motion'; readonly result: MotionCompileResult };

// ─────────────────────────────────────────────────────────────────────────────
// Dispatch
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dispatch a {@link CompilerDef} to the matching compiler and return a
 * tagged {@link CompileResult}.
 *
 * This is the single public entry point for multi-target compilation.
 * The switch ends in an `assertNever` exhaustiveness guard; adding a new arm
 * to {@link CompilerDef} without a matching case produces a type error here.
 *
 * @example
 * ```ts
 * import { Boundary } from '@czap/core';
 * import { dispatch } from '@czap/compiler';
 *
 * const boundary = Boundary.make({
 *   input: 'width',
 *   at: [[0, 'sm'], [768, 'lg']],
 * });
 * const result = dispatch({
 *   _tag: 'CSSCompiler',
 *   boundary,
 *   states: { sm: { 'font-size': '14px' }, lg: { 'font-size': '18px' } },
 * });
 * if (result.target === 'css') {
 *   console.log(result.result.raw); // emitted @container rules
 * }
 * ```
 *
 * @param def - The compiler definition arm to dispatch
 * @returns A {@link CompileResult} tagged by target
 */
export function dispatch(def: CompilerDef): CompileResult {
  switch (def._tag) {
    case 'CSSCompiler':
      return { target: 'css', result: CSSCompiler.compile(def.boundary, def.states, def.selector) };
    case 'GLSLCompiler':
      return { target: 'glsl', result: GLSLCompiler.compile(def.boundary, def.states) };
    case 'WGSLCompiler':
      return { target: 'wgsl', result: WGSLCompiler.compile(def.boundary, def.states) };
    case 'ARIACompiler':
      return {
        target: 'aria',
        // Boundary.make guarantees a non-empty states tuple, so states[0] is the canonical initial state.
        result: ARIACompiler.compile(
          def.boundary,
          def.states.states,
          def.states.currentState ?? def.boundary.states[0],
        ),
      };
    case 'AICompiler':
      // Framework projection target, producer downstream: like the cast/signal
      // arms, `AICompiler` is the *projection* half of a producer/reader pair —
      // it compiles a graph→AIContext/tool-schema projection, but the live
      // producer that authors the source graph (the host's AI authority) lives
      // downstream, not in LiteShip. It is genuinely distinct from the shader
      // casts (routing a producer through it would break the topology laws + the
      // typed `CompilerDef` union + the published surface), so it is annotated —
      // NOT retired — and audits should read this arm as readers-await-producer
      // substrate, not dead code.
      return { target: 'ai', result: AIManifestCompiler.compile(def.manifest) };
    case 'ConfigCompiler':
      return { target: 'config', result: ConfigTemplateCompiler.compile(def.config) };
    case 'MotionCompiler':
      return { target: 'motion', result: MotionCompiler.compile(def.input) };
    default:
      // Statement-level exhaustiveness guard (the twin of the type-level
      // narrowing above): every arm is handled, so `def` is `never` here and
      // this compiles. Add a `CompilerDef` arm without a matching case and
      // tsc rejects this call (TS2345); if bad external data ever reaches it
      // at runtime, it throws a typed `InvariantViolationError`, never a
      // silent fall-through to `undefined`.
      return assertNever(def, 'CompilerDef._tag');
  }
}

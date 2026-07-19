/**
 * BoundaryDef -- the core primitive of constraint-based adaptive rendering.
 *
 * A boundary defines quantization: how a continuous signal value maps
 * to a discrete set of named states. Content-addressed via FNV-1a.
 *
 * @module
 */

import type { SignalInput, ThresholdValue, ContentAddress } from './brands.js';
import { SignalInput as mkSignalInput, ThresholdValue as mkThresholdValue } from './brands.js';
import { CanonicalCbor } from './cbor.js';
import { fnv1aBytes } from './fnv.js';
import { rawIndexF32 } from './boundary-f32.js';
import { WASMDispatch } from './wasm-dispatch.js';
import { WASM_BATCH_MAX } from './defaults.js';
import { Diagnostics } from './diagnostics.js';
import { inputToSource } from './signal-input.js';
import { wallClock } from './clock.js';
import type { EvaluateResult } from './type-utils.js';
import { ValidationError } from '@liteship/error';

/** The core primitive. Source of truth for quantization boundaries. */
interface BoundaryDef<
  I extends string = string,
  S extends readonly [string, ...string[]] = readonly [string, ...string[]],
> {
  readonly _tag: 'BoundaryDef';
  readonly _version: 1;
  readonly id: ContentAddress;
  readonly input: SignalInput<I>;
  readonly thresholds: readonly ThresholdValue[];
  readonly states: S;
  readonly hysteresis?: number;
  readonly spec?: BoundarySpec;
}

interface BoundaryFactory {
  make<I extends string, const S extends readonly [string, ...string[]]>(config: {
    readonly input: I;
    readonly at: { readonly [K in keyof S]: readonly [number, S[K]] };
    readonly hysteresis?: number;
    readonly spec?: BoundarySpec;
  }): BoundaryDef<I, S>;
}

/**
 * Compute the content address for a boundary synchronously.
 * FNV-1a hash of the RFC 8949 §4.2.1 canonical CBOR encoding (ADR-0003).
 * Cross-machine stable: identical definitions produce byte-identical IDs.
 */
function deterministicId(
  input: string,
  thresholds: readonly number[],
  states: readonly string[],
  hysteresis?: number,
  spec?: BoundarySpec,
): ContentAddress {
  return fnv1aBytes(
    CanonicalCbor.encode({
      _tag: 'BoundaryDef',
      _version: 1,
      input,
      thresholds,
      states,
      hysteresis: hysteresis ?? null,
      spec: spec ?? null,
    }),
  );
}

/**
 * Evaluate which state a value falls into given a boundary.
 *
 * The cheap face of evaluation: returns just the resolved state name via the
 * single f32-canonical {@link rawIndexF32} kernel (no hysteresis, no crossing
 * detection). For the rich `{state, index, value, crossed}` result — and for
 * hysteresis — use {@link _evaluateResult}.
 *
 * @example
 * ```ts
 * const bp = Boundary.make({ input: 'viewport.width', at: [[0, 'sm'], [768, 'md'], [1024, 'lg']] });
 * const state = Boundary.evaluate(bp, 800);
 * // state === 'md'
 * ```
 */
function _evaluate<B extends BoundaryDef>(boundary: B, value: number): B['states'][number] {
  return boundary.states[rawIndexF32(boundary.thresholds, value)]!;
}

/**
 * Batch-evaluate many values against ONE boundary into their raw state
 * indices — the `i` such that `boundary.states[i]` is the state for that value.
 *
 * This is the WASM-accelerated face of {@link _evaluate}. It routes through
 * `WASMDispatch.kernels().batchBoundaryEval`: the Rust `liteship-compute` kernel
 * once {@link WASMDispatch.load} has run, the pure-TS `fallbackKernels`
 * otherwise. BOTH select the identical index — the fallback IS the
 * {@link rawIndexF32} loop and the WASM kernel is locked to it by the
 * wasm-parity property suite — so the output is bit-identical to mapping
 * {@link _evaluate} over `values`, loaded or not. The win is throughput on
 * large value sets (offline frame precompute, scrub timelines, per-entity
 * scene signals), never different numbers.
 *
 * Stateless raw selection, like {@link _evaluate} (no hysteresis). Map indices
 * to state names with `boundary.states[i]` when you need them.
 *
 * @example
 * ```ts
 * const bp = Boundary.make({ input: 'scroll', at: [[0, 'top'], [500, 'mid'], [1500, 'deep']] });
 * const idx = Boundary.evaluateBatch(bp, [120, 800, 2000]);
 * // idx → Uint32Array [0, 1, 2]; bp.states[idx[1]] === 'mid'
 * ```
 */
function _evaluateBatch<B extends BoundaryDef>(boundary: B, values: ArrayLike<number>): Uint32Array {
  const thresholds = Float64Array.from(boundary.thresholds as readonly number[]);
  const total = values.length;
  const out = new Uint32Array(total);
  const kernels = WASMDispatch.kernels();
  // The WASM kernel evaluates at most WASM_BATCH_MAX values per call (its static
  // buffer clamps the rest), so chunk to that width. Every value is evaluated and
  // the result stays bit-identical to mapping `evaluate` no matter the batch size
  // — the >4096 entries would otherwise read unwritten kernel memory.
  for (let offset = 0; offset < total; offset += WASM_BATCH_MAX) {
    const end = Math.min(offset + WASM_BATCH_MAX, total);
    const chunk = new Float64Array(end - offset);
    for (let i = offset; i < end; i++) chunk[i - offset] = values[i]!;
    out.set(kernels.batchBoundaryEval(thresholds, chunk), offset);
  }
  return out;
}

/**
 * Evaluate a value against a boundary into the rich {@link EvaluateResult}
 * `{ state, index, value, crossed }`.
 *
 * This is the canonical home of `index` + `crossed` (consumed by the quantizer
 * and, downstream, by Stage pose-lowering). It is also the single hysteresis
 * implementation: `evaluateWithHysteresis` is its string projection.
 *
 * Raw state selection uses the f32-canonical {@link rawIndexF32} kernel; the
 * half-width dead-zone refinement (when a `previousState` and `hysteresis` are
 * supplied) compares in f64 against the un-rounded thresholds, matching the
 * prior `evaluateWithHysteresis` and quantizer semantics exactly.
 */
function _evaluateResult<B extends BoundaryDef>(
  boundary: B,
  value: number,
  previousState?: B['states'][number],
): EvaluateResult<B['states'][number] & string> {
  const { thresholds, states, hysteresis } = boundary;
  const rawIndex = rawIndexF32(thresholds, value);
  const state = states[rawIndex]! as B['states'][number] & string;

  // No hysteresis or no previous state → raw result.
  if (!hysteresis || hysteresis <= 0 || previousState === undefined) {
    const crossed = previousState !== undefined && previousState !== state;
    return { state, index: rawIndex, value, crossed };
  }

  const prevIndex = (states as readonly string[]).indexOf(previousState as string);
  if (prevIndex === -1) {
    // A foreign previousState is almost always a stale or typo'd value from
    // another boundary; warnOnce keeps this hot path cheap after first emit.
    Diagnostics.warnOnce({
      source: 'liteship/core',
      code: 'unknown-previous-state',
      message: `evaluateResult(): previousState "${String(previousState)}" is not a state of boundary "${boundary.input}" (states: ${(states as readonly string[]).join(', ')}); treating as a crossing. Check that the state came from this boundary.`,
    });
    return { state, index: rawIndex, value, crossed: true };
  }

  // No crossing needed.
  if (rawIndex === prevIndex) {
    return { state, index: rawIndex, value, crossed: false };
  }

  // Dead-zone suppression: require the value to clear a threshold by half the
  // hysteresis width before committing. Prevents jitter when a signal
  // oscillates near a boundary.
  const half = hysteresis / 2;
  if (rawIndex > prevIndex) {
    for (let i = prevIndex + 1; i <= rawIndex; i++) {
      const threshold = thresholds[i] as number | undefined;
      if (threshold !== undefined && value < threshold + half) {
        const settleIndex = i - 1;
        return {
          state: states[settleIndex]! as B['states'][number] & string,
          index: settleIndex,
          value,
          crossed: settleIndex !== prevIndex,
        };
      }
    }
  } else {
    for (let i = prevIndex; i > rawIndex; i--) {
      const threshold = thresholds[i] as number | undefined;
      if (threshold !== undefined && value > threshold - half) {
        return {
          state: states[i]! as B['states'][number] & string,
          index: i,
          value,
          crossed: i !== prevIndex,
        };
      }
    }
  }

  // Cleared all dead zones — full transition.
  return { state, index: rawIndex, value, crossed: true };
}

/**
 * Evaluate with hysteresis (requires previous state). Half-width dead zone algorithm.
 *
 * Prevents flickering at boundary edges by requiring the value to cross
 * beyond a dead zone (half the hysteresis width) before transitioning states.
 *
 * @example
 * ```ts
 * const bp = Boundary.make({ input: 'viewport.width', at: [[0, 'sm'], [768, 'md']], hysteresis: 20 });
 * const state1 = Boundary.evaluateWithHysteresis(bp, 770, 'sm');
 * // state1 === 'sm' (within dead zone, stays at previous)
 * const state2 = Boundary.evaluateWithHysteresis(bp, 780, 'sm');
 * // state2 === 'md' (past dead zone, transitions)
 * ```
 */
function _evaluateWithHysteresis<B extends BoundaryDef>(
  boundary: B,
  value: number,
  previousState: B['states'][number],
): B['states'][number] {
  return _evaluateResult(boundary, value, previousState).state;
}

/**
 * Boundary namespace -- the core primitive of constraint-based adaptive rendering.
 *
 * Create boundaries that quantize continuous signal values into discrete named
 * states. Supports hysteresis for flicker-free transitions at threshold edges.
 *
 * @example
 * ```ts
 * import { Boundary } from '@liteship/core';
 *
 * const bp = Boundary.make({
 *   input: 'viewport.width',
 *   at: [[0, 'mobile'], [768, 'tablet'], [1024, 'desktop']],
 *   hysteresis: 20,
 * });
 * const state = Boundary.evaluate(bp, 900);
 * // state === 'tablet'
 * const stableState = Boundary.evaluateWithHysteresis(bp, 770, 'mobile');
 * // stableState === 'mobile' (within dead zone)
 * ```
 */
/**
 * Check whether a boundary is active given its optional spec and current context.
 * Returns true if the boundary has no spec or the spec allows evaluation.
 */
function _isActive<B extends BoundaryDef>(
  boundary: B,
  context?: {
    capabilities?: Record<string, unknown>;
    nowMs?: number;
    activeExperiments?: ReadonlyArray<string>;
  },
): boolean {
  return _isSpecActive(boundary.spec, context);
}

/**
 * Boundary — core primitive of constraint-based adaptive rendering.
 *
 * A boundary quantizes a continuous signal (viewport, scroll, audio, …) into
 * a discrete set of named states. Every boundary is content-addressed via
 * FNV-1a, supports optional hysteresis to prevent flicker at thresholds, and
 * can be gated by a {@link BoundarySpec} for A/B or device-conditional activation.
 *
 * @example
 * ```ts
 * import { Boundary } from '@liteship/core';
 *
 * const viewport = Boundary.make({
 *   input: 'viewport.width',
 *   at: [[0, 'mobile'], [640, 'tablet'], [1024, 'desktop']],
 *   hysteresis: 16,
 * });
 * Boundary.evaluate(viewport, 800); // 'tablet'
 * ```
 */
export const Boundary: BoundaryFactory & {
  evaluate: typeof _evaluate;
  evaluateResult: typeof _evaluateResult;
  evaluateBatch: typeof _evaluateBatch;
  evaluateWithHysteresis: typeof _evaluateWithHysteresis;
  isActive: typeof _isActive;
} = {
  /**
   * Create a new `BoundaryDef` from a configuration object.
   *
   * Thresholds must be strictly ascending. The boundary is content-addressed
   * via FNV-1a hash of its definition.
   *
   * @example
   * ```ts
   * const bp = Boundary.make({
   *   input: 'viewport.width',
   *   at: [[0, 'sm'], [768, 'md'], [1024, 'lg']],
   *   hysteresis: 10,
   * });
   * // bp._tag === 'BoundaryDef'
   * // bp.id === 'fnv1a:...' (content address)
   * // bp.states === ['sm', 'md', 'lg']
   * ```
   */
  make<I extends string, const S extends readonly [string, ...string[]]>(config: {
    readonly input: I;
    readonly at: { readonly [K in keyof S]: readonly [number, S[K]] };
    readonly hysteresis?: number;
    readonly spec?: BoundarySpec;
  }): BoundaryDef<I, S> {
    const pairs = config.at;
    for (let i = 1; i < pairs.length; i++) {
      if (pairs[i]![0] <= pairs[i - 1]![0]) {
        // Build the copy-pasteable fix from the user's own pairs, sorted.
        const sorted = [...(pairs as readonly (readonly [number, string])[])].sort((a, b) => a[0] - b[0]);
        const suggestion = sorted.map(([t, s]) => `[${t}, '${s}']`).join(', ');
        throw ValidationError(
          'Boundary.make',
          `thresholds must be strictly ascending. Got ${pairs[i - 1]![0]} before ${pairs[i]![0]} at index ${i}. Reorder your \`at:\` pairs so thresholds increase: at: [${suggestion}].`,
        );
      }
    }
    const stateNames = pairs.map(([, s]) => s);
    const seen = new Set<string>();
    for (const name of stateNames) {
      if (seen.has(name)) {
        throw ValidationError(
          'Boundary.make',
          `duplicate state name "${name}" (used by two thresholds). Each threshold needs its own state — rename one, e.g. at: [[0, 'small'], [768, 'medium']]. If this throws mid-render, the boundary was constructed inside a render function; hoist it to module scope.`,
        );
      }
      seen.add(name);
    }
    const thresholds = pairs.map(([t]) => mkThresholdValue(t));
    // tupleMap preserves arity but fn returns `string`, not per-element S[K]; one narrow cast is unavoidable.
    const states = pairs.map(([, s]) => s) as unknown as S;
    const id = deterministicId(config.input, thresholds, states, config.hysteresis, config.spec);

    const source = inputToSource(config.input);
    if (source?.type === 'scroll' && source.axis === 'progress') {
      const maxThreshold = Math.max(...pairs.map(([t]) => t));
      if (maxThreshold > 1) {
        Diagnostics.warnOnce({
          source: 'liteship/core.boundary',
          code: 'scroll-progress-threshold-scale',
          message:
            `Boundary "${config.input}" uses thresholds with max ${maxThreshold}, but scroll.progress is canonical 0..1 — ` +
            'thresholds above 1 pin the boundary at the lowest state on every built-in consumer path. ' +
            'Author thresholds as fractions (e.g. [0, "arrival"], [0.2, "showroom"]) not percentages.',
        });
      }
    } else if (source?.type === 'audio') {
      const maxThreshold = Math.max(...pairs.map(([t]) => t));
      if (maxThreshold > 1) {
        Diagnostics.warnOnce({
          source: 'liteship/core.boundary',
          code: 'audio-threshold-scale',
          message:
            `Boundary "${config.input}" uses thresholds with max ${maxThreshold}, but audio.* signals normalize to 0..1 — ` +
            'thresholds above 1 will never cross on the built-in runtime path.',
        });
      }
    }

    return {
      _tag: 'BoundaryDef',
      _version: 1,
      id,
      input: mkSignalInput(config.input),
      thresholds,
      states,
      ...(config.hysteresis !== undefined ? { hysteresis: config.hysteresis } : {}),
      ...(config.spec !== undefined ? { spec: config.spec } : {}),
    };
  },
  evaluate: _evaluate,
  evaluateResult: _evaluateResult,
  evaluateBatch: _evaluateBatch,
  evaluateWithHysteresis: _evaluateWithHysteresis,
  isActive: _isActive,
};

/**
 * BoundarySpec: optional filter that gates whether a boundary is active.
 * Enables A/B testing, time-bounded experiments, and device targeting
 * without external wrapping logic.
 *
 * Wired into the Astro runtime `evaluateBoundary` path (host-side gating before
 * state transitions). JSON-serializable fields
 * (`timeRange`, `experimentId`) round-trip through `data-liteship-boundary`;
 * `deviceFilter` is host-only (functions cannot cross the wire).
 */
export interface BoundarySpec {
  /** Only evaluate this boundary when the device filter returns true. */
  readonly deviceFilter?: (capabilities: Record<string, unknown>) => boolean;
  /** Only evaluate this boundary within this time range (epoch ms). */
  readonly timeRange?: { readonly from?: number; readonly until?: number };
  /** Only evaluate this boundary for participants in this experiment. */
  readonly experimentId?: string;
}

/** Check if a BoundarySpec allows evaluation given current context. */
function _isSpecActive(
  spec: BoundarySpec | undefined,
  context?: {
    capabilities?: Record<string, unknown>;
    nowMs?: number;
    activeExperiments?: ReadonlyArray<string>;
  },
): boolean {
  if (!spec) return true;
  if (spec.deviceFilter && context?.capabilities) {
    if (!spec.deviceFilter(context.capabilities)) return false;
  }
  if (spec.timeRange) {
    const now = context?.nowMs ?? wallClock.now();
    if (spec.timeRange.from !== undefined && now < spec.timeRange.from) return false;
    if (spec.timeRange.until !== undefined && now > spec.timeRange.until) return false;
  }
  if (spec.experimentId && context?.activeExperiments) {
    if (!context.activeExperiments.includes(spec.experimentId)) return false;
  }
  return true;
}

/** BoundarySpec namespace — helpers for working with the optional activation filter on a boundary. */
export const BoundarySpec = {
  /** Check whether a {@link BoundarySpec} allows evaluation in the given context. */
  isActive: _isSpecActive,
};

export declare namespace Boundary {
  /** Structural shape of a boundary definition parameterized by input name `I` and state tuple `S`. */
  export type Shape<
    I extends string = string,
    S extends readonly [string, ...string[]] = readonly [string, ...string[]],
  > = BoundaryDef<I, S>;
  /** Alias for {@link BoundarySpec}. */
  export type Spec = BoundarySpec;
}

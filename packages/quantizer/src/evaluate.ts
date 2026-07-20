/**
 * Boundary value → state evaluation for `@liteship/quantizer`.
 *
 * As of the Phase-0 evaluator consolidation, the canonical implementation lives
 * in `@liteship/core` (`Boundary.evaluateResult`, backed by the single f32-canonical
 * `rawIndexF32` kernel). This module is a thin re-export so existing
 * `@liteship/quantizer` consumers (`evaluate`, `Evaluate`, `EvaluateResult`) keep
 * their import paths while there is exactly ONE numeric semantics across the
 * repo — no second binary-search / raw-f64 path.
 *
 * @example
 * ```ts
 * import { defineBoundary } from '@liteship/core';
 * import { evaluate } from '@liteship/quantizer';
 *
 * const boundary = defineBoundary({
 *   input: 'width',
 *   at: [[0, 'sm'], [640, 'md'], [1024, 'lg']],
 *   hysteresis: 20,
 * });
 * const result = evaluate(boundary, 800);
 * // result => { state: 'md', index: 1, value: 800, crossed: false }
 * ```
 *
 * @module
 */

import { Boundary } from '@liteship/core';
import type { EvaluateResult, StateUnion } from '@liteship/core';

export type { EvaluateResult } from '@liteship/core';

/**
 * Find which state a value maps to via the canonical f32-canonical kernel, with
 * optional hysteresis and crossing detection. Delegates to
 * {@link Boundary.evaluateResult} in `@liteship/core`.
 *
 * The explicit signature (over the public `Boundary`/`StateUnion` types,
 * not core's internal `BoundaryDef`) keeps the emitted `.d.ts` nameable across
 * the package boundary while the implementation is a thin delegate.
 */
export function evaluate<B extends Boundary>(
  boundary: B,
  value: number,
  previousState?: StateUnion<B>,
): EvaluateResult<StateUnion<B> & string> {
  return Boundary.evaluateResult(boundary, value, previousState);
}

/**
 * Boundary evaluation namespace. `Evaluate.evaluate` is the {@link evaluate} delegate.
 */
export const Evaluate = { evaluate } as const;

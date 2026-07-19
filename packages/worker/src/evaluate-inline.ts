/**
 * Shared inline source for `evaluateThresholds` injected into worker blob scripts.
 *
 * Worker blob scripts cannot use ES module imports at runtime, so the
 * threshold-evaluation logic must be inlined as a string. As of the Phase-0
 * evaluator consolidation the single source of truth is `@liteship/core`
 * (`EVALUATE_THRESHOLDS_SOURCE`, the f32-canonical worker-blob twin of the
 * `rawIndexF32` kernel). This module re-exports it so both `compositor-script.ts`
 * and `render-worker.ts` stay in sync with core automatically — and so the
 * existing import site `render-worker.ts` is untouched.
 *
 * @module
 */

export { EVALUATE_THRESHOLDS_SOURCE } from '@liteship/core';

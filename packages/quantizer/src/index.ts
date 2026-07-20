/**
 * `@liteship/quantizer` — **LiteShip** quantizer: **rigged** boundary evaluation,
 * live state, animated transitions between bearings, and motion-tier gating on
 * the working line.
 *
 * @module
 */

export { evaluate, Evaluate } from './evaluate.js';
export type { EvaluateResult } from './evaluate.js';

export { defineQuantizer, createQuantizer } from './quantizer.js';
export type { OutputTarget, QuantizerOutputs, QuantizerConfig, LiveQuantizer } from './quantizer.js';

export { Transition } from './transition.js';
export type { TransitionConfig, TransitionMap, Transition as TransitionType } from './transition.js';

export { AnimatedQuantizer } from './animated-quantizer.js';
export type { AnimatedQuantizerShape, OwnedAnimatedQuantizer, InterpolatedFrame } from './animated-quantizer.js';

export type {
  MotionTier,
  SpringConfig,
  DefineQuantizerOptions,
  QuantizerRuntime,
  OwnedQuantizer,
} from './quantizer.js';
// `MemoCache` and `TIER_TARGETS` ship via `@liteship/quantizer/testing` —
// implementation primitives that power the public `defineQuantizer` / `createQuantizer`
// path internally but are not consumer-facing API.

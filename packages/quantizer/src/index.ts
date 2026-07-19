/**
 * `@liteship/quantizer` — **LiteShip** quantizer: **rigged** boundary evaluation,
 * live state, animated transitions between bearings, and motion-tier gating on
 * the working line.
 *
 * @module
 */

export { evaluate, Evaluate } from './evaluate.js';
export type { EvaluateResult } from './evaluate.js';

export { Q } from './quantizer.js';
export type { OutputTarget, QuantizerOutputs, QuantizerConfig, LiveQuantizer, QuantizerBuilder } from './quantizer.js';

export { Transition } from './transition.js';
export type { TransitionConfig, TransitionMap, Transition as TransitionType } from './transition.js';

export { AnimatedQuantizer } from './animated-quantizer.js';
export type { AnimatedQuantizerShape, AnimatedQuantizerHandle, InterpolatedFrame } from './animated-quantizer.js';

export type {
  MotionTier,
  SpringConfig,
  QuantizerFromOptions,
  QuantizerRuntime,
  LiveQuantizerHandle,
} from './quantizer.js';
// `MemoCache` and `TIER_TARGETS` ship via `@liteship/quantizer/testing` —
// implementation primitives that power the public `Q.from()` builder
// internally but are not consumer-facing API.
